import type { Language } from "@/i18n/LanguageContext";
import { enUS, es, ptBR, type Locale } from "date-fns/locale";

export function dateFnsLocaleFor(language: Language): Locale {
  if (language === "en") return enUS;
  if (language === "es") return es;
  return ptBR;
}

export function intlLocaleFor(language: Language): string {
  if (language === "en") return "en-US";
  if (language === "es") return "es";
  return "pt-BR";
}
