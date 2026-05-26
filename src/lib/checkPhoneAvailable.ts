import { supabase } from "@/integrations/supabase/client";
import { canonicalPhoneDigits } from "@/lib/phone";

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

async function callPhoneAvailableRpc(
  phone: string,
  userId: string,
): Promise<{ data: boolean | null; error: { code?: string; message?: string } | null }> {
  const { data, error } = await supabase.rpc("check_phone_available", {
    p_phone: phone,
    p_user_id: userId,
  });
  return { data: data as boolean | null, error };
}

/**
 * Verifica se o telefone já está em uso por outra conta (RPC SECURITY DEFINER).
 * Se a função ainda não existir no banco, ignora a pré-checagem (o índice único bloqueia duplicata no save).
 */
export async function checkPhoneAvailable(
  phone: string,
  userId: string,
): Promise<PhoneAvailabilityResult> {
  const digits = canonicalPhoneDigits(phone);
  if (digits.length < 10) {
    return { ok: true, available: true };
  }

  let { data, error } = await callPhoneAvailableRpc(phone, userId);
  if (error) {
    ({ data, error } = await callPhoneAvailableRpc(phone, userId));
  }

  if (!error) {
    return { ok: true, available: data === true };
  }

  if (error.code === "PGRST202" || isMissingRpcError(error.message)) {
    return { ok: true, available: true };
  }

  // RPC indisponível (migration pendente, permissão, rede): deixa o save tentar;
  // duplicata real cai no índice único com mensagem de número em uso.
  return { ok: true, available: true };
}
