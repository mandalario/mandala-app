import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const authUserId = user.id;

    const { userId, tenantId, pushToken } = await req.json();
    if (!pushToken) return json({ error: "pushToken é obrigatório" }, 400);

    // Force user_id to be the authenticated user (ignore client-provided userId mismatches)
    const targetUserId = userId ?? authUserId;
    if (targetUserId !== authUserId) {
      return json({ error: "Não é permitido registrar token para outro usuário" }, 403);
    }

    const { error } = await supabase
      .from("user_push_tokens")
      .upsert(
        {
          user_id: authUserId,
          push_token: pushToken,
          tenant_id: tenantId ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,push_token" },
      );

    if (error) return json({ error: error.message }, 400);

    // Mantém também o legado em profiles.push_token
    await supabase.from("profiles").update({ push_token: pushToken }).eq("id", authUserId);

    return json({ ok: true });
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
