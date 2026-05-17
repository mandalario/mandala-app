import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Loader2, QrCode, Copy, CheckCircle2, Hourglass, XCircle, AlertCircle, RefreshCw, Sparkles, Apple } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { useBillingEnabled } from "@/hooks/useBillingEnabled";

type Pkg = { id: string; name: string; description: string | null; credits: number; price_cents: number };
type Pay = { id: string; credits: number; amount_cents: number; status: string; created_at: string; admin_notes: string | null };

const fmt = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;

export default function Packages() {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const billingEnabled = useBillingEnabled();
  const navigate = useNavigate();
  const localeMap: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };
  const locale = localeMap[language] ?? "en-US";
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [payments, setPayments] = useState<Pay[]>([]);
  const [selected, setSelected] = useState<Pkg | null>(null);
  const [loading, setLoading] = useState(true);


  const load = async () => {
    const [{ data: p }, { data: pay }] = await Promise.all([
      supabase.from("credit_packages").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("payments").select("id, credits, amount_cents, status, created_at, admin_notes").order("created_at", { ascending: false }).limit(10),
    ]);
    setPkgs((p ?? []) as Pkg[]);
    setPayments((pay ?? []) as Pay[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (billingEnabled === null) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <OceanBackground />
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-24">
      <OceanBackground />
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link to="/" className="w-10 h-10 rounded-full glass flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80">{t("packages.eyebrow")}</p>
          <h1 className="text-2xl font-bold">{t("packages.title")}</h1>
        </div>
      </header>

      {loading ? (
        <div className="px-5"><div className="glass rounded-2xl p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div></div>
      ) : selected ? (
        <PixCheckout pkg={selected} onBack={() => { setSelected(null); load(); }} t={t} />
      ) : (
        <>
          <section className="px-5 space-y-3">
            {pkgs.map((p) => {
              const nameKey = `packages.catalog.${p.name}.name`;
              const descKey = `packages.catalog.${p.name}.description`;
              const tn = t(nameKey);
              const dn = tn === nameKey ? p.name : tn;
              const td = p.description ? t(descKey) : "";
              const dd = !p.description ? "" : td === descKey ? p.description : td;
              return (
                <button key={p.id} onClick={() => setSelected(p)} className="w-full text-left glass-strong rounded-2xl p-5 hover:bg-secondary/30 transition-colors active:scale-[0.99]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-primary/80">{p.credits} {t("packages.creditsLabel")}</div>
                      <div className="font-bold text-lg mt-0.5">{dn}</div>
                      {dd && <div className="text-sm text-muted-foreground mt-1">{dd}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gradient">{fmt(p.price_cents)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{fmt(Math.round(p.price_cents / p.credits))}{t("packages.perClass")}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </section>

          <section className="px-5 mt-8">
            <h2 className="text-sm uppercase tracking-widest text-primary/80 mb-3">{t("packages.history")}</h2>
            {payments.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">{t("packages.noPayments")}</div>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                    <StatusIcon status={p.status} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{p.credits} {t("packages.creditsLabel")} · {fmt(p.amount_cents)}</div>
                      <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString(locale)}</div>
                      {p.admin_notes && <div className="text-xs text-warning mt-1">{p.admin_notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "approved") return <div className="w-9 h-9 rounded-xl bg-success/15 text-success flex items-center justify-center"><CheckCircle2 className="w-4 h-4" /></div>;
  if (status === "rejected") return <div className="w-9 h-9 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center"><XCircle className="w-4 h-4" /></div>;
  return <div className="w-9 h-9 rounded-xl bg-warning/15 text-warning flex items-center justify-center"><Hourglass className="w-4 h-4" /></div>;
}

function PixCheckout({ pkg, onBack, t }: { pkg: Pkg; onBack: () => void; t: (k: string, v?: any) => string }) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<{ paymentId: string; qrCode: string | null; qrCodeBase64: string | null } | null>(null);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [applePayLoading, setApplePayLoading] = useState(false);
  const pollRef = useRef<number | null>(null);

  const hasNativeBridge = typeof window !== "undefined" && !!(window as any).ReactNativeWebView;

  const nameKey = `packages.catalog.${pkg.name}.name`;
  const tn = t(nameKey);
  const displayName = tn === nameKey ? pkg.name : tn;

  const create = async () => {
    setCreating(true);
    setError(null);
    const { data, error: fnErr } = await supabase.functions.invoke("mp-create-pix", {
      body: { package_id: pkg.id },
    });
    setCreating(false);
    if (fnErr) {
      setError(fnErr.message || "Erro ao gerar Pix");
      return;
    }
    if ((data as any)?.error) {
      setError((data as any).error);
      return;
    }
    setPix({
      paymentId: (data as any).payment_id,
      qrCode: (data as any).qr_code,
      qrCodeBase64: (data as any).qr_code_base64,
    });
  };

  // Apple Pay via bridge nativa (Expo/React Native WebView)
  const startApplePay = () => {
    const bridge = (window as any).ReactNativeWebView;
    if (!bridge) {
      toast.error("Apple Pay disponível apenas no app");
      return;
    }
    setApplePayLoading(true);
    setError(null);

    const requestId = crypto.randomUUID();
    const handler = async (ev: MessageEvent) => {
      let payload: any = ev.data;
      try { if (typeof payload === "string") payload = JSON.parse(payload); } catch { /* noop */ }
      if (!payload || payload.type !== "APPLE_PAY_RESULT" || payload.requestId !== requestId) return;

      window.removeEventListener("message", handler);
      document.removeEventListener("message", handler as any);

      if (!payload.success || !payload.mp_token) {
        setApplePayLoading(false);
        if (payload.cancelled) return; // user cancelou, sem alarde
        setError(payload.error || "Apple Pay falhou");
        return;
      }

      const { data, error: fnErr } = await supabase.functions.invoke("mp-charge-applepay", {
        body: {
          package_id: pkg.id,
          mp_token: payload.mp_token,
          installments: payload.installments ?? 1,
          payment_method_id: payload.payment_method_id ?? "apple_pay",
          issuer_id: payload.issuer_id,
        },
      });
      setApplePayLoading(false);

      if (fnErr || (data as any)?.error) {
        setError(fnErr?.message || (data as any)?.error || "Erro ao processar Apple Pay");
        return;
      }
      setPix({ paymentId: (data as any).payment_id, qrCode: null, qrCodeBase64: null });
      const st = (data as any).status;
      if (st === "approved" || st === "rejected") setStatus(st);
    };
    window.addEventListener("message", handler);
    // Android RN WebView entrega via document
    document.addEventListener("message", handler as any);

    bridge.postMessage(JSON.stringify({
      type: "APPLE_PAY_REQUEST",
      requestId,
      package_id: pkg.id,
      amount_cents: pkg.price_cents,
      currency: "BRL",
      description: `${pkg.credits} crédito(s) - ${pkg.name}`,
    }));
  };


  useEffect(() => { create(); /* eslint-disable-next-line */ }, []);

  // Poll status
  useEffect(() => {
    if (!pix?.paymentId || status !== "pending") return;
    const tick = async () => {
      const { data: row } = await supabase.from("payments").select("status").eq("id", pix.paymentId).maybeSingle();
      if (row?.status === "approved" || row?.status === "rejected") {
        setStatus(row.status as any);
        return;
      }
      // Ask edge function to refresh from MP
      await supabase.functions.invoke("mp-payment-status", { body: { payment_id: pix.paymentId } });
    };
    tick();
    pollRef.current = window.setInterval(tick, 5000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [pix?.paymentId, status]);

  const copy = () => {
    if (!pix?.qrCode) return;
    navigator.clipboard.writeText(pix.qrCode);
    toast.success(t("packages.pixCopied"));
  };

  return (
    <section className="px-5 space-y-4">
      <div className="glass-strong rounded-2xl p-5">
        <div className="text-xs uppercase tracking-widest text-primary/80">{t("packages.selected")}</div>
        <div className="flex items-end justify-between mt-1">
          <div className="font-bold text-lg">{displayName}</div>
          <div className="text-2xl font-bold text-gradient">{fmt(pkg.price_cents)}</div>
        </div>
      </div>

      {hasNativeBridge && status === "pending" && !applePayLoading && (
        <button
          onClick={startApplePay}
          disabled={creating}
          className="w-full h-12 rounded-xl bg-foreground text-background font-semibold flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
        >
          <Apple className="w-5 h-5" /> Pay
        </button>
      )}

      {applePayLoading && (
        <div className="glass-strong rounded-2xl p-6 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Processando Apple Pay...</p>
        </div>
      )}

      {creating && (
        <div className="glass-strong rounded-2xl p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Gerando Pix...</p>
        </div>
      )}

      {error && !creating && (
        <div className="glass-strong rounded-2xl p-5 space-y-3">
          <div className="text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <Button onClick={create} className="w-full h-11 rounded-xl"><RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente</Button>
          <Button variant="ghost" onClick={onBack} className="w-full h-11 rounded-xl">Voltar</Button>
        </div>
      )}

      {pix && status === "pending" && !error && (
        <>
          <div className="glass-strong rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <QrCode className="w-4 h-4" /><span className="text-xs uppercase tracking-widest">Pix</span>
            </div>

            {pix.qrCodeBase64 ? (
              <div className="bg-white rounded-xl p-4 flex justify-center">
                <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix" className="w-56 h-56" />
              </div>
            ) : null}

            {pix.qrCode && (
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Pix Copia e Cola</div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/40">
                  <code className="flex-1 text-xs break-all font-mono">{pix.qrCode}</code>
                  <button onClick={copy} className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0"><Copy className="w-4 h-4" /></button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Aguardando confirmação do pagamento...
            </div>
          </div>

          <Button variant="ghost" onClick={onBack} className="w-full h-11 rounded-xl">Voltar para pacotes</Button>
        </>
      )}

      {status === "approved" && (
        <div className="glass-strong rounded-2xl p-8 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-success/20 text-success flex items-center justify-center">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="font-bold text-lg">Pagamento confirmado!</div>
          <div className="text-sm text-muted-foreground">+{pkg.credits} crédito(s) liberados na sua conta.</div>
          <Button onClick={onBack} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent">Continuar</Button>
        </div>
      )}

      {status === "rejected" && (
        <div className="glass-strong rounded-2xl p-8 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 text-destructive flex items-center justify-center">
            <XCircle className="w-7 h-7" />
          </div>
          <div className="font-bold text-lg">Pagamento não confirmado</div>
          <div className="text-sm text-muted-foreground">Tente novamente ou escolha outro pacote.</div>
          <Button onClick={onBack} className="w-full h-11 rounded-xl">Voltar</Button>
        </div>
      )}
    </section>
  );
}
