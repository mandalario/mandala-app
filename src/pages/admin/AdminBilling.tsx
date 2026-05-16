import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, KeyRound, DollarSign, Webhook, Copy, ExternalLink, Eye, EyeOff, History, CheckCircle2, Hourglass, XCircle, FileText, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const WEBHOOK_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mp-webhook`;

export default function AdminBilling() {
  const [billingEnabled, setBillingEnabled] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

  const [token, setToken] = useState("");
  const [environment, setEnvironment] = useState("sandbox");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [savingMp, setSavingMp] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: appS }, { data: secrets }] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "billing_enabled").maybeSingle(),
      supabase.from("admin_secrets").select("key, value")
        .in("key", ["mp_access_token", "mp_environment", "mp_webhook_secret"]),
    ]);
    setBillingEnabled((appS?.value ?? "false") === "true");
    const sm: Record<string, string> = {};
    (secrets ?? []).forEach((r: any) => { sm[r.key] = r.value ?? ""; });
    setToken(sm.mp_access_token ?? "");
    setEnvironment(sm.mp_environment || "sandbox");
    setWebhookSecret(sm.mp_webhook_secret ?? "");
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleBilling = async (next: boolean) => {
    if (next && !token.trim()) {
      const ok = confirm("Você ainda não configurou o Mercado Pago. Os alunos não conseguirão pagar até você cadastrar a chave. Ativar mesmo assim?");
      if (!ok) return;
    }
    setSavingToggle(true);
    const { error } = await supabase.from("app_settings")
      .upsert({ key: "billing_enabled", value: next ? "true" : "false" }, { onConflict: "key" });
    setSavingToggle(false);
    if (error) return toast.error(error.message);
    setBillingEnabled(next);
    toast.success(next ? "Modo cobrança ativado" : "Modo cobrança desativado — aulas gratuitas");
  };

  const saveMp = async () => {
    setSavingMp(true);
    const rows = [
      { key: "mp_access_token", value: token.trim() || null },
      { key: "mp_environment", value: environment },
      { key: "mp_webhook_secret", value: webhookSecret.trim() || null },
    ];
    const { error } = await supabase.from("admin_secrets").upsert(rows, { onConflict: "key" });
    setSavingMp(false);
    if (error) return toast.error(error.message);
    toast.success("Credenciais salvas");
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    toast.success("URL copiada");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary/80">Financeiro</p>
        <h1 className="text-3xl font-bold">Cobrança</h1>
      </div>

      {/* Master toggle */}
      <div className="glass-strong rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <DollarSign className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-bold">Modo cobrança</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Quando ativado, alunos precisam comprar créditos via Pix para agendar aulas. Quando desativado, agendamento é livre.
              </div>
            </div>
            {loading ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : (
              <Switch checked={billingEnabled} onCheckedChange={toggleBilling} disabled={savingToggle} />
            )}
          </div>
          <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${billingEnabled ? "bg-success/10 text-success" : "bg-muted/40 text-muted-foreground"}`}>
            {billingEnabled ? "Cobrança ativa — alunos veem pacotes e pagam Pix automático." : "Cobrança desativada — aulas 100% gratuitas, créditos e pacotes ocultos."}
          </div>
        </div>
      </div>

      {/* MP credentials */}
      <div className="glass-strong rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-primary/80">Integração</div>
            <div className="font-bold">Mercado Pago</div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Crie um <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 underline">aplicativo no Mercado Pago <ExternalLink className="w-3 h-3" /></a> e cole abaixo o <strong>Access Token</strong>. Use sandbox para testar e produção para receber de verdade.
        </p>

        <div>
          <Label>Ambiente</Label>
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox (teste)</SelectItem>
              <SelectItem value="production">Produção (real)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Access Token</Label>
          <div className="relative mt-1">
            <Input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="APP_USR-... ou TEST-..."
              className="bg-input/60 border-0 h-11 rounded-xl pr-12 font-mono text-sm"
            />
            <button type="button" onClick={() => setShowToken(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground">
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <Label>Webhook Secret <span className="text-muted-foreground font-normal">(opcional, para validar assinatura)</span></Label>
          <div className="relative mt-1">
            <Input
              type={showSecret ? "text" : "password"}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="Cole o secret gerado ao configurar a Notificação"
              className="bg-input/60 border-0 h-11 rounded-xl pr-12 font-mono text-sm"
            />
            <button type="button" onClick={() => setShowSecret(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground">
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button onClick={saveMp} disabled={savingMp} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent">
          {savingMp ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar credenciais</>}
        </Button>
      </div>

      {/* Webhook URL */}
      <div className="glass-strong rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
            <Webhook className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-primary/80">Notificação automática</div>
            <div className="font-bold">URL do Webhook</div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          No painel Mercado Pago → Notificações (webhooks) → adicione a URL abaixo e marque o evento <strong>Pagamentos</strong>. Isso permite confirmar pagamentos automaticamente.
        </p>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/40">
          <code className="flex-1 text-xs break-all font-mono">{WEBHOOK_URL}</code>
          <button onClick={copyWebhook} className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Histórico */}
      <PaymentsHistory />
    </div>
  );
}

type Pay = {
  id: string;
  user_id: string;
  credits: number;
  amount_cents: number;
  status: "pending" | "approved" | "rejected";
  provider: string;
  mp_payment_id: string | null;
  mp_status_detail: string | null;
  created_at: string;
  reviewed_at: string | null;
  profiles?: { full_name: string | null; email: string } | null;
};

const fmt = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

function PaymentsHistory() {
  const [list, setList] = useState<Pay[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("payments")
      .select("id, user_id, credits, amount_cents, status, provider, mp_payment_id, mp_status_detail, created_at, reviewed_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    const rows = (data ?? []) as any[];
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const pmap: Record<string, { full_name: string | null; email: string }> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      (profs ?? []).forEach((p: any) => { pmap[p.id] = { full_name: p.full_name, email: p.email }; });
    }
    setList(rows.map((r) => ({ ...r, profiles: pmap[r.user_id] ?? null })));
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-payments-history")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = list.reduce(
    (acc, p) => {
      acc.count++;
      if (p.status === "approved") { acc.approved++; acc.totalApproved += p.amount_cents; }
      if (p.status === "pending") acc.pending++;
      if (p.status === "rejected") acc.rejected++;
      return acc;
    },
    { count: 0, approved: 0, pending: 0, rejected: 0, totalApproved: 0 },
  );

  return (
    <div className="glass-strong rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <History className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-primary/80">Pagamentos</div>
          <div className="font-bold">Histórico</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Total" value={String(summary.count)} />
        <Stat label="Aprovados" value={String(summary.approved)} accent="success" />
        <Stat label="Pendentes" value={String(summary.pending)} accent="warning" />
        <Stat label="Recebido" value={fmt(summary.totalApproved)} accent="primary" />
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/40 w-fit">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : "Rejeitados"}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : list.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Nenhum pagamento ainda.</div>
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <div key={p.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <StatusIcon status={p.status} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {p.profiles?.full_name ?? p.profiles?.email ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {p.credits} créd. · {fmt(p.amount_cents)} · {new Date(p.created_at).toLocaleString("pt-BR")}
                </div>
                {p.mp_status_detail && p.status !== "approved" && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">{p.mp_status_detail}</div>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted/40 text-muted-foreground shrink-0">
                {p.provider === "mercado_pago" ? "MP" : "Manual"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Webhook logs (collapsible) */}
      <WebhookLogs />
    </div>
  );
}

function WebhookLogs() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("webhook_logs")
      .select("id, mp_payment_id, event_type, http_status, result_status, message, created_at")
      .eq("source", "mp-webhook")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    load();
    const channel = supabase
      .channel("webhook-logs-watch")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "webhook_logs" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open]);

  const dotColor = (status: string | null, http: number) => {
    if (status === "approved") return "bg-success";
    if (status === "rejected") return "bg-destructive";
    if (status === "error" || http >= 400) return "bg-destructive";
    if (status === "ignored") return "bg-muted-foreground";
    return "bg-warning";
  };

  return (
    <div className="border-t border-white/5 pt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold">Logs do Webhook</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">mp-webhook</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Últimas 50 chamadas recebidas pelo webhook do Mercado Pago.</p>
            <button onClick={load} className="w-8 h-8 rounded-lg bg-secondary/40 hover:bg-secondary/60 flex items-center justify-center" title="Atualizar">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading && logs.length === 0 ? (
            <div className="py-6 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
          ) : logs.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Nenhuma chamada registrada ainda. Quando o Mercado Pago notificar o webhook, ela aparecerá aqui.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="glass rounded-lg p-2.5 flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotColor(l.result_status, l.http_status)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">
                        {new Date(l.created_at).toLocaleString("pt-BR")}
                      </span>
                      <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">
                        HTTP {l.http_status}
                      </span>
                      {l.result_status && (
                        <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {l.result_status}
                        </span>
                      )}
                      {l.mp_payment_id && (
                        <span className="text-[10px] font-mono text-muted-foreground truncate">#{l.mp_payment_id}</span>
                      )}
                    </div>
                    {l.message && (
                      <div className="text-xs mt-1 break-words">{l.message}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "approved") return <div className="w-9 h-9 rounded-xl bg-success/15 text-success flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4" /></div>;
  if (status === "rejected") return <div className="w-9 h-9 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0"><XCircle className="w-4 h-4" /></div>;
  return <div className="w-9 h-9 rounded-xl bg-warning/15 text-warning flex items-center justify-center shrink-0"><Hourglass className="w-4 h-4" /></div>;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "success" | "warning" | "primary" }) {
  const color = accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : accent === "primary" ? "text-primary" : "text-foreground";
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`text-base font-bold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}
