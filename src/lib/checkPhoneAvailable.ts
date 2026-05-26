import { supabase } from "@/integrations/supabase/client";
import { phoneDigits } from "@/lib/phone";

/** Normaliza como `public.normalize_phone_digits` no Postgres. */
function normalizePhoneDigits(phone: string): string {
  const digits = phoneDigits(phone);
  return digits.length > 0 ? digits : "";
}

export type PhoneAvailabilityResult =
  | { ok: true; available: boolean }
  | { ok: false; error: { message: string } };

function isMissingRpcError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /check_phone_available/i.test(message) ||
    /could not find the function/i.test(message) ||
    /schema cache/i.test(message)
  );
}

/**
 * Verifica se o telefone já está em uso por outra conta (RPC SECURITY DEFINER).
 * Se a função ainda não existir no banco, ignora a pré-checagem (o índice único bloqueia duplicata no save).
 */
export async function checkPhoneAvailable(
  phone: string,
  userId: string,
): Promise<PhoneAvailabilityResult> {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 10) {
    return { ok: true, available: true };
  }

  const { data, error } = await supabase.rpc("check_phone_available", {
    p_phone: phone,
    p_user_id: userId,
  });

  if (!error) {
    return { ok: true, available: data === true };
  }

  if (error.code === "PGRST202" || isMissingRpcError(error.message)) {
    return { ok: true, available: true };
  }

  return { ok: false, error: { message: error.message } };
}
