import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  background_image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
};

export function HomeBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("home_banners")
        .select("id,title,subtitle,body,background_image_url,cta_label,cta_url,starts_at,ends_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      const filtered = ((data ?? []) as any[]).filter(
        (b) => (!b.starts_at || b.starts_at <= nowIso) && (!b.ends_at || b.ends_at >= nowIso),
      );
      setBanners(filtered as Banner[]);
    })();
  }, []);

  const total = banners.length;
  const next = () => setIdx((i) => (i + 1) % Math.max(total, 1));
  const prev = () => setIdx((i) => (i - 1 + total) % Math.max(total, 1));

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [total]);

  if (total === 0) return null;

  const banner = banners[idx];

  return (
    <div className="relative">
      <div className="glass-strong rounded-3xl relative overflow-hidden h-[210px]">
        {banner && (
          <a
            href={banner.cta_url ?? "#"}
            target={banner.cta_url ? "_blank" : undefined}
            rel="noreferrer"
            className="block h-full relative"
          >
            {banner.background_image_url && (
              <img
                src={banner.background_image_url}
                alt={banner.title ?? "Banner"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
            <div className="relative h-full p-6 flex flex-col justify-end">
              {banner.subtitle && (
                <p className="text-[11px] uppercase tracking-widest text-primary/90 mb-1">{banner.subtitle}</p>
              )}
              {banner.title && <h3 className="text-xl font-bold leading-tight">{banner.title}</h3>}
              {banner.body && <p className="text-xs text-foreground/80 mt-1 line-clamp-2">{banner.body}</p>}
              {banner.cta_label && banner.cta_url && (
                <Button size="sm" className="mt-3 self-start rounded-xl bg-gradient-to-r from-primary to-accent">
                  {banner.cta_label}
                </Button>
              )}
            </div>
          </a>
        )}

        {total > 1 && (
          <>
            <button
              onClick={(e) => { e.preventDefault(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/40 backdrop-blur flex items-center justify-center hover:bg-background/60"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/40 backdrop-blur flex items-center justify-center hover:bg-background/60"
              aria-label="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-foreground/20"}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
