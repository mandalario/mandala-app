import { Link } from "react-router-dom";
import { OceanBackground } from "@/components/OceanBackground";
import { ArrowLeft, ChevronRight, Mail, MessageCircle } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";

const SUPPORT_EMAIL = "contatomandalario@gmail.com";

export default function Support() {
  const { t } = useTranslation();
  const { user, profile, isGuest } = useAuth();
  const backTo = user && profile && !isGuest ? "/profile" : "/auth";

  return (
    <div className="relative min-h-screen pb-24">
      <OceanBackground />

      <header className="px-5 pt-8 pb-4 flex items-center gap-3">
        <Link to={backTo} className="w-10 h-10 rounded-full glass flex items-center justify-center shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-bold">{t("support.title")}</h1>
      </header>

      <section className="px-5 space-y-4">
        <p className="text-sm text-muted-foreground">{t("support.description")}</p>

        <div className="glass-strong rounded-3xl p-5 space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-primary/80">{t("support.optionsTitle")}</h2>

          <Link
            to="/chat"
            className="flex items-center gap-4 p-4 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{t("support.chatTitle")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("support.chatDescription")}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-4 p-4 rounded-2xl bg-background/40 border border-white/5 hover:bg-background/60 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-secondary/40 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-foreground/80" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{t("support.emailTitle")}</p>
              <p className="text-xs text-primary mt-0.5 break-all">{SUPPORT_EMAIL}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </a>
        </div>
      </section>
    </div>
  );
}
