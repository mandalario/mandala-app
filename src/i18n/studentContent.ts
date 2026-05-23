import type { Language } from "@/i18n/LanguageContext";
import pt from "@/i18n/locales/pt.json";

type LangEntry = { en: string; es: string };

function sectionMap(section: string): Record<string, LangEntry> {
  const sc = (pt as { studentContent?: Record<string, Record<string, LangEntry>> }).studentContent?.[section];
  return sc ?? {};
}

/** Traduz textos cadastrados em PT no admin/DB (frases, resumo do mar, etc.). */
export function translateStudentContent(
  section: "quotes" | "seaSummary" | "seaIdealFor",
  text: string | null | undefined,
  language: Language,
): string {
  if (!text?.trim() || language === "pt") return text ?? "";
  const entry = sectionMap(section)[text.trim()];
  if (!entry) return text;
  return language === "en" ? entry.en : entry.es;
}

export function packageCatalogText(
  name: string,
  field: "name" | "description",
  t: (key: string) => string,
  fallback: string | null,
): string {
  const key = `packages.catalog.${name}.${field}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return fallback ?? "";
}
