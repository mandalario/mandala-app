import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, CheckCircle2, Hourglass, TrendingUp, DollarSign, CalendarDays } from "lucide-react";

type TodayBooking = { id: string; user_id: string; class_slots: { start_time: string; location: string | null } | null; profiles: { full_name: string | null } | null };

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, payPending: 0, todayClasses: 0, monthRevenue: 0 });
  const [today, setToday] = useState<TodayBooking[]>([]);
  const [series, setSeries] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    (async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const monthStart = new Date(); monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().slice(0, 10);

      const [{ count: total }, { count: approved }, { count: pending }, { count: payPending }, todayBk, monthPay, last7] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("approval_status", "approved"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("approval_status", "pending").eq("profile_completed", true),
        supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bookings").select("id, user_id, class_slots!inner(start_time, location, date)").eq("status", "confirmed").eq("class_slots.date", todayStr),
        supabase.from("payments").select("amount_cents").eq("status", "approved").gte("created_at", monthStartStr),
        supabase.from("bookings").select("created_at").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      // Buscar nomes dos alunos das aulas de hoje
      const todayBookings = (todayBk.data ?? []) as any[];
      const userIds = [...new Set(todayBookings.map((b) => b.user_id))];
      let nameMap: Record<string, string | null> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        (profs ?? []).forEach((p: any) => { nameMap[p.id] = p.full_name; });
      }
      const todayWithNames: TodayBooking[] = todayBookings.map((b) => ({
        id: b.id, user_id: b.user_id, class_slots: b.class_slots,
        profiles: { full_name: nameMap[b.user_id] ?? null },
      }));

      const monthRevenue = (monthPay.data ?? []).reduce((s: number, p: any) => s + (p.amount_cents ?? 0), 0);

      // série últimos 7 dias
      const days: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        days[d] = 0;
      }
      (last7.data ?? []).forEach((r: any) => {
        const d = new Date(r.created_at).toISOString().slice(0, 10);
        if (d in days) days[d]++;
      });
      setSeries(Object.entries(days).map(([date, count]) => ({ date, count })));
      setToday(todayWithNames);
      setStats({
        total: total ?? 0, approved: approved ?? 0, pending: pending ?? 0,
        payPending: payPending ?? 0, todayClasses: todayWithNames.length, monthRevenue,
      });
    })();
  }, []);

  const max = Math.max(1, ...series.map((s) => s.count));

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

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-strong rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Agendamentos · 7 dias</h2>
            <span className="text-xs text-muted-foreground">{series.reduce((s, x) => s + x.count, 0)} no total</span>
          </div>
          <div className="flex items-end gap-3 h-40">
            {series.map((s) => (
              <div key={s.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-t-lg bg-gradient-to-t from-primary/60 to-accent transition-all"
                  style={{ height: `${(s.count / max) * 100}%`, minHeight: 4 }} />
                <div className="text-[10px] text-muted-foreground">{new Date(s.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-6">
          <h2 className="font-bold mb-4">Aulas de hoje</h2>
          {today.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aula agendada hoje.</p>
          ) : (
            <div className="space-y-2">
              {today.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/30">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-xs font-bold">
                    {b.class_slots?.start_time.slice(0, 5)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{b.profiles?.full_name ?? "Aluno"}</div>
                    <div className="text-xs text-muted-foreground truncate">{b.class_slots?.location ?? "Local a definir"}</div>
                  </div>
                </div>
              ))}
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
