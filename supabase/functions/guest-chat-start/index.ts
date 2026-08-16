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

    const body = await req.json().catch(() => ({}));
    const trimmed = String(body?.guestName ?? "").trim();
    if (trimmed.length < 2) return json({ error: "short_name" }, 400);

    const email = `guest.${crypto.randomUUID()}@guest.mandalario.app`;
    const password = `${crypto.randomUUID()}${crypto.randomUUID()}`;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: trimmed, guest: true },
    });

    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "create_failed" }, 400);
    }

    const userId = created.user.id;

    const { error: sessionErr } = await admin.from("guest_chat_sessions").upsert({
      id: userId,
      guest_name: trimmed,
    });

    if (sessionErr) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: sessionErr.message }, 400);
    }

    const anonClient = createClient(SUPABASE_URL, ANON);
    const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr || !signInData.session) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: signInErr?.message ?? "signin_failed" }, 400);
    }

    return json({ session: signInData.session });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
