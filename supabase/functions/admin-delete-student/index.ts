// Admin-only: delete student auth account and all related data
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const USER_DATA_TABLES = [
  "bookings",
  "notifications",
  "payments",
  "terms_acceptances",
  "privacy_acceptances",
  "user_push_tokens",
  "user_roles",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    if (!roleRow) return json({ error: "Apenas admins" }, 403);

    const body = await req.json();
    const userId = body?.user_id as string | undefined;
    if (!userId) return json({ error: "user_id obrigatório" }, 400);
    if (userId === userRes.user.id) return json({ error: "Não é possível excluir a si mesmo" }, 400);

    const { data: targetRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (targetRole) return json({ error: "Não é possível excluir um administrador" }, 400);

    for (const table of USER_DATA_TABLES) {
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error) return json({ error: `Falha ao limpar ${table}: ${error.message}` }, 400);
    }

    const { error: chatConvErr } = await admin.from("chat_messages").delete().eq("conversation_user", userId);
    if (chatConvErr) return json({ error: `Falha ao limpar chat: ${chatConvErr.message}` }, 400);
    const { error: chatSendErr } = await admin.from("chat_messages").delete().eq("sender_id", userId);
    if (chatSendErr) return json({ error: `Falha ao limpar chat: ${chatSendErr.message}` }, 400);

    await removeStorageFolder(admin, "avatars", userId);
    await removeStorageFolder(admin, "payment-proofs", userId);

    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteErr) return json({ error: deleteErr.message }, 400);

    const { data: leftover } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (leftover) {
      const { error: profileErr } = await admin.from("profiles").delete().eq("id", userId);
      if (profileErr) return json({ error: `Perfil não removido: ${profileErr.message}` }, 400);
    }

    return json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro";
    return json({ error: msg }, 500);
  }
});

async function removeStorageFolder(admin: SupabaseClient, bucket: string, userId: string) {
  const { data: files, error: listErr } = await admin.storage.from(bucket).list(userId);
  if (listErr || !files?.length) return;
  const paths = files.map((f) => `${userId}/${f.name}`);
  await admin.storage.from(bucket).remove(paths);
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
