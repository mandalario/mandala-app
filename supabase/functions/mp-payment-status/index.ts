import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// Polled by frontend to refresh payment status (in case webhook hasn't arrived).
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
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { payment_id } = await req.json();
    if (!payment_id) {
      return new Response(JSON.stringify({ error: "payment_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: pay } = await admin
      .from("payments").select("id, user_id, mp_payment_id, status")
      .eq("id", payment_id).maybeSingle();
    if (!pay || pay.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (pay.status !== "pending" || !pay.mp_payment_id) {
      return new Response(JSON.stringify({ status: pay.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const { data: secrets } = await admin
      .from("admin_secrets").select("value").eq("key", "mp_access_token").maybeSingle();
    const accessToken = secrets?.value;
    if (!accessToken) {
      return new Response(JSON.stringify({ status: pay.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${pay.mp_payment_id}`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    const mpData = await mpResp.json();
    if (!mpResp.ok) {
      return new Response(JSON.stringify({ status: pay.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    const status = mpData.status as string;
    let newStatus: "approved" | "rejected" | "pending" = "pending";
    if (status === "approved") newStatus = "approved";
    else if (["rejected", "cancelled", "refunded", "charged_back"].includes(status)) newStatus = "rejected";

    if (newStatus !== "pending") {
      await admin.from("payments").update({
        status: newStatus,
        mp_status_detail: mpData.status_detail ?? null,
        reviewed_at: new Date().toISOString(),
      }).eq("id", pay.id);
    }

    return new Response(JSON.stringify({ status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
