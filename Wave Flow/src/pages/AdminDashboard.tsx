import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Waves, Users, Calendar, DollarSign, TrendingUp, CheckCircle2, XCircle, LogOut, Hourglass } from "lucide-react";

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
  const { profile, signOut } = useAuth();
  const [pending, setPending] = useState<PendingProfile[]>([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: pendingData } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, age, surf_level, can_swim, created_at")
      .eq("approval_status", "pending")
      .eq("profile_completed", true)
      .order("created_at", { ascending: false });

    const { count: totalCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: approvedCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("approval_status", "approved");
    const { count: pendingCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("approval_status", "pending").eq("profile_completed", true);

    setPending((pendingData ?? []) as PendingProfile[]);
    setStats({ total: totalCount ?? 0, approved: approvedCount ?? 0, pending: pendingCount ?? 0 });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("profiles").update({ approval_status: status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(status === "approved" ? "Aluno aprovado" : "Aluno rejeitado");
    load();
  };

  return (
    <div className="relative min-h-screen">
      <OceanBackground />

      {/* Top bar */}
      <header className="px-6 lg:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl glass-strong flex items-center justify-center glow-primary">
            <Waves className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-primary/80">Admin</p>
            <h1 className="text-xl font-bold">{profile?.full_name ?? "Instrutor"}</h1>
          </div>
        </div>
        <Button variant="ghost" onClick={signOut} className="rounded-xl">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </header>

      <main className="px-6 lg:px-10 pb-12 max-w-7xl mx-auto space-y-8">
        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users />} label="Total alunos" value={stats.total} accent="primary" />
          <StatCard icon={<CheckCircle2 />} label="Aprovados" value={stats.approved} accent="success" />
          <StatCard icon={<Hourglass />} label="Pendentes" value={stats.pending} accent="warning" />
          <StatCard icon={<TrendingUp />} label="Aulas hoje" value={0} accent="accent" />
        </section>

        {/* Pending approvals */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Solicitações de cadastro</h2>
            <span className="text-xs text-muted-foreground">{pending.length} pendente(s)</span>
          </div>

          {loading ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Carregando...</div>
          ) : pending.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-success" />
              Nenhuma solicitação pendente.
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <div key={p.id} className="glass-strong rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{p.full_name ?? "Sem nome"}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                        {p.surf_level ?? "—"}
                      </span>
                      {p.can_swim === false && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                          não nada
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{p.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.phone ?? "sem tel"} · {p.age ?? "?"} anos
                    </p>
                  </div>
                  <div className="flex gap-2">
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
          )}
        </section>

        {/* Placeholders for next iterations */}
        <section className="grid lg:grid-cols-2 gap-4">
          <Placeholder icon={<Calendar />} title="Agenda & condições do mar" desc="Configure dias disponíveis e condições. (próxima iteração)" />
          <Placeholder icon={<DollarSign />} title="Créditos & comprovantes Pix" desc="Pacotes, chave Pix e validação de comprovantes. (próxima iteração)" />
        </section>
      </main>
    </div>
  );
}

const StatCard = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: "primary" | "success" | "warning" | "accent" }) => {
  const colorMap = {
    primary: "text-primary bg-primary/15",
    success: "text-success bg-success/15",
    warning: "text-warning bg-warning/15",
    accent: "text-accent bg-accent/15",
  };
  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[accent]}`}>
        {icon}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
};

const Placeholder = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="glass rounded-2xl p-6">
    <div className="w-10 h-10 rounded-xl bg-secondary/60 flex items-center justify-center text-primary mb-3">
      {icon}
    </div>
    <h3 className="font-semibold">{title}</h3>
    <p className="text-sm text-muted-foreground mt-1">{desc}</p>
  </div>
);
