import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const packageId = String(body?.package_id ?? "");
    if (!packageId) {
      return new Response(JSON.stringify({ error: "package_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Load package
    const { data: pkg, error: pkgErr } = await admin
      .from("credit_packages")
      .select("id, name, credits, price_cents, is_active")
      .eq("id", packageId).maybeSingle();
    if (pkgErr || !pkg || !pkg.is_active) {
      return new Response(JSON.stringify({ error: "Package not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check billing enabled
    const { data: billingRow } = await admin
      .from("app_settings").select("value").eq("key", "billing_enabled").maybeSingle();
    if ((billingRow?.value ?? "false") !== "true") {
      return new Response(JSON.stringify({ error: "Billing disabled" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load MP credentials
    const { data: secrets } = await admin
      .from("admin_secrets").select("key, value")
      .in("key", ["mp_access_token", "mp_environment"]);
    const sm: Record<string, string | null> = {};
    (secrets ?? []).forEach((r: any) => { sm[r.key] = r.value; });
    const accessToken = sm.mp_access_token;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Mercado Pago não configurado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User email
    const { data: profile } = await admin
      .from("profiles").select("email, full_name").eq("id", user.id).maybeSingle();

    const idempotencyKey = crypto.randomUUID();
    const mpResp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: pkg.price_cents / 100,
        description: `${pkg.credits} crédito(s) - ${pkg.name}`,
        payment_method_id: "pix",
        payer: {
          email: profile?.email ?? user.email,
          first_name: profile?.full_name ?? "Aluno",
        },
        metadata: { user_id: user.id, package_id: pkg.id },
      }),
    });

    const mpData = await mpResp.json();
    if (!mpResp.ok) {
      console.error("MP error:", mpData);
      return new Response(JSON.stringify({ error: `[Mercado Pago] ${mpData?.message ?? "Erro Desconhecido"}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tx = mpData?.point_of_interaction?.transaction_data;
    const qrCode = tx?.qr_code ?? null;
    const qrCodeBase64 = tx?.qr_code_base64 ?? null;

    const { data: payment, error: insErr } = await admin
      .from("payments").insert({
        user_id: user.id,
        package_id: pkg.id,
        credits: pkg.credits,
        amount_cents: pkg.price_cents,
        status: "pending",
        provider: "mercado_pago",
        mp_payment_id: String(mpData.id),
        mp_qr_code: qrCode,
        mp_qr_code_base64: qrCodeBase64,
        mp_status_detail: mpData.status_detail ?? null,
      }).select().single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      payment_id: payment.id,
      mp_payment_id: mpData.id,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      status: mpData.status,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
