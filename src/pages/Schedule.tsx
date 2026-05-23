import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Waves, Wind, CloudOff, Calendar as Cal, Users, User, Package, XCircle } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useBillingEnabled } from "@/hooks/useBillingEnabled";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { dateFnsLocaleFor } from "@/i18n/dateLocale";

type Slot = { id: string; date: string; start_time: string; end_time: string; capacity: number; location: string | null; notes: string | null; is_open: boolean; class_type: "avulsa_grupo" | "avulsa_particular" | "aluguel" };
type Cond = { date: string; condition: "good" | "medium" | "bad" | "flat"; notes: string | null };
type Booking = { slot_id: string; status: string };
type ClassTypeFilter = "avulsa_grupo" | "avulsa_particular" | "aluguel";

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
  const [slots, setSlots] = useState<Slot[]>([]);
  const [conds, setConds] = useState<Cond[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>("");
  const [classTypeFilter, setClassTypeFilter] = useState<ClassTypeFilter | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const dateFnsLocale = dateFnsLocaleFor(language);

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    if (language === "en") return format(date, "MMMM d, yyyy", { locale: dateFnsLocale });
    return format(date, "d 'de' MMMM 'de' yyyy", { locale: dateFnsLocale });
  };

  const selectClassFilter = (type: ClassTypeFilter) => {
    setClassTypeFilter(type);
    setFilterDate("");
  };

  const loadConditions = async () => {
    const { data: c } = await supabase
      .from("surf_conditions")
      .select("date, condition, notes")
      .gte("date", today);
    setConds((c ?? []) as Cond[]);
  };

  const loadSlots = async () => {
    if (!user || !classTypeFilter) return;
    setLoading(true);
    let q = supabase
      .from("class_slots")
      .select("*")
      .eq("is_open", true)
      .eq("class_type", classTypeFilter)
      .order("date")
      .order("start_time");

    if (filterDate) {
      q = q.eq("date", filterDate);
    } else {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      q = q.gte("date", today).lte("date", d.toISOString().slice(0, 10));
    }

    const [{ data: s }, { data: b }] = await Promise.all([
      q,
      supabase.from("bookings").select("slot_id, status").eq("user_id", user.id).neq("status", "cancelled"),
    ]);
    setSlots((s ?? []) as Slot[]);
    setBookings((b ?? []) as Booking[]);

    if (s && s.length) {
      const ids = s.map((x: { id: string }) => x.id);
      const { data: allB } = await supabase.from("bookings").select("slot_id").in("slot_id", ids).eq("status", "confirmed");
      const map: Record<string, number> = {};
      (allB ?? []).forEach((row: { slot_id: string }) => { map[row.slot_id] = (map[row.slot_id] ?? 0) + 1; });
      setCounts(map);
    } else {
      setCounts({});
    }
    setLoading(false);
  };

  useEffect(() => { if (user) loadConditions(); }, [user]);
  useEffect(() => {
    if (!user || !classTypeFilter) {
      setSlots([]);
      setBookings([]);
      setCounts({});
      setLoading(false);
      return;
    }
    loadSlots();
  }, [user, filterDate, classTypeFilter]);

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

  const calendarModifiers = useMemo(() => ({
    good: conds.filter(c => c.condition === 'good').map(c => new Date(c.date + 'T12:00:00')),
    medium: conds.filter(c => c.condition === 'medium').map(c => new Date(c.date + 'T12:00:00')),
    bad: conds.filter(c => c.condition === 'bad').map(c => new Date(c.date + 'T12:00:00')),
    flat: conds.filter(c => c.condition === 'flat').map(c => new Date(c.date + 'T12:00:00')),
  }), [conds]);

  const book = async (slot: Slot) => {
    if (billingEnabled) {
      const type = slot.class_type || "avulsa_grupo";
      
      let userCredits = 0;
      let typeLabel = "Aula em Grupo";
      if (type === "avulsa_grupo") {
        userCredits = profile?.credits_grupo ?? 0;
        typeLabel = "Aula em Grupo";
      } else if (type === "avulsa_particular") {
        userCredits = profile?.credits_particular ?? 0;
        typeLabel = "Aula Particular";
      } else if (type === "aluguel") {
        userCredits = profile?.credits_aluguel ?? 0;
        typeLabel = "Aluguel";
      }

      if (userCredits < 1) {
        toast.error(`Você não tem créditos de ${typeLabel}. Por favor, recarregue.`);
        return;
      }
    }
    
    setBookingId(slot.id);
    const payload: any = { slot_id: slot.id, user_id: user!.id, status: "confirmed", is_accepted: null };
    payload.credit_used = slot.class_type || "avulsa_grupo";

    const { error } = await supabase.from("bookings").upsert(
      payload,
      { onConflict: "slot_id, user_id" }
    );
    setBookingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(t("schedule.bookSuccess"));
    await refreshProfile();
    loadSlots();
  };

  const handleBookClick = (slot: Slot) => {
    book(slot);
  };

  const unbook = async (slot: Slot) => {
    if (!window.confirm("Tem certeza que deseja desmarcar esta aula? Seu crédito será devolvido.")) return;
    setBookingId(slot.id);
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("slot_id", slot.id).eq("user_id", user!.id);
    setBookingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Aula desmarcada com sucesso! Crédito devolvido.");
    await refreshProfile();
    loadSlots();
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
          <Link to="/packages" className="glass rounded-xl px-3 py-2 text-[10px] sm:text-xs hover:bg-secondary/40 transition-colors flex flex-col sm:flex-row gap-1 sm:gap-2 text-right">
            <div><span className="text-muted-foreground">Grupo:</span> <span className="font-bold text-primary">{profile?.credits_grupo ?? 0}</span></div>
            <div><span className="text-muted-foreground">Particular:</span> <span className="font-bold text-primary">{profile?.credits_particular ?? 0}</span></div>
            <div><span className="text-muted-foreground">Aluguel:</span> <span className="font-bold text-primary">{profile?.credits_aluguel ?? 0}</span></div>
          </Link>
        )}
      </header>

      <div className="px-5 mb-6 max-w-md mx-auto">
        <div className="glass rounded-[32px] overflow-hidden border border-white/10 shadow-2xl">
          <div className="p-5 pb-0 flex items-center justify-between">
            <h2 className="text-[13px] font-bold flex items-center gap-2 text-white/90">
              <Cal className="w-4 h-4 text-primary" />
              {filterDate ? format(new Date(filterDate + "T12:00:00"), "MMMM yyyy", { locale: dateFnsLocale }) : "Calendário"}
            </h2>
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="text-[10px] font-bold text-primary hover:text-accent transition-colors bg-primary/10 px-3 py-1.5 rounded-xl uppercase tracking-wider"
              >
                Limpar
              </button>
            )}
          </div>

          <Calendar
            mode="single"
            selected={filterDate ? new Date(filterDate + "T12:00:00") : undefined}
            onSelect={(date) => setFilterDate(date ? format(date, "yyyy-MM-dd") : "")}
            locale={dateFnsLocale}
            className="w-full flex justify-center p-2"
            modifiers={calendarModifiers}
            modifiersClassNames={{
              good: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-success after:rounded-full",
              medium: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-warning after:rounded-full",
              bad: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-destructive after:rounded-full",
              flat: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-muted-foreground after:rounded-full",
            }}
            classNames={{
              months: "w-full",
              month: "w-full space-y-2",
              caption: "flex justify-center pt-1 relative items-center mb-1",
              caption_label: "text-sm font-bold text-white capitalize",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-white/5 border-none hover:bg-white/10 text-white rounded-full transition-colors flex items-center justify-center",
              table: "w-full border-collapse",
              head_row: "flex justify-between mb-1 px-2",
              head_cell: "text-muted-foreground w-8 font-medium text-[11px] lowercase",
              row: "flex w-full justify-between mt-0.5 px-2",
              cell: "h-8 w-8 text-center text-sm p-0 relative focus-within:z-20",
              day: "h-8 w-8 p-0 font-medium text-white/80 aria-selected:opacity-100 hover:bg-white/5 rounded-xl transition-all",
              day_selected: "bg-primary text-primary-foreground font-bold hover:bg-primary/90 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.4)]",
              day_today: "text-primary font-bold border border-primary/20 rounded-xl",
              day_outside: "text-white/20 opacity-40",
            }}
          />

          <div className="p-5 border-t border-white/5 bg-black/20">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground font-medium">
                <span className="w-2 h-2 rounded-full bg-success"></span> Mar bom
              </div>
              <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground font-medium">
                <span className="w-2 h-2 rounded-full bg-warning"></span> Mar médio
              </div>
              <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground font-medium">
                <span className="w-2 h-2 rounded-full bg-destructive"></span> Mar ruim
              </div>
              <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground font-medium">
                <span className="w-2 h-2 rounded-full bg-muted-foreground"></span> Sem ondas
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mb-5 max-w-md mx-auto">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2 px-1">
          {t("schedule.classTypePrompt")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => selectClassFilter("avulsa_grupo")}
            className={`glass rounded-2xl p-3 flex flex-col items-center gap-1.5 border transition-all ${
              classTypeFilter === "avulsa_grupo"
                ? "border-primary/50 bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                : "border-white/5 hover:border-white/15"
            }`}
          >
            <Users className={`w-5 h-5 ${classTypeFilter === "avulsa_grupo" ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-[11px] font-bold">{t("schedule.filterGroup")}</span>
          </button>
          <button
            type="button"
            onClick={() => selectClassFilter("avulsa_particular")}
            className={`glass rounded-2xl p-3 flex flex-col items-center gap-1.5 border transition-all ${
              classTypeFilter === "avulsa_particular"
                ? "border-purple-400/50 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                : "border-white/5 hover:border-white/15"
            }`}
          >
            <User className={`w-5 h-5 ${classTypeFilter === "avulsa_particular" ? "text-purple-400" : "text-muted-foreground"}`} />
            <span className="text-[11px] font-bold">{t("schedule.filterPrivate")}</span>
          </button>
          <button
            type="button"
            onClick={() => selectClassFilter("aluguel")}
            className={`glass rounded-2xl p-3 flex flex-col items-center gap-1.5 border transition-all ${
              classTypeFilter === "aluguel"
                ? "border-amber-400/50 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                : "border-white/5 hover:border-white/15"
            }`}
          >
            <Package className={`w-5 h-5 ${classTypeFilter === "aluguel" ? "text-amber-400" : "text-muted-foreground"}`} />
            <span className="text-[11px] font-bold">{t("schedule.filterRental")}</span>
          </button>
        </div>
      </div>

      {!classTypeFilter ? (
        <div className="px-5">
          <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
            <Cal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {t("schedule.selectType")}
          </div>
        </div>
      ) : loading ? (
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
                  <div className="text-[13px] font-bold capitalize text-white mb-2">
                    {formatFullDate(date)}
                  </div>
                  {cond && (
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${condColor[cond.condition]}`}>
                      {condIcon[cond.condition]} {t(`schedule.conditions.${cond.condition}`)}
                    </span>
                  )}
                </div>
                {cond?.notes && <div className="text-xs text-muted-foreground mb-2 px-1">{cond.notes}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ds.map((s) => {
                    const taken = counts[s.id] ?? 0;
                    const isMine = myBooked.has(s.id);
                    const full = taken >= s.capacity;
                    const isConfirmed = s.notes?.includes("[CONFIRMADA]") ?? false;
                    const cleanNotes = s.notes
                      ? s.notes
                        .replace(/\[CONFIRMADA\]\s*/g, "")
                        .replace(/\[IMPREVISTO\]\s*([^[\]\-]*)\s*(-|—)?\s*/g, "")
                        .trim()
                      : "";

                    const typeLabels: Record<string, string> = {
                      avulsa_grupo: "Grupo",
                      avulsa_particular: "Particular",
                      aluguel: "Aluguel",
                    };
                    const typeColors: Record<string, string> = {
                      avulsa_grupo: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                      avulsa_particular: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                      aluguel: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                    };
                    const currentType = (s.class_type as string) in typeLabels ? s.class_type : "avulsa_grupo";

                    return (
                      <div key={s.id} className="glass-strong rounded-[32px] p-5 flex flex-col justify-between min-h-[160px] border border-white/5 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex flex-col">
                              <span className="text-2xl font-black text-white leading-none">
                                {parseInt(s.start_time.slice(0, 2), 10)}h
                              </span>
                              <span className="text-[10px] text-muted-foreground font-medium mt-1">
                                {s.location ?? t("schedule.locationTBD")}
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${typeColors[currentType]}`}>
                                {typeLabels[currentType]}
                              </span>
                              {isConfirmed && (
                                <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                                  ✓ Confirmada
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-[11px] text-muted-foreground/80 font-medium">
                            {taken}/{s.capacity} {t("schedule.students")}
                          </div>
                          {cleanNotes && <div className="text-[10px] text-muted-foreground/60 mt-2 italic line-clamp-2 leading-relaxed">{cleanNotes}</div>}
                        </div>

                        <div className="mt-5">
                          {isMine ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] uppercase tracking-widest px-3 py-2 rounded-xl bg-success/15 text-success font-extrabold flex-1 text-center">
                                {t("schedule.booked")}
                              </span>
                              <button
                                onClick={() => unbook(s)}
                                disabled={bookingId === s.id}
                                className="w-10 h-10 flex items-center justify-center text-destructive hover:bg-destructive/10 rounded-xl transition-all disabled:opacity-50"
                                title="Desmarcar"
                              >
                                {bookingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              </button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleBookClick(s)}
                              disabled={full || bookingId === s.id}
                              className="w-full h-11 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-extrabold text-xs shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-40"
                            >
                              {bookingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : full ? t("schedule.full") : "Agendar aula"}
                            </Button>
                          )}
                        </div>
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

