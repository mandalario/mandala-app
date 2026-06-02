import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OceanBackground } from "@/components/OceanBackground";
import { Brand } from "@/components/Brand";
import { Loader2, ArrowLeft } from "lucide-react";
import logoMandala from "@/assets/logo-mandala.png";
import { useTranslation } from "@/i18n/LanguageContext";
import { intlLocaleFor } from "@/i18n/dateLocale";

type Doc = { title: string; version: string; content: string; updated_at: string };

export default function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const { t, language } = useTranslation();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const table = kind === "terms" ? "terms_of_service" : "privacy_policy";
      const { data, error } = await supabase
        .from(table)
        .select("title, version, content, updated_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error(`[LegalPage] failed to load ${table}:`, error.message);
      }
      setDoc(data as Doc | null);
      setLoading(false);
    })();
  }, [kind]);

  const heading = kind === "terms" ? t("legal.termsTitle") : t("legal.privacyTitle");
  const dateLocale = intlLocaleFor(language);

  return (
    <div className="relative min-h-screen px-4 py-8 sm:py-12">
      <OceanBackground />

      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> {t("common.back")}
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white p-2 shadow-elevated mb-3">
            <img src={logoMandala} alt={t("legal.logoAlt")} className="w-full h-full object-contain" />
          </div>
          <Brand size="md" />
        </div>

        <article className="glass-strong rounded-3xl p-6 sm:p-10 shadow-elevated">
          {loading ? (
            <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
          ) : !doc ? (
            <div className="text-center py-16 text-muted-foreground">{t("legal.notAvailable", { title: heading })}</div>
          ) : (
            <>
              <header className="mb-6 pb-6 border-b border-white/5">
                <h1 className="text-2xl sm:text-3xl font-bold">{doc.title}</h1>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("common.version", { version: doc.version })} • {t("common.updatedAt", {
                    date: new Date(doc.updated_at).toLocaleDateString(dateLocale),
                  })}
                </p>
              </header>
              <div className="whitespace-pre-line text-sm sm:text-base leading-relaxed text-foreground/90">
                {doc.content}
              </div>
            </>
          )}
        </article>

      </div>
    </div>
  );
}
