import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

/**
 * Recebe um token de Apple Pay (gerado no app Expo nativo via bridge)
 * e cria uma cobrança no Mercado Pago. Retorna o payment_id da nossa DB
 * para que o front continue fazendo o polling de status.
 *
 * Body esperado:
 *   { package_id: string, mp_token: string, installments?: number, payment_method_id?: string, issuer_id?: string }
 *
 * - mp_token: token gerado pelo SDK do Mercado Pago no app nativo
 *   a partir do PKPaymentToken do Apple Pay (cardToken).
 */
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
    const mpToken = String(body?.mp_token ?? "");
    const installments = Number(body?.installments ?? 1);
    const paymentMethodId = String(body?.payment_method_id ?? "apple_pay");
    const issuerId = body?.issuer_id ? String(body.issuer_id) : undefined;

    if (!packageId || !mpToken) {
      return new Response(JSON.stringify({ error: "package_id e mp_token são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: pkg } = await admin
      .from("credit_packages")
      .select("id, name, credits, price_cents, is_active")
      .eq("id", packageId).maybeSingle();
    if (!pkg || !pkg.is_active) {
      return new Response(JSON.stringify({ error: "Package not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: billingRow } = await admin
      .from("app_settings").select("value").eq("key", "billing_enabled").maybeSingle();
    if ((billingRow?.value ?? "false") !== "true") {
      return new Response(JSON.stringify({ error: "Billing disabled" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: secrets } = await admin
      .from("admin_secrets").select("key, value").in("key", ["mp_access_token"]);
    const accessToken = (secrets ?? []).find((s: any) => s.key === "mp_access_token")?.value;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Mercado Pago não configurado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        token: mpToken,
        description: `${pkg.credits} crédito(s) - ${pkg.name}`,
        installments,
        payment_method_id: paymentMethodId,
        ...(issuerId ? { issuer_id: issuerId } : {}),
        payer: {
          email: profile?.email ?? user.email,
          first_name: profile?.full_name ?? "Aluno",
        },
        metadata: { user_id: user.id, package_id: pkg.id, channel: "apple_pay" },
      }),
    });

    const mpData = await mpResp.json();
    if (!mpResp.ok) {
      console.error("MP applepay error:", mpData);
      return new Response(JSON.stringify({ error: mpData?.message ?? "Erro Mercado Pago", details: mpData }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const status = mpData.status === "approved" ? "approved"
      : mpData.status === "rejected" || mpData.status === "cancelled" ? "rejected"
      : "pending";

    const { data: payment, error: insErr } = await admin
      .from("payments").insert({
        user_id: user.id,
        package_id: pkg.id,
        credits: pkg.credits,
        amount_cents: pkg.price_cents,
        status,
        provider: "mercado_pago",
        mp_payment_id: String(mpData.id),
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
      status,
      status_detail: mpData.status_detail ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
