import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function isGuestUser(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.is_anonymous) return true;
  return user.user_metadata?.guest === true;
}

export async function startGuestChat(guestName: string): Promise<{ error: string | null }> {
  const trimmed = guestName.trim();
  if (trimmed.length < 2) {
    return { error: "short_name" };
  }

  const edgeError = await startGuestViaEdgeFunction(trimmed);
  if (!edgeError) return { error: null };

  const anonError = await startGuestViaAnonymous(trimmed);
  if (!anonError) return { error: null };

  return { error: edgeError ?? anonError ?? "unknown" };
}

async function startGuestViaEdgeFunction(trimmed: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("guest-chat-start", {
    body: { guestName: trimmed },
  });

  if (error) {
    let message = error.message;
    try {
      if (error.context) {
        const body = await error.context.json();
        message = body?.error || message;
      }
    } catch {
      /* use default */
    }
    return message;
  }

  if (data?.error === "short_name") return "short_name";
  if (data?.error || !data?.session) return data?.error ?? "unknown";

  const { error: sessionError } = await supabase.auth.setSession(data.session);
  return sessionError?.message ?? null;
}

async function startGuestViaAnonymous(trimmed: string): Promise<string | null> {
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: { full_name: trimmed, guest: true },
    },
  });

  if (error || !data.user) {
    return error?.message ?? "unknown";
  }

  const { error: sessionErr } = await supabase.from("guest_chat_sessions").upsert(
    { id: data.user.id, guest_name: trimmed },
    { onConflict: "id" },
  );

  return sessionErr?.message ?? null;
}

export async function guestHasSession(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("guest_chat_sessions")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  return !!data;
}

export async function fetchGuestName(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("guest_chat_sessions")
    .select("guest_name")
    .eq("id", userId)
    .maybeSingle();
  return data?.guest_name ?? null;
}
