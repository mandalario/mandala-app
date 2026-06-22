import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Users, CheckCircle2, Hourglass, TrendingUp, DollarSign, CalendarDays, ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRollingWeekBounds, ymdToLocalNoon } from "@/lib/rollingWeek";
import { getScheduleNowParts } from "@/lib/slotSchedule";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

const TYPE_LABELS: Record<string, string> = {
  avulsa_grupo: "Grupo",
  avulsa_particular: "Particular",
  aluguel: "Aluguel",
};
const TYPE_COLORS: Record<string, string> = {
  avulsa_grupo: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  avulsa_particular: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  aluguel: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

type ClassBooking = {
  id: string;
  user_id: string;
  class_slots: { start_time: string; location: string | null; date: string; class_type: string } | null;
  profiles: { full_name: string | null } | null;
};

type PendingProfile = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  age: number | null;
  surf_level: string | null;
  can_swim: boolean | null;
  created_at: string;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, payPending: 0, todayClasses: 0, monthRevenue: 0 });
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [weekClasses, setWeekClasses] = useState<ClassBooking[]>([]);
  const [series, setSeries] = useState<{ date: string; count: number }[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [weekBounds, setWeekBounds] = useState({ start: new Date(), end: new Date() });

  const load = useCallback(async () => {
    const now = new Date();
    const {
      startYmd: todayStr,
      startYmd: chartWeekStartStr,
      endYmd: chartWeekEndStr,
      dates: chartDates,
      start: chartStart,
      end: chartEnd,
    } = getRollingWeekBounds(now);
    const monthStart = new Date(); monthStart.setDate(1);
    const monthStartStr = ymd(monthStart);

    const [
      { count: total },
      { count: approved },
      { count: pending },
      { count: payPending },
      { data: weekSlots },
      monthPay,
      { data: weekBookings },
      { data: pendingData },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("approval_status", "approved").eq("profile_completed", true),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("approval_status", "pending").eq("profile_completed", true),
      supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("class_slots").select("id, start_time, location, date, class_type").gte("date", chartWeekStartStr).lte("date", chartWeekEndStr),
      supabase.from("payments").select("amount_cents").eq("status", "approved").gte("created_at", monthStartStr),
      supabase.from("bookings").select("slot_id, class_slots!inner(date)").eq("status", "confirmed").gte("class_slots.date", chartWeekStartStr).lte("class_slots.date", chartWeekEndStr),
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, age, surf_level, can_swim, created_at")
        .eq("approval_status", "pending")
        .eq("profile_completed", true)
        .order("created_at", { ascending: false }),
    ]);

      const slotById = Object.fromEntries((weekSlots ?? []).map((s) => [s.id, s]));
      const weekSlotIds = Object.keys(slotById);

      let weekBookingsList: { id: string; user_id: string; slot_id: string }[] = [];
      if (weekSlotIds.length > 0) {
        const { data: bk } = await supabase
          .from("bookings")
          .select("id, user_id, slot_id")
          .eq("status", "confirmed")
          .in("slot_id", weekSlotIds);
        weekBookingsList = bk ?? [];
      }

      const userIds = [...new Set(weekBookingsList.map((b) => b.user_id))];
      const nameMap: Record<string, string | null> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        (profs ?? []).forEach((p) => { nameMap[p.id] = p.full_name; });
      }
      const weekWithNames: ClassBooking[] = weekBookingsList
        .map((b) => {
          const slot = slotById[b.slot_id];
          if (!slot) return null;
          return {
            id: b.id,
            user_id: b.user_id,
            class_slots: {
              start_time: slot.start_time,
              location: slot.location,
              date: slot.date,
              class_type: slot.class_type ?? "avulsa_grupo",
            },
            profiles: { full_name: nameMap[b.user_id] ?? null },
          };
        })
        .filter((b): b is ClassBooking => b !== null)
        .sort((a, b) => {
          const dateCmp = (a.class_slots?.date ?? "").localeCompare(b.class_slots?.date ?? "");
          if (dateCmp !== 0) return dateCmp;
          return (a.class_slots?.start_time ?? "").localeCompare(b.class_slots?.start_time ?? "");
        });

      const todayWithNames = weekWithNames.filter((b) => b.class_slots?.date === todayStr);

      const monthRevenue = (monthPay.data ?? []).reduce((s: number, p: any) => s + (p.amount_cents ?? 0), 0);

      const days: Record<string, number> = Object.fromEntries(chartDates.map((date) => [date, 0]));
      (weekBookings ?? []).forEach((r) => {
        const d = (r as { class_slots: { date: string } | null }).class_slots?.date;
        if (d && d in days) days[d]++;
      });
      setSeries(Object.entries(days).map(([date, count]) => ({ date, count })));
      setWeekClasses(weekWithNames);
      setWeekBounds({ start: chartStart, end: chartEnd });
      setStats({
        total: total ?? 0, approved: approved ?? 0, pending: pending ?? 0,
        payPending: payPending ?? 0, todayClasses: todayWithNames.length, monthRevenue,
      });
      setPendingProfiles((pendingData ?? []) as PendingProfile[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-dashboard-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("profiles").update({ approval_status: status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "approved" ? "Aluno aprovado" : "Aluno rejeitado");
    load();
  };

  const max = Math.max(1, ...series.map((s) => s.count));

  const selectedStr = ymd(selectedDate);
  const dayClasses = useMemo(
    () => weekClasses.filter((b) => b.class_slots?.date === selectedStr),
    [weekClasses, selectedStr],
  );

  const atWeekStart = ymd(selectedDate) <= ymd(weekBounds.start);
  const atWeekEnd = ymd(selectedDate) >= ymd(weekBounds.end);
  const todayYmd = getScheduleNowParts().date;
  const isToday = ymd(selectedDate) === todayYmd;

  const dayLabel = isToday
    ? "Hoje"
    : format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary/80">Visão geral</p>
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Stat icon={<Users className="w-4 h-4" />} label="Alunos" value={stats.total} accent="primary" />
        <Stat icon={<CheckCircle2 className="w-4 h-4" />} label="Ativos" value={stats.approved} accent="success" />
        <Stat icon={<Hourglass className="w-4 h-4" />} label="Pendentes" value={stats.pending} accent="warning" linkTo="/admin/students" />
        <Stat icon={<DollarSign className="w-4 h-4" />} label="Pgto. pendente" value={stats.payPending} accent="warning" linkTo="/admin/billing" />
        <Stat icon={<CalendarDays className="w-4 h-4" />} label="Aulas hoje" value={stats.todayClasses} accent="accent" />
        <Stat icon={<TrendingUp className="w-4 h-4" />} label="Mês (R$)" value={(stats.monthRevenue / 100).toFixed(0)} accent="primary" />
      </section>

      {pendingProfiles.length > 0 && (
        <section className="glass-strong rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Solicitações de cadastro</h2>
              <p className="text-sm text-muted-foreground">{pendingProfiles.length} aguardando aprovação</p>
            </div>
            <Link to="/admin/students" className="text-xs text-primary hover:underline shrink-0">
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {pendingProfiles.slice(0, 5).map((p) => (
              <div key={p.id} className="rounded-2xl bg-secondary/30 p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{p.full_name ?? "Sem nome"}</h3>
                    {p.surf_level && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                        {p.surf_level}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{p.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.phone ?? "sem tel"} · {p.age ?? "?"} anos
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to={`/admin/students?student=${p.id}`}>Ver ficha</Link>
                  </Button>
                  <Button
                    onClick={() => decide(p.id, "rejected")}
                    variant="ghost"
                    className="rounded-xl text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Rejeitar
                  </Button>
                  <Button
                    onClick={() => decide(p.id, "approved")}
                    className="rounded-xl bg-success text-success-foreground hover:opacity-90"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Aprovar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-strong rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Agendamentos · 7 dias</h2>
            <span className="text-xs text-muted-foreground">{series.reduce((s, x) => s + x.count, 0)} no total</span>
          </div>
          <div className="flex gap-3 h-40">
            {series.map((s) => {
              const barPct = max > 0 ? (s.count / max) * 100 : 0;
              const isSelected = selectedStr === s.date;
              return (
                <button
                  key={s.date}
                  type="button"
                  onClick={() => setSelectedDate(ymdToLocalNoon(s.date))}
                  className={cn(
                    "flex-1 h-full flex flex-col items-center gap-2 min-w-0 rounded-xl transition-colors cursor-pointer",
                    "hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                    isSelected && "bg-primary/10 ring-1 ring-primary/30",
                  )}
                  aria-pressed={isSelected}
                  aria-label={`${s.count} agendamento(s) em ${format(ymdToLocalNoon(s.date), "EEEE", { locale: ptBR })}`}
                >
                  <div className="flex-1 w-full flex flex-col justify-end min-h-0 px-1">
                    <div
                      className={cn(
                        "w-full rounded-t-lg bg-gradient-to-t transition-all duration-300",
                        isSelected ? "from-primary to-accent" : "from-primary/60 to-accent",
                      )}
                      style={{ height: s.count > 0 ? `${barPct}%` : 0, minHeight: s.count > 0 ? 4 : 0 }}
                    />
                  </div>
                  <div className={cn("text-[10px] shrink-0 capitalize", isSelected ? "text-primary font-semibold" : "text-muted-foreground")}>
                    {ymdToLocalNoon(s.date).toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-bold">Agenda</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={atWeekStart}
                onClick={() => setSelectedDate((d) => addDays(d, -1))}
                aria-label="Dia anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium capitalize min-w-[7rem] text-center">{dayLabel}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={atWeekEnd}
                onClick={() => setSelectedDate((d) => addDays(d, 1))}
                aria-label="Próximo dia"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {dayClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aula agendada neste dia.</p>
          ) : (
            <div className="space-y-2 flex-1 overflow-y-auto max-h-64">
              {dayClasses.map((b) => {
                const classType = (b.class_slots?.class_type ?? "avulsa_grupo") in TYPE_LABELS
                  ? b.class_slots!.class_type
                  : "avulsa_grupo";
                return (
                  <div key={b.id} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
                    <div className="w-12 shrink-0 text-center">
                      <div className="text-sm font-bold text-primary">{b.class_slots?.start_time.slice(0, 5)}</div>
                    </div>
                    <div className="w-px self-stretch bg-border/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${TYPE_COLORS[classType]}`}>
                          {TYPE_LABELS[classType]}
                        </span>
                      </div>
                      <div className="text-sm font-semibold truncate">{b.profiles?.full_name ?? "Aluno"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-3">
        <Quick to="/admin/students" title="Aprovar alunos" desc={`${stats.pending} pendente(s)`} />
        <Quick to="/admin/billing" title="Validar pagamentos" desc={`${stats.payPending} aguardando`} />
        <Quick to="/admin/schedule" title="Configurar mar e agenda" desc="Defina dias e condições" />
      </section>
    </div>
  );
}

const Stat = ({ icon, label, value, accent, linkTo }: any) => {
  const colorMap: any = {
    primary: "text-primary bg-primary/15",
    success: "text-success bg-success/15",
    warning: "text-warning bg-warning/15",
    accent: "text-accent bg-accent/15",
  };
  const inner = (
    <div className="glass-strong rounded-2xl p-4 hover:bg-secondary/30 transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[accent]}`}>{icon}</div>
      <div className="mt-3"><div className="text-2xl font-bold leading-none">{value}</div><div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1.5">{label}</div></div>
    </div>
  );
  return linkTo ? <Link to={linkTo}>{inner}</Link> : inner;
};

const Quick = ({ to, title, desc }: any) => (
  <Link to={to} className="glass rounded-2xl p-5 hover:bg-secondary/40 transition-colors block">
    <div className="font-semibold">{title}</div>
    <div className="text-sm text-muted-foreground">{desc}</div>
  </Link>
);
