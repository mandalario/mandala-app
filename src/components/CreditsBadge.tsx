import { Link, useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

export function CreditsBadge({ credits }: { credits: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div
      onClick={() => {
        navigate("/packages");
      }}
      className="h-10 px-4 rounded-full glass flex items-center gap-2 hover:bg-primary/10 hover:ring-2 hover:ring-primary/30 transition-all active:scale-95 shadow-lg group cursor-pointer relative z-50"
      title={t("credits.yourCredits")}
    >
      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
        <Coins className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        {t("credits.yourCredits")}
      </span>
      <span className="text-sm font-bold text-primary">{credits}</span>
    </div>
  );
}
