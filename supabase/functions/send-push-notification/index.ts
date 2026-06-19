import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PUSH_CHANNEL_ID = "mandalario-alerts";

type Payload = {
  userId?: string | null;
  userIds?: unknown;
  title: string;
  body?: string;
  url?: string;
  pushToken?: string;
  redirectUrl?: string;
};

function normalizeUserIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return Array.from(new Set(raw.filter((id): id is string => typeof id === "string" && id.length > 0)));
  }
  if (typeof raw === "string" && raw) return [raw];
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes.user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Apenas admins podem enviar push" }, 403);

    const payload = (await req.json()) as Payload;
    const { userId, title } = payload;
    const body = payload.body ?? "";
    const url = payload.url ?? payload.redirectUrl;

    if (!title) return json({ error: "title é obrigatório" }, 400);

    let targetUserIds = normalizeUserIds(payload.userIds);
    if (targetUserIds.length === 0 && userId) targetUserIds = [userId];

    if (payload.pushToken) {
      // direct token (tests / internal)
    } else if (targetUserIds.length === 0) {
      return json({
        error: "Informe userIds com ao menos um destinatário. Envio em massa sem lista explícita não é permitido.",
      }, 400);
    }

    let tokens: string[] = [];

    const tokensForUsers = async (ids: string[]) => {
      const { data, error } = await admin
        .from("user_push_tokens")
        .select("push_token")
        .in("user_id", ids);
      if (error) throw new Error(error.message);

      const fromTable = (data ?? []).map((r: { push_token: string }) => r.push_token).filter(Boolean);

      const { data: profs, error: profError } = await admin
        .from("profiles")
        .select("push_token")
        .in("id", ids)
        .not("push_token", "is", null);
      if (profError) throw new Error(profError.message);

      const fromProfiles = (profs ?? []).map((r: { push_token: string }) => r.push_token).filter(Boolean);

      return Array.from(new Set([...fromTable, ...fromProfiles]));
    };

    if (payload.pushToken) {
      tokens = [payload.pushToken];
    } else {
      tokens = await tokensForUsers(targetUserIds);
    }

    tokens = Array.from(new Set(tokens));

    if (tokens.length === 0) {
      return json({
        ok: false,
        code: "NO_PUSH_TOKENS",
        sent: 0,
        recipientCount: targetUserIds.length,
        error:
          "Nenhum push token registrado para os destinatários selecionados. Peça para abrirem o app e aceitarem notificações.",
      }, 200);
    }

    const messages = tokens.map((to) => ({
      to,
      sound: "default",
      channelId: PUSH_CHANNEL_ID,
      priority: "high",
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
    const tickets = Array.isArray(result?.data) ? result.data : [];
    const delivered = tickets.filter((t: { status?: string }) => t.status === "ok").length;
    const ticketErrors = tickets
      .filter((t: { status?: string }) => t.status === "error")
      .map((t: { message?: string; details?: { error?: string } }) => ({
        message: t.message ?? "Erro desconhecido",
        code: t.details?.error ?? null,
      }));

    if (delivered === 0 && ticketErrors.length > 0) {
      const fcmHint =
        ticketErrors.some((e) =>
          e.code === "InvalidCredentials" ||
          e.code === "MismatchSenderId" ||
          /FCM|credentials/i.test(e.message)
        )
          ? " Configure FCM V1 em expo.dev → Credentials → Android e gere um novo build."
          : "";
      return json({
        ok: false,
        sent: 0,
        attempted: tokens.length,
        delivered: 0,
        recipientCount: targetUserIds.length,
        errors: ticketErrors,
        error: `${ticketErrors[0].message}${fcmHint}`,
        result,
      }, 200);
    }

    return json({
      ok: delivered > 0,
      sent: delivered,
      attempted: tokens.length,
      delivered,
      recipientCount: targetUserIds.length,
      errors: ticketErrors,
      result,
    }, 200);
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
