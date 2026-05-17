import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Trash2, UserPlus, Search } from "lucide-react";

type AdminRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
};

export default function AdminAccess() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [granting, setGranting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (error) {
      toast.error("Erro ao carregar admins: " + error.message);
      setLoading(false);
      return;
    }

    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      setAdmins([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ids);

    setAdmins(
      ids.map((id) => {
        const p = profiles?.find((x) => x.id === id);
        return {
          user_id: id,
          email: p?.email ?? null,
          full_name: p?.full_name ?? null,
        };
      }),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = email.trim().toLowerCase();
    if (!target) return;
    setGranting(true);

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", target)
      .maybeSingle();

    if (pErr || !profile) {
      toast.error("Nenhuma conta encontrada com esse e-mail. O usuário precisa ter feito login pelo menos uma vez.");
      setGranting(false);
      return;
    }

    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: profile.id, role: "admin" });

    setGranting(false);

    if (insErr) {
      if (insErr.code === "23505") {
        toast.info("Esta conta já é admin.");
      } else {
        toast.error("Erro ao conceder admin: " + insErr.message);
      }
      return;
    }

    toast.success(`${profile.email} agora é admin.`);
    setEmail("");
    load();
  };

  const handleRevoke = async (row: AdminRow) => {
    if (row.user_id === user?.id) {
      toast.error("Você não pode remover seu próprio acesso de admin.");
      return;
    }
    if (!confirm(`Remover acesso de admin de ${row.email ?? row.user_id}?`)) return;

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", row.user_id)
      .eq("role", "admin");

    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }
    toast.success("Acesso de admin removido.");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" /> Administradores
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conceda ou remova poder de admin de outras contas.
        </p>
      </div>

      <form onSubmit={handleGrant} className="glass-strong rounded-2xl p-4 md:p-5 space-y-3">
        <label className="text-xs uppercase tracking-widest text-primary/80 font-semibold">
          Conceder admin
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="bg-input/60 border-0 h-11 rounded-xl pl-9"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={granting}
            className="h-11 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
          >
            {granting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="inline-flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Conceder
              </span>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          O usuário precisa já ter uma conta cadastrada (ter feito login ao menos uma vez).
        </p>
      </form>

      <div className="glass-strong rounded-2xl p-4 md:p-5">
        <h2 className="text-sm uppercase tracking-widest text-primary/80 font-semibold mb-3">
          Admins atuais ({admins.length})
        </h2>
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
          </div>
        ) : admins.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhum admin cadastrado.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {admins.map((a) => (
              <li key={a.user_id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {a.full_name || a.email || a.user_id}
                  </div>
                  {a.email && a.full_name && (
                    <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                  )}
                  {a.user_id === user?.id && (
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-widest text-primary">
                      Você
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevoke(a)}
                  disabled={a.user_id === user?.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
