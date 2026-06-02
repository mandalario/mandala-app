import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const USER_DATA_TABLES = [
  "bookings",
  "notifications",
  "payments",
  "terms_acceptances",
  "privacy_acceptances",
  "user_push_tokens",
  "teacher_reviews",
  "user_roles",
] as const;

export function isMissingTableError(message: string) {
  return /Could not find the table|schema cache/i.test(message);
}

export async function removeStorageFolder(admin: SupabaseClient, bucket: string, userId: string) {
  const { data: files, error: listErr } = await admin.storage.from(bucket).list(userId);
  if (listErr || !files?.length) return;
  const paths = files.map((f) => `${userId}/${f.name}`);
  await admin.storage.from(bucket).remove(paths);
}

/** Deletes app data for a user (not auth user / profile row — caller handles those). */
export async function deleteUserData(
  admin: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { error: clearPhoneErr } = await admin
    .from("profiles")
    .update({ phone: null, phone_digits: null })
    .eq("id", userId);
  if (clearPhoneErr) {
    return { ok: false, error: `Falha ao liberar telefone: ${clearPhoneErr.message}`, status: 400 };
  }

  for (const table of USER_DATA_TABLES) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error && !isMissingTableError(error.message)) {
      return { ok: false, error: `Falha ao limpar ${table}: ${error.message}`, status: 400 };
    }
  }

  const { error: chatConvErr } = await admin.from("chat_messages").delete().eq("conversation_user", userId);
  if (chatConvErr) return { ok: false, error: `Falha ao limpar chat: ${chatConvErr.message}`, status: 400 };

  const { error: chatSendErr } = await admin.from("chat_messages").delete().eq("sender_id", userId);
  if (chatSendErr) return { ok: false, error: `Falha ao limpar chat: ${chatSendErr.message}`, status: 400 };

  await removeStorageFolder(admin, "avatars", userId);
  await removeStorageFolder(admin, "payment-proofs", userId);

  return { ok: true };
}

export async function deleteAuthUserAndProfile(
  admin: SupabaseClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
  if (deleteErr) return { ok: false, error: deleteErr.message, status: 400 };

  const { data: leftover } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (leftover) {
    const { error: profileErr } = await admin.from("profiles").delete().eq("id", userId);
    if (profileErr) return { ok: false, error: `Perfil não removido: ${profileErr.message}`, status: 400 };
  }

  return { ok: true };
}
