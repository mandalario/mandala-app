import type { Language } from "@/i18n/LanguageContext";
import pt from "@/i18n/locales/pt.json";

type LangEntry = { en: string; es: string };

type StudentContentSection = "quotes" | "seaSummary" | "seaIdealFor";

function contentKey(text: string): string {
  return text.trim().normalize("NFC");
}

function sectionMap(section: StudentContentSection): Record<string, LangEntry> {
  const sc = (pt as { studentContent?: Record<string, Record<string, LangEntry>> }).studentContent?.[section];
  return sc ?? {};
}

function mapEntry(section: StudentContentSection, text: string): LangEntry | undefined {
  return sectionMap(section)[contentKey(text)];
}

/** Traduz textos cadastrados em PT no admin/DB (frases, resumo do mar, etc.). */
export function translateStudentContent(
  section: StudentContentSection,
  text: string | null | undefined,
  language: Language,
): string {
  if (!text?.trim() || language === "pt") return text ?? "";
  const entry = mapEntry(section, text);
  if (!entry) return text;
  return language === "en" ? entry.en : entry.es;
}

/** Resolve PT → EN/ES: mapa estático primeiro, depois colunas do banco (se distintas do PT). */
export function resolveStudentContent(
  section: StudentContentSection,
  textPt: string,
  language: Language,
  db?: { en?: string | null; es?: string | null },
): string {
  if (language === "pt") return textPt;
  const key = contentKey(textPt);
  const fromMap = mapEntry(section, textPt);
  if (fromMap) return language === "en" ? fromMap.en : fromMap.es;
  const fromDb = (language === "en" ? db?.en : db?.es)?.trim();
  if (fromDb && fromDb !== key) return fromDb;
  return textPt;
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
