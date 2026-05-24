import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, RotateCcw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type PendingRefundBooking = {
  id: string;
  user_id: string;
  credit_used: string | null;
  updated_at: string;
  profiles: { full_name: string | null; email: string } | null;
  class_slots: { date: string; start_time: string } | null;
};

const CREDIT_LABELS: Record<string, string> = {
  avulsa_grupo: "Grupo",
  avulsa_particular: "Particular",
  aluguel: "Aluguel",
};

type BookingRefundPanelProps = {
  userId?: string;
  compact?: boolean;
  className?: string;
  onRefunded?: () => void;
  alwaysVisible?: boolean;
};

export function BookingRefundPanel({
  userId,
  compact,
  className,
  onRefunded,
  alwaysVisible = false,
}: BookingRefundPanelProps) {
  const [items, setItems] = useState<PendingRefundBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [dialogBooking, setDialogBooking] = useState<PendingRefundBooking | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    let q = supabase
      .from("bookings")
      .select("id, user_id, credit_used, updated_at, slot_id, class_slots(date, start_time)")
      .eq("status", "cancelled")
      .eq("credit_refunded", false)
      .not("credit_used", "is", null)
      .order("updated_at", { ascending: false })
      .limit(userId ? 20 : 50);

    if (userId) q = q.eq("user_id", userId);

    const { data, error } = await q;
    if (error) {
      console.error(error);
      const msg = error.message.includes("credit_refunded")
        ? "Atualize o banco de dados: rode a migration de devolução manual de créditos no Supabase."
        : error.message;
      setLoadError(msg);
      setItems([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Omit<PendingRefundBooking, "profiles">[];
    if (rows.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    setItems(
      rows.map((r) => ({
        ...r,
        profiles: profileMap[r.user_id] ?? null,
      })),
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refund = async () => {
    if (!dialogBooking) return;
    setRefundingId(dialogBooking.id);
    const { error } = await supabase.rpc("admin_refund_booking_credit", {
      p_booking_id: dialogBooking.id,
      p_reason: reason.trim() || null,
    });
    setRefundingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Crédito devolvido ao aluno.");
    setDialogBooking(null);
    setReason("");
    await load();
    onRefunded?.();
  };

  const showPanel = alwaysVisible || loading || loadError || items.length > 0;

  if (!showPanel) return null;

  if (loading && compact) {
    return (
      <div className={cn("glass rounded-xl px-3 py-2 text-[10px] text-muted-foreground flex items-center gap-2", className)}>
        <Loader2 className="w-3 h-3 animate-spin" /> Verificando cancelamentos…
      </div>
    );
  }

  return (
    <>
      <div className={cn("glass rounded-2xl border border-warning/20 overflow-hidden", className)}>
        <div className={cn("px-4 py-3 border-b border-warning/15 bg-warning/5", compact && "py-2.5")}>
          <h3 className={cn("font-bold text-warning flex items-center gap-2", compact ? "text-xs" : "text-sm")}>
            <RotateCcw className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
            Devolução de créditos
          </h3>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Cancelamentos após 23h59 do dia anterior. Devolva o crédito se o motivo for plausível (ex.: força maior via chat).
            </p>
          )}
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : loadError ? (
          <div className="p-4 flex gap-3 text-sm text-destructive">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{loadError}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            {userId
              ? "Este aluno não tem cancelamentos pendentes de devolução."
              : "Nenhum cancelamento pendente no momento. Quando um aluno cancelar após 23h59 do dia anterior, o agendamento aparecerá aqui."}
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {items.map((item) => {
              const slot = item.class_slots;
              const student = item.profiles?.full_name ?? item.profiles?.email ?? "Aluno";
              const credit = CREDIT_LABELS[item.credit_used ?? ""] ?? item.credit_used ?? "—";
              const classLabel = slot
                ? `${format(new Date(slot.date + "T12:00:00"), "dd/MM")} · ${parseInt(slot.start_time.slice(0, 2), 10)}h`
                : "—";

              return (
                <div key={item.id} className={cn("flex items-center justify-between gap-3 px-4 py-3", compact && "py-2.5")}>
                  <div className="min-w-0">
                    <p className={cn("font-semibold truncate", compact ? "text-xs" : "text-sm")}>{student}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {classLabel} · {credit} · cancelado {format(new Date(item.updated_at), "dd/MM HH:mm")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-8 text-[10px] font-bold uppercase tracking-wider border-warning/30 text-warning hover:bg-warning/10"
                    disabled={refundingId === item.id}
                    onClick={() => {
                      setDialogBooking(item);
                      setReason("");
                    }}
                  >
                    {refundingId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Devolver
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!dialogBooking} onOpenChange={(open) => !open && setDialogBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Devolver crédito</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Confirma a devolução do crédito de{" "}
              <strong>{dialogBooking?.profiles?.full_name ?? dialogBooking?.profiles?.email ?? "aluno"}</strong>?
              O aluno será notificado.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Motivo (opcional)</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: motivo de saúde comprovado"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogBooking(null)}>
              Cancelar
            </Button>
            <Button onClick={refund} disabled={!!refundingId}>
              {refundingId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Devolver crédito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
