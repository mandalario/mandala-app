import type { User } from "@supabase/supabase-js";

/** Gravado em user_metadata após cadastrar senha (contorna bug do Supabase em contas OAuth). */
export const PASSWORD_LOGIN_METADATA_KEY = "password_login_enabled";

export const passwordConfiguredKey = (userId: string) =>
  `mandalario:password-configured:${userId}`;

export const setPasswordDismissKey = (userId: string) =>
  `mandalario:set-password-dismissed:${userId}`;

function readLocalFlag(key: string): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(key) === "1";
}

/** Usuário pode entrar com email + senha. */
export function userHasPasswordLogin(user: User | null | undefined): boolean {
  if (!user) return false;

  if ((user.identities ?? []).some((identity) => identity.provider === "email")) {
    return true;
  }

  if (user.user_metadata?.[PASSWORD_LOGIN_METADATA_KEY] === true) {
    return true;
  }

  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.includes("email")) {
    return true;
  }

  return readLocalFlag(passwordConfiguredKey(user.id));
}

export function userHasOAuthLogin(user: User | null | undefined): boolean {
  if (!user) return false;
  return (user.identities ?? []).some((identity) => identity.provider !== "email");
}

export function userSkippedSetPassword(user: User | null | undefined): boolean {
  if (!user) return false;
  return readLocalFlag(setPasswordDismissKey(user.id));
}

export function markPasswordLoginConfigured(userId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(passwordConfiguredKey(userId), "1");
}

export function dismissSetPasswordPrompt(userId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(setPasswordDismissKey(userId), "1");
}
