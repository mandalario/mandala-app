import { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from "react";
import pt from "./locales/pt.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import { LanguagePickerDialog } from "./LanguagePickerDialog";

export type Language = "pt" | "en" | "es";

const STORAGE_KEY = "app_language";
const SELECTED_KEY = "app_language_selected";

const dictionaries: Record<Language, any> = { pt, en, es };

const DEFAULT_LANGUAGE: Language = "pt";

function isValidLanguage(value: unknown): value is Language {
  return value === "pt" || value === "en" || value === "es";
}

function normalize(code: string | null | undefined): Language | null {
  if (!code) return null;
  const lc = String(code).toLowerCase().trim();
  if (!lc) return null;
  const base = lc.split(/[-_]/)[0];
  if (base === "pt") return "pt";
  if (base === "es" || base === "ca" || base === "gl") return "es";
  if (base === "en") return "en";
  return null;
}

function detectDeviceLanguage(): Language {
  const candidates: string[] = [];
  if (typeof navigator !== "undefined") {
    const nav = navigator as any;
    if (Array.isArray(nav.languages)) candidates.push(...nav.languages.filter(Boolean));
    if (nav.language) candidates.push(nav.language);
    if (nav.userLanguage) candidates.push(nav.userLanguage);
    if (nav.browserLanguage) candidates.push(nav.browserLanguage);
    if (nav.systemLanguage) candidates.push(nav.systemLanguage);
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (/America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Belem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Rio_Branco|Maceio|Araguaina|Boa_Vista|Noronha|Santarem)|Atlantic\/(Azores|Madeira)|Europe\/Lisbon/i.test(tz)) {
      candidates.push("pt");
    } else if (/America\/(Mexico_City|Bogota|Lima|Santiago|Caracas|Argentina|Montevideo|Asuncion|La_Paz|Guayaquil|Havana|Panama|Costa_Rica|El_Salvador|Guatemala|Tegucigalpa|Managua|Santo_Domingo|Puerto_Rico)|Europe\/Madrid|Atlantic\/Canary/i.test(tz)) {
      candidates.push("es");
    }
  } catch {}
  for (const raw of candidates) {
    const lang = normalize(raw);
    if (lang) return lang;
  }
  return DEFAULT_LANGUAGE;
}

function readStoredLanguage(): Language | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isValidLanguage(v) ? v : null;
  } catch {}
  return null;
}

function readSelectedFlag(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(SELECTED_KEY) === "1";
  } catch {}
  return false;
}

function getByPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{{${k}}}`));
}

type TFn = (key: string, vars?: Record<string, string | number>) => string;

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TFn;
  available: Language[];
  needsSelection: boolean;
  confirmSelection: (lang: Language) => void;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage() ?? detectDeviceLanguage());
  const [needsSelection, setNeedsSelection] = useState<boolean>(() => !readSelectedFlag());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(SELECTED_KEY, "1");
    } catch {}
    setNeedsSelection(false);
  }, []);

  const confirmSelection = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(SELECTED_KEY, "1");
    } catch {}
    setNeedsSelection(false);
  }, []);

  const t = useCallback<TFn>(
    (key, vars) => {
      const primary = getByPath(dictionaries[language], key);
      if (typeof primary === "string") return interpolate(primary, vars);
      const fallback = getByPath(dictionaries.en, key);
      if (typeof fallback === "string") return interpolate(fallback, vars);
      return key;
    },
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t, available: ["pt", "en", "es"], needsSelection, confirmSelection }),
    [language, setLanguage, t, needsSelection, confirmSelection],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
      {needsSelection && <LanguagePickerDialog suggested={language} onConfirm={confirmSelection} />}
    </LanguageContext.Provider>
  );
}

export { useLanguage, useTranslation } from "./useLanguage";
