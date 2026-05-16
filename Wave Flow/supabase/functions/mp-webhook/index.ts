import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// Mercado Pago webhook (notification URL). Public endpoint (verify_jwt = false).
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const log = async (entry: {
    mp_payment_id?: string | null;
    event_type?: string | null;
    http_status: number;
    result_status?: string | null;
    message?: string | null;
    details?: Record<string, unknown> | null;
  }) => {
    try {
      await admin.from("webhook_logs").insert({ source: "mp-webhook", ...entry });
    } catch (e) {
      console.error("log insert failed", e);
    }
  };

  const respond = (body: Record<string, unknown>, status: number) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const url = new URL(req.url);
    const topic = url.searchParams.get("topic") ?? url.searchParams.get("type");
    const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

    let body: any = null;
    try { body = await req.json(); } catch { /* may be empty */ }

    const eventType = body?.type ?? topic ?? null;
    const paymentId = String(body?.data?.id ?? dataId ?? "");

    if (eventType !== "payment" || !paymentId) {
      await log({
        mp_payment_id: paymentId || null,
        event_type: eventType,
        http_status: 200,
        result_status: "ignored",
        message: "Evento ignorado (não é payment ou sem id)",
        details: { topic, dataId, body },
      });
      return respond({ ok: true, ignored: true }, 200);
    }

    const { data: secrets } = await admin
      .from("admin_secrets").select("key, value")
      .in("key", ["mp_access_token", "mp_webhook_secret"]);
    const sm: Record<string, string | null> = {};
    (secrets ?? []).forEach((r: any) => { sm[r.key] = r.value; });
    const accessToken = sm.mp_access_token;
    if (!accessToken) {
      await log({
        mp_payment_id: paymentId,
        event_type: eventType,
        http_status: 500,
        result_status: "error",
        message: "Mercado Pago não configurado",
      });
      return respond({ error: "MP not configured" }, 500);
    }

    // Optional signature validation
    if (sm.mp_webhook_secret) {
      const sig = req.headers.get("x-signature");
      const reqId = req.headers.get("x-request-id");
      if (sig && reqId) {
        const parts = Object.fromEntries(sig.split(",").map(p => p.trim().split("=")));
        const ts = parts.ts; const v1 = parts.v1;
        if (ts && v1) {
          const manifest = `id:${paymentId};request-id:${reqId};ts:${ts};`;
          const enc = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw", enc.encode(sm.mp_webhook_secret),
            { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
          );
          const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(manifest));
          const hex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
          if (hex !== v1) {
            await log({
              mp_payment_id: paymentId,
              event_type: eventType,
              http_status: 401,
              result_status: "error",
              message: "Assinatura inválida",
            });
            return respond({ error: "Invalid signature" }, 401);
          }
        }
      }
    }

    // Fetch payment from MP
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    const mpData = await mpResp.json();
    if (!mpResp.ok) {
      await log({
        mp_payment_id: paymentId,
        event_type: eventType,
        http_status: 502,
        result_status: "error",
        message: "Falha ao consultar Mercado Pago",
        details: mpData,
      });
      return respond({ error: "MP fetch failed" }, 502);
    }

    const status = mpData.status as string;
    let newStatus: "approved" | "rejected" | "pending" = "pending";
    if (status === "approved") newStatus = "approved";
    else if (["rejected", "cancelled", "refunded", "charged_back"].includes(status)) newStatus = "rejected";

    const updates: any = { mp_status_detail: mpData.status_detail ?? null };
    if (newStatus !== "pending") {
      updates.status = newStatus;
      updates.reviewed_at = new Date().toISOString();
    }

    const { error: updErr } = await admin
      .from("payments").update(updates).eq("mp_payment_id", String(paymentId));
    if (updErr) {
      await log({
        mp_payment_id: paymentId,
        event_type: eventType,
        http_status: 500,
        result_status: "error",
        message: updErr.message,
      });
      return respond({ error: updErr.message }, 500);
    }

    await log({
      mp_payment_id: paymentId,
      event_type: eventType,
      http_status: 200,
      result_status: newStatus,
      message: `MP status: ${status} (${mpData.status_detail ?? "—"})`,
    });
    return respond({ ok: true, status: newStatus }, 200);
  } catch (e) {
    const msg = String((e as any)?.message ?? e);
    await log({ http_status: 500, result_status: "error", message: msg });
    return respond({ error: msg }, 500);
  }
});
