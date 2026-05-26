import {
  COUNTRY_DIAL_CODES_BY_LENGTH,
  DEFAULT_COUNTRY_ISO,
  getCountryByIso,
  getDefaultCountry,
} from "@/lib/countryDialCodes";

/** Formata telefone BR: DDD + número → (XX) XXXXX-XXXX ou (XX) XXXX-XXXX */
export function formatBrazilPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Mesma regra que `public.normalize_phone_digits`: só dígitos;
 * números BR com +55 viram DDD + número (10–11 dígitos).
 */
export function canonicalPhoneDigits(value: string): string {
  const digits = phoneDigits(value);
  if (!digits) return "";
  if (/^55\d{10,11}$/.test(digits)) return digits.slice(2);
  return digits;
}

/** DDDs válidos no Brasil (ANATEL). */
const VALID_BRAZIL_DDD = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export const BRAZIL_PHONE_FORMAT_HINT = "(XX) XXXXX-XXXX ou (XX) XXXX-XXXX";
export const INTERNATIONAL_PHONE_FORMAT_HINT = "+XX XXXXXXXXX (até 15 dígitos)";

export const brazilPhoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

/** Celular (11 dígitos) ou fixo (10 dígitos) com DDD brasileiro válido. */
export function isValidBrazilPhone(value: string): boolean {
  const digits = phoneDigits(value);
  if (digits.length !== 10 && digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const ddd = Number.parseInt(digits.slice(0, 2), 10);
  if (!VALID_BRAZIL_DDD.has(ddd)) return false;

  if (digits.length === 11) {
    return digits[2] === "9";
  }

  const first = digits[2];
  return first >= "2" && first <= "5";
}

const MIN_INTERNATIONAL_DIGITS = 8;
const MAX_INTERNATIONAL_DIGITS = 15;

function isValidInternationalDigits(digits: string): boolean {
  if (digits.length < MIN_INTERNATIONAL_DIGITS || digits.length > MAX_INTERNATIONAL_DIGITS) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (digits.startsWith("55") && digits.length >= 12) {
    return isValidBrazilPhone(digits.slice(2));
  }
  return true;
}

/** Aceita telefone BR ou internacional (E.164, até 15 dígitos). */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const digits = phoneDigits(trimmed);
  if (!digits) return false;

  const explicitInternational = trimmed.startsWith("+") || digits.length > 11;

  if (explicitInternational) {
    return isValidInternationalDigits(digits);
  }

  if (brazilPhoneRegex.test(trimmed)) {
    return isValidBrazilPhone(trimmed);
  }

  if (digits.length === 10 || digits.length === 11) {
    return isValidBrazilPhone(trimmed);
  }

  return isValidInternationalDigits(digits);
}

export const phoneFieldMessage =
  "informe um telefone válido, ex.: (11) 99999-9999 ou +351912345678";

export type PhoneParts = { iso: string; national: string };

export function parsePhoneParts(value: string, defaultIso = DEFAULT_COUNTRY_ISO): PhoneParts {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { iso: defaultIso, national: "" };

  if (brazilPhoneRegex.test(trimmed)) {
    return { iso: "BR", national: trimmed };
  }

  const allDigits = phoneDigits(trimmed);

  for (const country of COUNTRY_DIAL_CODES_BY_LENGTH) {
    if (allDigits.startsWith(country.dial) && allDigits.length > country.dial.length) {
      const nationalDigits = allDigits.slice(country.dial.length);
      return {
        iso: country.iso,
        national: country.iso === "BR" ? formatBrazilPhone(nationalDigits) : nationalDigits,
      };
    }
  }

  if (allDigits.length <= 11 && !trimmed.startsWith("+")) {
    return { iso: "BR", national: formatBrazilPhone(allDigits) };
  }

  if (trimmed.startsWith("+")) {
    for (const country of COUNTRY_DIAL_CODES_BY_LENGTH) {
      if (allDigits.startsWith(country.dial)) {
        const nationalDigits = allDigits.slice(country.dial.length);
        return {
          iso: country.iso,
          national: country.iso === "BR" ? formatBrazilPhone(nationalDigits) : nationalDigits,
        };
      }
    }
    return { iso: defaultIso, national: "" };
  }

  return { iso: defaultIso, national: formatNationalInput(defaultIso, allDigits) };
}

export function composePhone(iso: string, national: string): string {
  const country = getCountryByIso(iso) ?? getDefaultCountry();
  const nationalDigits = phoneDigits(national);
  if (!nationalDigits) return "";

  const maxNational = MAX_INTERNATIONAL_DIGITS - country.dial.length;
  const clipped = nationalDigits.slice(0, Math.max(maxNational, 1));
  return `+${country.dial}${clipped}`;
}

export function formatNationalInput(iso: string, value: string): string {
  const country = getCountryByIso(iso) ?? getDefaultCountry();
  let digits = phoneDigits(value);

  if (digits.startsWith(country.dial) && digits.length > country.dial.length) {
    digits = digits.slice(country.dial.length);
  }

  if (iso === "BR") return formatBrazilPhone(digits);
  const maxLen = MAX_INTERNATIONAL_DIGITS - country.dial.length;
  return digits.slice(0, maxLen);
}

/** Apenas a parte nacional, para exibição (sem código do país). */
export function formatPhoneNationalOnly(value: string, defaultIso = DEFAULT_COUNTRY_ISO): string {
  return parsePhoneParts(value, defaultIso).national;
}

/** @deprecated use phoneFieldMessage */
export const brazilPhoneFieldMessage = phoneFieldMessage;

/** Formata entrada: BR por padrão; com + ou mais de 11 dígitos, formato internacional. */
export function formatPhoneInput(value: string): string {
  const trimmed = value.trimStart();
  if (trimmed.startsWith("+") || value.startsWith("+")) {
    const digits = phoneDigits(value).slice(0, MAX_INTERNATIONAL_DIGITS);
    return digits ? `+${digits}` : "+";
  }

  const digits = phoneDigits(value);
  if (digits.length > 11) {
    return `+${digits.slice(0, MAX_INTERNATIONAL_DIGITS)}`;
  }

  return formatBrazilPhone(value);
}

/** Exibe telefone salvo — apenas parte nacional (código fica no seletor). */
export function formatPhoneDisplay(value: string): string {
  return formatPhoneNationalOnly(value);
}

/** Apenas letras, espaços, hífen e apóstrofo (nome de pessoa). */
export const personNameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;

export function stripDigitsFromName(value: string): string {
  return value.replace(/[0-9]/g, "");
}

/** Apenas dígitos (ex.: idade). */
export function stripToDigits(value: string, maxLength?: number): string {
  const digits = value.replace(/\D/g, "");
  return maxLength != null ? digits.slice(0, maxLength) : digits;
}

/** Número decimal com um separador (ex.: peso). */
export function stripToDecimalInput(value: string): string {
  let v = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dot = v.indexOf(".");
  if (dot >= 0) {
    v = `${v.slice(0, dot + 1)}${v.slice(dot + 1).replace(/\./g, "")}`;
  }
  return v;
}
