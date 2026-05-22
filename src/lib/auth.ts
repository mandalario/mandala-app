import type { User } from "@supabase/supabase-js";

/** Usuário pode entrar com email + senha (identidade email no Supabase). */
export function userHasPasswordLogin(user: User | null | undefined): boolean {
  if (!user) return false;
  return (user.identities ?? []).some((identity) => identity.provider === "email");
}

export function userHasOAuthLogin(user: User | null | undefined): boolean {
  if (!user) return false;
  return (user.identities ?? []).some((identity) => identity.provider !== "email");
}

export const setPasswordDismissKey = (userId: string) =>
  `mandalario:set-password-dismissed:${userId}`;
