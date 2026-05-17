import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OceanBackground } from "@/components/OceanBackground";
import { ArrowLeft, Loader2, Video } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

type Category = "warm_up" | "pre_surfing";
type Post = {
  id: string;
  title: string; title_en: string | null; title_es: string | null;
  body: string | null; body_en: string | null; body_es: string | null;
  youtube_url: string | null; thumbnail_url: string | null;
  category: Category; created_at: string;
};

const pickLocalized = (p: Post, lang: string) => {
  if (lang === "en") return { title: p.title_en || p.title, body: p.body_en || p.body };
  if (lang === "es") return { title: p.title_es || p.title, body: p.body_es || p.body };
  return { title: p.title, body: p.body };
};

const youtubeId = (url: string | null): string | null => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m?.[1] ?? null;
};

export default function Feed() {
  const { t, language } = useTranslation();
  const localeMap: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };
  const locale = localeMap[language] ?? "en-US";
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Category>("warm_up");

  const TABS: { value: Category; labelKey: string; subKey: string }[] = [
    { value: "warm_up", labelKey: "feed.tabs.warmUp", subKey: "feed.tabs.warmUpSub" },
    { value: "pre_surfing", labelKey: "feed.tabs.preSurfing", subKey: "feed.tabs.preSurfingSub" },
  ];

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("posts").select("*").eq("is_published", true).order("created_at", { ascending: false });
      setPosts((data ?? []) as Post[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => posts.filter((p) => p.category === tab), [posts, tab]);
  const currentTab = TABS.find((tt) => tt.value === tab)!;

  return (
    <div className="relative min-h-screen pb-24">
      <OceanBackground />
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link to="/" className="w-10 h-10 rounded-full glass flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80">{t("feed.eyebrow")}</p>
          <h1 className="text-2xl font-bold">{t("feed.title")}</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="glass rounded-2xl p-1 flex gap-1">
          {TABS.map((tt) => {
            const active = tt.value === tab;
            return (
              <button
                key={tt.value}
                onClick={() => setTab(tt.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t(tt.labelKey)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">{t(currentTab.subKey)}</p>
      </div>

      {loading ? (
        <div className="px-5"><div className="glass rounded-2xl p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div></div>
      ) : filtered.length === 0 ? (
        <div className="px-5"><div className="glass rounded-2xl p-12 text-center text-muted-foreground"><Video className="w-8 h-8 mx-auto mb-2 opacity-50" />{t("feed.empty", { tab: t(currentTab.labelKey) })}</div></div>
      ) : (
        <div className="px-5 space-y-4">
          {filtered.map((p) => {
            const yt = youtubeId(p.youtube_url);
            const loc = pickLocalized(p, language);
            return (
              <article key={p.id} className="glass-strong rounded-2xl overflow-hidden">
                {yt && (
                  <div className="aspect-video bg-black">
                    <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${yt}`} title={loc.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                )}
                <div className="p-5">
                  <h2 className="font-bold text-lg">{loc.title}</h2>
                  {loc.body && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{loc.body}</p>}
                  <div className="text-xs text-muted-foreground mt-3">{new Date(p.created_at).toLocaleDateString(locale)}</div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
