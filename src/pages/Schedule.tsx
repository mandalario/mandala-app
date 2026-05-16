import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Waves, Wind, CloudOff, Calendar as Cal } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useBillingEnabled } from "@/hooks/useBillingEnabled";

type Slot = { id: string; date: string; start_time: string; end_time: string; capacity: number; location: string | null; notes: string | null; is_open: boolean };
type Cond = { date: string; condition: "good" | "medium" | "bad" | "flat"; notes: string | null };
type Booking = { slot_id: string; status: string };

const condColor = {
  good: "text-success bg-success/15",
  medium: "text-warning bg-warning/15",
  bad: "text-destructive bg-destructive/15",
  flat: "text-muted-foreground bg-muted/30",
};
const condIcon = {
  good: <Waves className="w-3.5 h-3.5" />,
  medium: <Wind className="w-3.5 h-3.5" />,
  bad: <CloudOff className="w-3.5 h-3.5" />,
  flat: <CloudOff className="w-3.5 h-3.5" />,
};

export default function Schedule() {
  const { user, profile, refreshProfile } = useAuth();
  const { t, language } = useTranslation();
  const billingEnabled = useBillingEnabled();
  const localeMap: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };
  const locale = localeMap[language] ?? "en-US";
  const [slots, setSlots] = useState<Slot[]>([]);
  const [conds, setConds] = useState<Cond[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }, { data: b }] = await Promise.all([
      supabase.from("class_slots").select("*").gte("date", today).eq("is_open", true).order("date").order("start_time"),
      supabase.from("surf_conditions").select("date, condition, notes").gte("date", today),
      supabase.from("bookings").select("slot_id, status").eq("user_id", user!.id).neq("status", "cancelled"),
    ]);
    setSlots((s ?? []) as Slot[]);
    setConds((c ?? []) as Cond[]);
    setBookings((b ?? []) as Booking[]);

    // contar bookings por slot
    if (s && s.length) {
      const ids = s.map((x: any) => x.id);
      const { data: allB } = await supabase.from("bookings").select("slot_id").in("slot_id", ids).eq("status", "confirmed");
      const map: Record<string, number> = {};
      (allB ?? []).forEach((row: any) => { map[row.slot_id] = (map[row.slot_id] ?? 0) + 1; });
      setCounts(map);
    }
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const condByDate = useMemo(() => {
    const m: Record<string, Cond> = {};
    conds.forEach((c) => (m[c.date] = c));
    return m;
  }, [conds]);

  const grouped = useMemo(() => {
    const g: Record<string, Slot[]> = {};
    slots.forEach((s) => { (g[s.date] ??= []).push(s); });
    return g;
  }, [slots]);

  const myBooked = useMemo(() => new Set(bookings.map((b) => b.slot_id)), [bookings]);

  const book = async (slot: Slot) => {
    if (billingEnabled && (profile?.credits ?? 0) < 1) { toast.error(t("schedule.noCredits")); return; }
    setBookingId(slot.id);
    const { error } = await supabase.from("bookings").insert({ slot_id: slot.id, user_id: user!.id });
    setBookingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(t("schedule.bookSuccess"));
    await refreshProfile();
    load();
  };

  return (
    <div className="relative min-h-screen pb-24">
      <OceanBackground />
      <header className="px-5 pt-6 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-10 h-10 rounded-full glass flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/80">{t("schedule.eyebrow")}</p>
            <h1 className="text-2xl font-bold">{t("schedule.title")}</h1>
          </div>
        </div>
        {billingEnabled && (
          <Link to="/packages" className="glass rounded-xl px-3 py-2 text-xs hover:bg-secondary/40 transition-colors">
            <span className="text-muted-foreground">{t("schedule.credits")}</span> <span className="font-bold text-primary">{profile?.credits ?? 0}</span>
          </Link>
        )}
      </header>

      {loading ? (
        <div className="px-5"><div className="glass rounded-2xl p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="px-5"><div className="glass rounded-2xl p-12 text-center text-muted-foreground"><Cal className="w-8 h-8 mx-auto mb-2 opacity-50" />{t("schedule.empty")}</div></div>
      ) : (
        <div className="px-5 space-y-5">
          {Object.entries(grouped).map(([date, ds]) => {
            const cond = condByDate[date];
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="text-sm font-semibold capitalize">
                    {new Date(date + "T12:00:00").toLocaleDateString(locale, { weekday: "long", day: "2-digit", month: "short" })}
                  </div>
                  {cond && (
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${condColor[cond.condition]}`}>
                      {condIcon[cond.condition]} {t(`schedule.conditions.${cond.condition}`)}
                    </span>
                  )}
                </div>
                {cond?.notes && <div className="text-xs text-muted-foreground mb-2 px-1">{cond.notes}</div>}
                <div className="space-y-2">
                  {ds.map((s) => {
                    const taken = counts[s.id] ?? 0;
                    const isMine = myBooked.has(s.id);
                    const full = taken >= s.capacity;
                    return (
                      <div key={s.id} className="glass-strong rounded-2xl p-4 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="font-semibold">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</div>
                          <div className="text-xs text-muted-foreground">{s.location ?? t("schedule.locationTBD")} · {taken}/{s.capacity} {t("schedule.students")}</div>
                          {s.notes && <div className="text-xs text-muted-foreground mt-1">{s.notes}</div>}
                        </div>
                        {isMine ? (
                          <span className="text-xs px-3 py-2 rounded-xl bg-success/15 text-success font-semibold">{t("schedule.booked")}</span>
                        ) : (
                          <Button onClick={() => book(s)} disabled={full || bookingId === s.id} className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold disabled:opacity-40">
                            {bookingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : full ? t("schedule.full") : t("schedule.book")}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

