import { BookingRefundPanel } from "@/components/admin/BookingRefundPanel";

export default function AdminBookingRefunds() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary/80">Gestão</p>
        <h1 className="text-3xl font-bold">Devolução de créditos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cancelamentos feitos após 23h59 do dia anterior não devolvem crédito automaticamente. Analise o motivo e devolva manualmente se for plausível.
        </p>
      </div>

      <BookingRefundPanel alwaysVisible />
    </div>
  );
}
