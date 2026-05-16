import { Globe } from "lucide-react";
import { useLanguage, Language } from "@/i18n/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FLAGS: Record<Language, string> = { pt: "🇧🇷", en: "🇺🇸", es: "🇪🇸" };

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, available, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`glass flex items-center gap-1.5 rounded-full transition-colors hover:bg-secondary/40 ${
          compact ? "h-10 w-10 justify-center" : "h-10 px-3"
        }`}
        aria-label={t("common.language")}
      >
        {compact ? (
          <span className="text-base leading-none">{FLAGS[language]}</span>
        ) : (
          <>
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium uppercase">{language}</span>
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {available.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`cursor-pointer ${lang === language ? "bg-primary/10 text-primary font-semibold" : ""}`}
          >
            <span className="mr-2 text-base">{FLAGS[lang]}</span>
            {t(`languages.${lang}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
