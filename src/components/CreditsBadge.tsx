import { Link } from "react-router-dom";
import { Coins } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

export function CreditsBadge({ credits }: { credits: number }) {
  const { t } = useTranslation();
  return (
    <Link
      to="/packages"
      className="h-10 px-3 rounded-full glass flex items-center gap-1.5 hover:bg-secondary/40 transition-colors"
      title={t("credits.yourCredits")}
    >
      <Coins className="w-4 h-4 text-primary" />
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground hidden sm:inline">{t("credits.yourCredits")}</span>
      <span className="text-sm font-bold">{credits}</span>
    </Link>
  );
}
