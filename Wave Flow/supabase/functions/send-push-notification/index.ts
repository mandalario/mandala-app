import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  userId?: string | null; // null/undefined = broadcast all
  title: string;
  body?: string;
  url?: string;
  // legado
  pushToken?: string;
  redirectUrl?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload;
    const { userId, title } = payload;
    const body = payload.body ?? "";
    const url = payload.url ?? payload.redirectUrl;

    if (!title) return json({ error: "title é obrigatório" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let tokens: string[] = [];

    // Caminho legado: token direto
    if (payload.pushToken) {
      tokens = [payload.pushToken];
    } else if (userId) {
      const { data, error } = await admin
        .from("user_push_tokens")
        .select("push_token")
        .eq("user_id", userId);
      if (error) return json({ error: error.message }, 400);
      tokens = (data ?? []).map((r: any) => r.push_token).filter(Boolean);

      // Fallback: coluna legada em profiles
      if (tokens.length === 0) {
        const { data: prof } = await admin
          .from("profiles").select("push_token").eq("id", userId).maybeSingle();
        if (prof?.push_token) tokens = [prof.push_token];
      }
    } else {
      // broadcast a todos
      const { data, error } = await admin
        .from("user_push_tokens")
        .select("push_token");
      if (error) return json({ error: error.message }, 400);
      tokens = (data ?? []).map((r: any) => r.push_token).filter(Boolean);

      if (tokens.length === 0) {
        const { data: profs } = await admin
          .from("profiles").select("push_token").not("push_token", "is", null);
        tokens = (profs ?? []).map((r: any) => r.push_token).filter(Boolean);
      }
    }

    // dedup
    tokens = Array.from(new Set(tokens));

    if (tokens.length === 0) {
      return json({
        ok: false,
        code: "NO_PUSH_TOKENS",
        sent: 0,
        error: "Nenhum push token registrado. O app mobile precisa chamar register-push-token (após pedir permissão de notificação) para salvar o token Expo deste usuário antes de enviar push.",
      }, 200);
    }

    const messages = tokens.map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data: url ? { url } : {},
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    return json({ ok: res.ok, sent: tokens.length, result }, res.ok ? 200 : 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
