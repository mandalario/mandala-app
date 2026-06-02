// Admin-only: delete student auth account and all related data
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { deleteAuthUserAndProfile, deleteUserData } from "../_shared/deleteUserData.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const dataResult = await deleteUserData(admin, userId);
    if (!dataResult.ok) return json({ error: dataResult.error }, dataResult.status);

    const authResult = await deleteAuthUserAndProfile(admin, userId);
    if (!authResult.ok) return json({ error: authResult.error }, authResult.status);

    return json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro";
    return json({ error: msg }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
