import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, ExternalLink } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

type Partner = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
};

export function HomePartners() {
  const { t } = useTranslation();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("partners")
          .select("id, name, description, logo_url, website_url")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });
        
        setPartners((data ?? []) as Partner[]);
      } catch (error) {
        console.error("Error loading partners:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass rounded-2xl p-4 flex gap-4 w-[280px] shrink-0 h-24" />
        ))}
      </div>
    );
  }

  if (partners.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-widest text-primary/80 flex items-center gap-1.5 font-bold">
          <Handshake className="w-4 h-4 text-primary" />
          {t("dashboard.partnersTitle") || "Parceiros & Benefícios"}
        </h2>
      </div>

      <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide -mx-5 px-5">
        {partners.map((p) => {
          const cardContent = (
            <>
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 overflow-hidden flex items-center justify-center shrink-0 shadow-soft">
                {p.logo_url ? (
                  <img
                    src={p.logo_url}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Handshake className="w-6 h-6 text-primary/70" />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm text-foreground truncate">{p.name}</span>
                  {p.website_url && (
                    <ExternalLink className="w-3 h-3 text-primary shrink-0 opacity-70" />
                  )}
                </div>
                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-tight">
                    {p.description}
                  </p>
                )}
              </div>
            </>
          );

          if (p.website_url) {
            return (
              <a
                key={p.id}
                href={p.website_url}
                target="_blank"
                rel="noreferrer"
                className="glass rounded-3xl p-4 flex gap-4 w-[290px] shrink-0 snap-start hover:bg-secondary/40 active:scale-[0.98] transition-all border border-white/10"
              >
                {cardContent}
              </a>
            );
          }

          return (
            <div
              key={p.id}
              className="glass rounded-3xl p-4 flex gap-4 w-[290px] shrink-0 snap-start border border-white/10"
            >
              {cardContent}
            </div>
          );
        })}
      </div>
    </div>
  );
}
