import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  Ticket,
  Calendar,
  ShoppingBag,
  ExternalLink,
  CheckCircle2,
  Hourglass,
  XCircle,
  Waves,
} from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { openWebWithCurrentAuth } from "@/lib/platform";

type Pay = {
  id: string;
  credits: number;
  amount_cents: number;
  status: string;
  created_at: string;
  admin_notes: string | null;
};

const fmt = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

export default function BuyClasses() {
  const { profile } = useAuth();
  const { t, language } = useTranslation();
  const localeMap: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };
  const locale = localeMap[language] ?? "en-US";
  const [payments, setPayments] = useState<Pay[]>([]);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const totalCredits =
    (profile?.credits_grupo ?? 0) +
      (profile?.credits_particular ?? 0) +
      (profile?.credits_aluguel ?? 0) >
    0
      ? (profile?.credits_grupo ?? 0) +
        (profile?.credits_particular ?? 0) +
        (profile?.credits_aluguel ?? 0)
      : profile?.credits ?? 0;

  const handleOpenWebCheckout = async () => {
    setRedirecting(true);
    try {
      await openWebWithCurrentAuth("/packages");
    } finally {
      setTimeout(() => setRedirecting(false), 2000);
    }
  };

  useEffect(() => {
    async function load() {
      const { data: pay } = await supabase
        .from("payments")
        .select("id, credits, amount_cents, status, created_at, admin_notes")
        .order("created_at", { ascending: false })
        .limit(10);
      setPayments((pay ?? []) as Pay[]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="relative min-h-screen pb-28">
      <OceanBackground />
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link
          to="/"
          className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80">Aulas Práticas</p>
          <h1 className="text-2xl font-bold">Aulas Presenciais</h1>
        </div>
      </header>

      {loading ? (
        <div className="px-5">
          <div className="glass rounded-2xl p-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
          </div>
        </div>
      ) : (
        <div className="px-5 space-y-6">
          {/* Card de Saldo Atual de Aulas */}
          <div className="glass-strong rounded-[32px] p-6 border border-white/10 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-36 h-36 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Ticket className="w-4 h-4" />
              </div>
              <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Saldo Atual
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-black text-gradient">{totalCredits}</span>
              <span className="text-sm font-semibold text-muted-foreground">
                {totalCredits === 1 ? "aula disponível" : "aulas disponíveis"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
              <div className="glass rounded-2xl p-3 text-center">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Grupo</div>
                <div className="text-base font-black text-primary">{profile?.credits_grupo ?? 0}</div>
              </div>
              <div className="glass rounded-2xl p-3 text-center">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Particular</div>
                <div className="text-base font-black text-accent">{profile?.credits_particular ?? 0}</div>
              </div>
              <div className="glass rounded-2xl p-3 text-center">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Aluguel</div>
                <div className="text-base font-black text-white">{profile?.credits_aluguel ?? 0}</div>
              </div>
            </div>

            <div className="mt-5">
              <Link to="/schedule">
                <Button className="w-full h-11 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-xs shadow-lg shadow-primary/20 hover:shadow-primary/40 flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Ver Agenda e Reservar Aula
                </Button>
              </Link>
            </div>
          </div>

          {/* Card Institucional de Acesso ao Site */}
          <div className="glass-strong rounded-[28px] p-6 border border-primary/30 space-y-4 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 text-primary flex items-center justify-center shadow-md shadow-primary/20">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Aulas de Surf na Praia</h3>
                <p className="text-xs text-muted-foreground">Praia da Macumba, Rio de Janeiro</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground/90 leading-relaxed">
              As aulas práticas de surf acontecem presencialmente na Praia da Macumba, Rio de Janeiro. Para consultar a programação completa, novidades e pacotes de aulas, acesse a plataforma oficial da escola.
            </p>

            <Button
              onClick={handleOpenWebCheckout}
              disabled={redirecting}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground font-bold text-xs shadow-lg shadow-primary/30 hover:shadow-primary/50 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {redirecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Abrindo mandalario.app...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Acessar aulas no site oficial
                </>
              )}
            </Button>
          </div>

          {/* Histórico de Aulas e Atividades */}
          {payments.length > 0 && (
            <section className="mt-6">
              <h2 className="text-sm uppercase tracking-widest text-primary/80 mb-3">Histórico de Aulas</h2>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                    <StatusIcon status={p.status} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">
                        {p.credits} {t("packages.creditsLabel")} · {fmt(p.amount_cents)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleString(locale)}
                      </div>
                      {p.admin_notes && <div className="text-xs text-warning mt-1">{p.admin_notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "approved")
    return (
      <div className="w-9 h-9 rounded-xl bg-success/15 text-success flex items-center justify-center">
        <CheckCircle2 className="w-4 h-4" />
      </div>
    );
  if (status === "rejected")
    return (
      <div className="w-9 h-9 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center">
        <XCircle className="w-4 h-4" />
      </div>
    );
  return (
    <div className="w-9 h-9 rounded-xl bg-warning/15 text-warning flex items-center justify-center">
      <Hourglass className="w-4 h-4" />
    </div>
  );
}
