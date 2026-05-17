import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Quote } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

type QuoteRow = { text: string; text_en: string | null; text_es: string | null; author: string | null };

export function DailyQuote() {
  const { language } = useTranslation();
  const [quote, setQuote] = useState<QuoteRow | null>(null);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: scheduled } = await (supabase as any)
        .from("daily_quotes")
        .select("text,text_en,text_es,author")
        .eq("is_active", true)
        .eq("scheduled_date", today)
        .maybeSingle();
      if (scheduled) {
        setQuote(scheduled as any);
        return;
      }
      const { data: all } = await (supabase as any)
        .from("daily_quotes")
        .select("text,text_en,text_es,author")
        .eq("is_active", true)
        .is("scheduled_date", null);
      const list = (all ?? []) as QuoteRow[];
      if (list.length > 0) {
        const dayIdx = Math.floor(Date.now() / 86400000) % list.length;
        setQuote(list[dayIdx]);
      }
    })();
  }, []);

  if (!quote) return null;
  const text =
    language === "en" ? quote.text_en || quote.text :
    language === "es" ? quote.text_es || quote.text :
    quote.text;
  return (
    <div className="glass rounded-2xl p-4 flex gap-3">
      <Quote className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="text-sm italic">"{text}"</p>
        {quote.author && <p className="text-xs text-muted-foreground mt-1">— {quote.author}</p>}
      </div>
    </div>
  );
}
