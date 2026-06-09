import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/LanguageContext";
import { intlLocaleFor } from "@/i18n/dateLocale";
import { ChevronDown, History, Loader2 } from "lucide-react";

type HistoryRow = {
  id: string;
  credit_used: string | null;
  class_slots: { date: string; start_time: string; location: string | null } | null;
};

const CREDIT_KEYS: Record<string, string> = {
  avulsa_grupo: "schedule.classTypes.group",
  avulsa_particular: "schedule.classTypes.private",
  aluguel: "schedule.classTypes.rental",
};

type LessonHistoryProps = {
  userId?: string;
};

export function LessonHistory({ userId }: LessonHistoryProps = {}) {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const locale = intlLocaleFor(language);
  const targetUserId = userId ?? user?.id;

  useEffect(() => {
    if (!targetUserId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id, credit_used, class_slots(date, start_time, location)")
        .eq("user_id", targetUserId)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(50);

      const list = ((data ?? []) as HistoryRow[])
        .filter((b) => b.class_slots)
        .sort((a, b) => {
          const da = a.class_slots!.date;
          const db = b.class_slots!.date;
          return db.localeCompare(da);
        });
      setRows(list);
      setLoading(false);
    })();
  }, [targetUserId]);

  const creditLabel = (key: string | null) => {
    if (!key) return "—";
    const i18nKey = CREDIT_KEYS[key];
    return i18nKey ? t(i18nKey) : key;
  };

  const formatDate = (date: string, time: string) => {
    const d = new Date(`${date}T12:00:00`);
    const dateStr = d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
    const hour = parseInt(time.slice(0, 2), 10);
    return `${dateStr} · ${hour}h`;
  };

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm uppercase tracking-widest text-primary/80 mb-3 flex items-center gap-2 w-full text-left hover:text-primary transition-colors"
      >
        <History className="w-4 h-4 shrink-0" />
        <span className="flex-1">{t("dashboard.lessonHistory.title")}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (loading ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
          {t("dashboard.lessonHistory.empty")}
        </div>
      ) : (
        <div className="glass rounded-2xl divide-y divide-white/5 overflow-hidden">
          {rows.map((b) => (
            <div key={b.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {formatDate(b.class_slots!.date, b.class_slots!.start_time)}
                </p>
                {b.class_slots!.location && (
                  <p className="text-xs text-muted-foreground truncate">{b.class_slots!.location}</p>
                )}
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/25">
                {t("dashboard.lessonHistory.creditUsed")}: {creditLabel(b.credit_used)}
              </span>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
