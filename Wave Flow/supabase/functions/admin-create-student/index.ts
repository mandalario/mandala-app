// Admin-only: create a new student account with profile pre-filled
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
      .from("user_roles").select("role").eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Apenas admins" }, 403);

    const body = await req.json();
    const { email, password, full_name, phone, profile = {} } = body ?? {};
    if (!email || !password || !full_name) return json({ error: "Dados obrigatórios faltando" }, 400);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr || !created.user) return json({ error: createErr?.message ?? "Falha ao criar" }, 400);

    // handle_new_user trigger creates the profile row; update with extra data
    const updates: Record<string, any> = {
      full_name,
      phone: phone ?? null,
      profile_completed: true,
      approval_status: "approved",
      ...profile,
    };
    await admin.from("profiles").update(updates).eq("id", created.user.id);

    return json({ ok: true, user_id: created.user.id });
  } catch (e: any) {
    return json({ error: e?.message ?? "Erro" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
