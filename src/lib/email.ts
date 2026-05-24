import { z } from "zod";
import type { ValidationT } from "@/lib/profileFormValidation";

const EMAIL_MAX_LENGTH = 254;
const LOCAL_MAX_LENGTH = 64;

/** Remove espaços e normaliza para minúsculas. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** E-mail com domínio e TLD plausíveis (não aceita test@test, a@b, etc.). */
export function isValidRealEmail(value: string): boolean {
  const email = normalizeEmail(value);
  if (!email || email.length > EMAIL_MAX_LENGTH) return false;
  if (email.includes("..")) return false;

  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@")) return false;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain || local.length > LOCAL_MAX_LENGTH) return false;
  if (!domain.includes(".")) return false;

  const localOk = /^[a-z0-9](?:[a-z0-9.!#$%&'*+/=?^_`{|}~-]*[a-z0-9])?$/i.test(local)
    || /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local);
  if (!localOk) return false;

  const domainOk = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain);
  if (!domainOk) return false;

  const tld = domain.split(".").pop() ?? "";
  if (tld.length < 2 || !/^[a-z]{2,}$/i.test(tld)) return false;
  if (domain === "localhost" || domain.endsWith(".local") || domain.endsWith(".test")) return false;

  return true;
}

export function stripInvalidEmailInput(value: string): string {
  return value.replace(/\s/g, "").toLowerCase();
}

export function createRealEmailField(t: ValidationT) {
  return z
    .string({ required_error: t("validation.required"), invalid_type_error: t("validation.mustBeText") })
    .trim()
    .transform(normalizeEmail)
    .refine(isValidRealEmail, { message: t("validation.emailInvalid") });
}
