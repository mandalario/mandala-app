import { useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useIsApp } from "@/hooks/useIsApp";

export function CreditsBadge({ 
  credits,
  creditsGrupo = 0,
  creditsParticular = 0,
  creditsAluguel = 0,
}: { 
  credits: number;
  creditsGrupo?: number;
  creditsParticular?: number;
  creditsAluguel?: number;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isApp = useIsApp();

  const total = creditsGrupo + creditsParticular + creditsAluguel;

  return (
    <div
      onClick={() => {
        if (isApp) {
          navigate("/adquirir-aulas");
        } else {
          navigate("/packages");
        }
      }}
      className="h-10 px-4 rounded-full glass flex items-center gap-2 hover:bg-primary/10 hover:ring-2 hover:ring-primary/30 transition-all active:scale-95 shadow-lg group cursor-pointer relative z-50"
      title={`${t("studentHome.creditsBadge")} — ${t("credits.groupShort")} ${creditsGrupo} · ${t("credits.privateShort")} ${creditsParticular} · ${t("credits.rentalShort")} ${creditsAluguel}`}
    >
      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
        <Coins className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        {t("studentHome.creditsBadge")}
      </span>
      <span className="text-sm font-bold text-primary flex items-center gap-1">
        <span>{total > 0 ? total : credits}</span>
        {total > 0 && (
          <span className="text-[9px] text-muted-foreground/80 font-normal hidden sm:inline ml-1">
            ({creditsGrupo}G · {creditsParticular}P · {creditsAluguel}A)
          </span>
        )}
      </span>
    </div>
  );
}
