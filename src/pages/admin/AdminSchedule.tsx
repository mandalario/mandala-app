import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageContext";
import { dateFnsLocaleFor } from "@/i18n/dateLocale";
import {
  Plus, Trash2, Loader2, Waves, Wind, CloudOff, Clock, MapPin, Users,
  CalendarDays, Sparkles, Repeat, Wand2, Lock, Pencil, ChevronDown, ChevronUp, CheckSquare, Square, X, RefreshCw
} from "lucide-react";
import { Modal } from "./AdminStudents";
import { Link } from "react-router-dom";
import { ForecastWidget } from "@/components/ForecastWidget";
import { BookingRefundPanel } from "@/components/admin/BookingRefundPanel";

type Level = "iniciante" | "intermediario" | "avancado";
type ClassType = "avulsa_grupo" | "avulsa_particular" | "aluguel";

type Slot = {
  id: string; date: string; start_time: string; end_time: string;
  capacity: number; location: string | null; notes: string | null; is_open: boolean;
  min_level: Level | null;
  class_type: "avulsa_grupo" | "avulsa_particular" | "aluguel";
};
type Cond = { id: string; date: string; condition: "good" | "medium" | "bad" | "flat"; notes: string | null; min_level: Level | null };
type CondKey = Cond["condition"];
type Template = {
  id: string; weekday: number; start_time: string; end_time: string;
  duration_min: number; capacity: number; location: string | null;
  notes: string | null; is_active: boolean;
  class_type: "avulsa_grupo" | "avulsa_particular" | "aluguel";
  alternate_type?: boolean;
};

const condIcon: Record<CondKey, JSX.Element> = {
  good: <Waves className="w-3.5 h-3.5" />,
  medium: <Wind className="w-3.5 h-3.5" />,
  bad: <CloudOff className="w-3.5 h-3.5" />,
  flat: <CloudOff className="w-3.5 h-3.5" />,
};
const condClr: Record<CondKey, string> = {
  good: "bg-success/15 text-success border-success/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  bad: "bg-destructive/15 text-destructive border-destructive/30",
  flat: "bg-muted/40 text-muted-foreground border-muted",
};
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

type BookingRow = { id: string; slot_id: string; user_id: string; status: string; is_accepted: boolean | null; profiles: { full_name: string | null; email: string; avatar_url: string | null } | null };

export default function AdminSchedule() {
  const { language } = useTranslation();
  const dateFnsLocale = dateFnsLocaleFor(language);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [conds, setConds] = useState<Cond[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showSlot, setShowSlot] = useState<{ date: string } | null>(null);
  const [editSlot, setEditSlot] = useState<Slot | null>(null);
  const [bulkEdit, setBulkEdit] = useState<Slot[] | null>(null);
  const [showPeriod, setShowPeriod] = useState<{ date: string } | null>(null);
  const [showCond, setShowCond] = useState<{ date: string; existing?: Cond } | null>(null);
  const [showTemplate, setShowTemplate] = useState<{ existing?: Template } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set());
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
  const [imprevistoSlot, setImprevistoSlot] = useState<Slot | null>(null);

  const load = async () => {
    setLoading(true);
    const today = ymd(new Date());
    const [{ data: s }, { data: c }, { data: t }] = await Promise.all([
      supabase.from("class_slots").select("*").gte("date", today).order("date").order("start_time").order("class_type"),
      supabase.from("surf_conditions").select("*").gte("date", today).order("date"),
      supabase.from("weekly_schedule_templates").select("*").order("weekday").order("start_time"),
    ]);

    const { data: bData, error: bErr } = await supabase.from("bookings").select("*").eq("status", "confirmed");
    if (bErr) console.error("Erro ao carregar agendamentos:", bErr);

    let b = bData || [];
    if (b.length > 0) {
      const userIds = [...new Set(b.map((x) => x.user_id))];
      const { data: pData } = await supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", userIds);
      const pMap = Object.fromEntries((pData || []).map((p) => [p.id, p]));
      b = b.map((x) => ({ ...x, profiles: pMap[x.user_id] || null }));
    }

    setSlots((s ?? []) as Slot[]);
    setConds((c ?? []) as Cond[]);
    setTemplates((t ?? []) as Template[]);
    setBookings((b ?? []) as any as BookingRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const slotsByDate = useMemo(() => {
    const m: Record<string, Slot[]> = {};
    slots.forEach((s) => { (m[s.date] ??= []).push(s); });
    return m;
  }, [slots]);

  const condByDate = useMemo(() => {
    const m: Record<string, Cond> = {};
    conds.forEach((c) => { m[c.date] = c; });
    return m;
  }, [conds]);

  const bookingsBySlot = useMemo(() => {
    const m: Record<string, BookingRow[]> = {};
    bookings.forEach((b) => { (m[b.slot_id] ??= []).push(b); });
    return m;
  }, [bookings]);

  const dateKey = ymd(selectedDate);
  const daySlots = slotsByDate[dateKey] ?? [];
  const dayCond = condByDate[dateKey];
  const isBlocked = dayCond && (dayCond.condition === "bad" || dayCond.condition === "flat");

  useEffect(() => { setSelectedSlotIds(new Set()); setExpandedSlot(null); }, [dateKey]);

  const removeSlot = async (id: string) => {
    if (!confirm("Remover este horário? Agendamentos existentes serão cancelados.")) return;
    const { error } = await supabase.from("class_slots").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Horário removido"); load();
  };

  const toggleSlot = async (s: Slot) => {
    await supabase.from("class_slots").update({ is_open: !s.is_open }).eq("id", s.id);
    load();
  };

  const updateSlotLevel = async (s: Slot, level: Level | null) => {
    const { error } = await supabase.from("class_slots").update({ min_level: level }).eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success(level ? `Restrito a ≥ ${LEVEL_LABEL[level]}` : "Restrição removida");
    load();
  };

  const handleConfirmClass = async (s: Slot) => {
    try {
      const cleanNotes = s.notes ? s.notes.replace(/\[IMPREVISTO\][^]*?|\[CONFIRMADA\]\s*/g, "").trim() : "";
      const newNotes = `[CONFIRMADA] ${cleanNotes}`.trim();

      const { error } = await supabase
        .from("class_slots")
        .update({ notes: newNotes || null })
        .eq("id", s.id);

      if (error) throw error;
      toast.success("Aula confirmada!");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao confirmar aula");
    }
  };

  const handleResetClassStatus = async (s: Slot) => {
    try {
      const cleanNotes = s.notes ? s.notes.replace(/\[IMPREVISTO\][^]*?|\[CONFIRMADA\]\s*/g, "").trim() : "";

      const { error } = await supabase
        .from("class_slots")
        .update({ notes: cleanNotes || null, is_open: true })
        .eq("id", s.id);

      if (error) throw error;
      toast.success("Status da aula restaurado!");
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao restaurar status da aula");
    }
  };

  const handleAcceptBooking = async (booking: BookingRow, slot: Slot) => {
    const studentName = booking.profiles?.full_name ?? booking.profiles?.email ?? "Aluno";
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ is_accepted: true })
        .eq("id", booking.id);

      if (error) throw error;

      // Create notification for the student
      const dateStr = format(new Date(slot.date + "T12:00:00"), "dd/MM");
      const timeStr = `${parseInt(slot.start_time.slice(0, 2), 10)}h`;

      const { error: nErr } = await supabase.from("notifications").insert({
        user_id: booking.user_id,
        title: "Agendamento Aceito!",
        body: `Seu agendamento para a aula de ${dateStr} às ${timeStr} foi aceito pelo instrutor. Bons treinos!`,
        kind: "approval",
      });

      if (nErr) console.error("Erro ao enviar notificação:", nErr);

      toast.success(`${studentName} aceito com sucesso!`);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao aceitar aluno");
    }
  };

  const handleUnbookStudent = async (booking: BookingRow, slot: Slot) => {
    const studentName = booking.profiles?.full_name ?? booking.profiles?.email ?? "Aluno";
    const confirmCancel = window.confirm(`Tem certeza que deseja desmarcar o agendamento de ${studentName} para esta aula? O crédito dele será devolvido.`);
    if (!confirmCancel) return;

    try {
      // 1. Update booking status to 'cancelled'
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          notes: "Desmarcado pelo administrador"
        })
        .eq("id", booking.id);

      if (error) throw error;

      // 2. Create notification for the student
      const dateStr = format(new Date(slot.date + "T12:00:00"), "dd/MM");
      const timeStr = `${parseInt(slot.start_time.slice(0, 2), 10)}h`;

      const { error: nErr } = await supabase.from("notifications").insert({
        user_id: booking.user_id,
        title: "Agendamento Removido",
        body: `Seu agendamento para a aula de ${dateStr} às ${timeStr} foi desmarcado pelo instrutor. Seu crédito foi devolvido.`,
        kind: "class_cancellation",
      });

      if (nErr) console.error("Erro ao enviar notificação:", nErr);

      toast.success(`${studentName} desmarcado com sucesso!`);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao desmarcar aluno");
    }
  };

  const toggleSelectSlot = (id: string) => {
    setSelectedSlotIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const selectAllDay = () => {
    if (selectedSlotIds.size === daySlots.length) setSelectedSlotIds(new Set());
    else setSelectedSlotIds(new Set(daySlots.map((s) => s.id)));
  };

  const bulkDelete = async () => {
    const ids = [...selectedSlotIds];
    if (ids.length === 0) return;
    if (!confirm(`Remover ${ids.length} horário(s)? Agendamentos serão cancelados.`)) return;
    const { error } = await supabase.from("class_slots").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} horário(s) removido(s)`);
    setSelectedSlotIds(new Set());
    load();
  };

  const bulkToggleOpen = async (open: boolean) => {
    const ids = [...selectedSlotIds];
    if (ids.length === 0) return;
    const { error } = await supabase.from("class_slots").update({ is_open: open }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} horário(s) ${open ? "aberto(s)" : "fechado(s)"}`);
    load();
  };

  const openBulkEdit = () => {
    const list = daySlots.filter((s) => selectedSlotIds.has(s.id));
    if (list.length === 0) return toast.error("Selecione ao menos um horário");
    setBulkEdit(list);
  };

  const removeCond = async (id: string) => {
    await supabase.from("surf_conditions").delete().eq("id", id);
    load();
  };

  const removeTemplate = async (id: string) => {
    if (!confirm("Remover este período recorrente?")) return;
    await supabase.from("weekly_schedule_templates").delete().eq("id", id);
    load();
  };

  const toggleTemplate = async (t: Template) => {
    await supabase.from("weekly_schedule_templates").update({ is_active: !t.is_active }).eq("id", t.id);
    load();
  };

  // Aplicar templates: gera slots para os próximos N dias com base nos templates ativos
  const applyTemplates = async (days: number) => {
    if (!templates.some((t) => t.is_active)) {
      toast.error("Nenhum período recorrente ativo");
      return;
    }

    const message = days >= 365
      ? "Deseja gerar a grade para o ANO INTEIRO? Isso seguirá a configuração de cada período (incluindo alternância entre Grupo/Particular)."
      : `Deseja gerar a grade para os próximos ${days} dias?`;

    if (!confirm(message)) return;

    setLoading(true);
    try {
      const todayStr = ymd(new Date());
      const { data, error } = await supabase.rpc("apply_active_templates_to_range", {
        _start_date: todayStr,
        _days: days,
      });

      if (error) throw error;

      toast.success(`${data} hor${data === 1 ? "ário gerado" : "ários gerados"} para os próximos ${days} dias`);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar horários");
    } finally {
      setLoading(false);
    }
  };

  // Calendar modifiers
  const daysWithSlots = Object.keys(slotsByDate).map((d) => new Date(d + "T12:00:00"));
  const daysGood = conds.filter((c) => c.condition === "good").map((c) => new Date(c.date + "T12:00:00"));
  const daysMedium = conds.filter((c) => c.condition === "medium").map((c) => new Date(c.date + "T12:00:00"));
  const daysBad = conds.filter((c) => c.condition === "bad").map((c) => new Date(c.date + "T12:00:00"));
  const daysFlat = conds.filter((c) => c.condition === "flat").map((c) => new Date(c.date + "T12:00:00"));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80">Configuração</p>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Agenda & Mar
            <button
              onClick={() => { load(); toast.success("Agenda atualizada!"); }}
              className="p-1.5 rounded-xl bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95 border border-border/40 inline-flex items-center justify-center"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure períodos recorrentes ou gerencie dia a dia.</p>
        </div>
      </div>

      <ForecastWidget />

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-xs text-muted-foreground">Cancelamentos tardios sem devolução automática</p>
          <Link to="/admin/refunds" className="text-xs font-bold text-primary hover:underline">
            Ver todos →
          </Link>
        </div>
        <BookingRefundPanel alwaysVisible />
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList className="bg-secondary/40 rounded-xl p-1">
          <TabsTrigger value="calendar" className="rounded-lg"><CalendarDays className="w-4 h-4 mr-1.5" /> Calendário</TabsTrigger>
          <TabsTrigger value="templates" className="rounded-lg"><Repeat className="w-4 h-4 mr-1.5" /> Períodos semanais</TabsTrigger>
        </TabsList>

        {/* CALENDÁRIO */}
        <TabsContent value="calendar" className="mt-5">
          {loading ? (
            <div className="glass rounded-2xl p-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
          ) : (
            <div className="grid lg:grid-cols-[auto_1fr] gap-5">
              <div className="glass-strong rounded-3xl p-3 h-fit">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  locale={dateFnsLocale}
                  showOutsideDays
                  weekStartsOn={0}
                  modifiers={{
                    hasSlots: daysWithSlots,
                    good: daysGood, medium: daysMedium, bad: daysBad, flat: daysFlat,
                  }}
                  modifiersClassNames={{
                    hasSlots: "font-bold",
                    good: "ring-1 ring-success/40",
                    medium: "ring-1 ring-warning/40",
                    bad: "ring-1 ring-destructive/40 line-through",
                    flat: "ring-1 ring-muted-foreground/30 line-through",
                  }}
                  className={cn("p-2 pointer-events-auto")}
                  classNames={{
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary",
                    day_today: "bg-accent/20 text-accent-foreground",
                  }}
                />
                <div className="px-3 pt-2 pb-3 grid grid-cols-2 gap-2 text-[10px]">
                  <Legend dot="bg-success" label="Mar bom" />
                  <Legend dot="bg-warning" label="Mar médio" />
                  <Legend dot="bg-destructive" label="Mar ruim" />
                  <Legend dot="bg-muted-foreground" label="Sem ondas" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass-strong rounded-3xl p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-widest text-primary/80">Dia selecionado</div>
                        <div className="font-bold capitalize text-lg">
                          {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: dateFnsLocale })}
                        </div>
                      </div>
                    </div>
                    {dayCond ? (
                      <button
                        onClick={() => setShowCond({ date: dateKey, existing: dayCond })}
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${condClr[dayCond.condition]}`}
                      >
                        {condIcon[dayCond.condition]} {condLabel[dayCond.condition]}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Mar não definido</span>
                    )}
                    {dayCond?.min_level && (
                      <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border bg-accent/15 text-accent border-accent/30">
                        ≥ {LEVEL_LABEL[dayCond.min_level]}
                      </span>
                    )}
                  </div>
                  {dayCond?.notes && (
                    <div className="mt-3 p-3 rounded-xl bg-secondary/30 text-sm flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1">{dayCond.notes}</div>
                      <button onClick={() => removeCond(dayCond.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {isBlocked && (
                    <div className="mt-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm flex items-center gap-2 text-destructive">
                      <Lock className="w-4 h-4 shrink-0" />
                      Dia bloqueado: alunos não podem agendar e os agendados foram cancelados com crédito devolvido.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button onClick={() => setShowCond({ date: dateKey, existing: dayCond })} variant="secondary" size="sm" className="rounded-xl bg-secondary/60 border-0">
                      <Sparkles className="w-4 h-4 mr-1" /> {dayCond ? "Editar mar" : "Definir mar"}
                    </Button>
                    <Button onClick={() => setShowPeriod({ date: dateKey })} size="sm" className="rounded-xl bg-gradient-to-r from-primary to-accent">
                      <Wand2 className="w-4 h-4 mr-1" /> Gerar período
                    </Button>
                    <Button onClick={() => setShowSlot({ date: dateKey })} size="sm" variant="outline" className="rounded-xl">
                      <Plus className="w-4 h-4 mr-1" /> Horário avulso
                    </Button>
                    {daySlots.length > 0 && (
                      <Button
                        onClick={() => { setSelectedSlotIds(new Set(daySlots.map((s) => s.id))); setBulkEdit(daySlots); }}
                        size="sm" variant="outline" className="rounded-xl"
                      >
                        <Pencil className="w-4 h-4 mr-1" /> Editar dia inteiro
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 px-1 gap-2 flex-wrap">
                    <h2 className="font-bold text-sm uppercase tracking-widest text-foreground/70">
                      Horários ({daySlots.length})
                    </h2>
                    {daySlots.length > 0 && (
                      <button onClick={selectAllDay} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                        {selectedSlotIds.size === daySlots.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        {selectedSlotIds.size === daySlots.length ? "Desmarcar todos" : "Selecionar todos"}
                      </button>
                    )}
                  </div>

                  {selectedSlotIds.size > 0 && (
                    <div className="glass rounded-2xl p-3 mb-3 flex items-center justify-between gap-2 flex-wrap border border-primary/30">
                      <div className="text-xs">
                        <span className="font-semibold text-primary">{selectedSlotIds.size}</span> selecionado(s)
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button size="sm" variant="outline" onClick={openBulkEdit} className="h-8 rounded-lg text-xs">
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => bulkToggleOpen(true)} className="h-8 rounded-lg text-xs">Abrir</Button>
                        <Button size="sm" variant="outline" onClick={() => bulkToggleOpen(false)} className="h-8 rounded-lg text-xs">Fechar</Button>
                        <Button size="sm" variant="outline" onClick={bulkDelete} className="h-8 rounded-lg text-xs text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedSlotIds(new Set())} className="h-8 rounded-lg text-xs">
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {daySlots.length === 0 ? (
                    <div className="glass rounded-2xl p-10 text-center">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <div className="text-sm text-muted-foreground mb-4">Nenhum horário neste dia.</div>
                      <Button onClick={() => setShowPeriod({ date: dateKey })} size="sm" className="rounded-xl bg-gradient-to-r from-primary to-accent">
                        <Wand2 className="w-4 h-4 mr-1" /> Gerar período
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {daySlots.map((s) => {
                        const slotBookings = bookingsBySlot[s.id] ?? [];
                        const taken = slotBookings.length;
                        const full = taken >= s.capacity;
                        const isSelected = selectedSlotIds.has(s.id);
                        const isExpanded = expandedSlot === s.id;
                        const pct = Math.min(100, (taken / Math.max(s.capacity, 1)) * 100);
                        return (
                          <div key={s.id} className={cn(
                            "glass-strong rounded-2xl p-4 transition-colors",
                            !s.is_open && "opacity-60",
                            isSelected && "ring-2 ring-primary",
                          )}>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleSelectSlot(s.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary/40 shrink-0"
                                aria-label="Selecionar"
                              >
                                {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                              </button>
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/15 text-primary flex flex-col items-center justify-center shrink-0">
                                <Clock className="w-3.5 h-3.5 mb-0.5" />
                                <span className="text-[11px] font-bold leading-none">{s.start_time.slice(0, 5)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold flex items-center gap-2 flex-wrap">
                                  <span className="text-base tracking-tight">{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</span>
                                  
                                  {s.min_level && <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">≥ {LEVEL_LABEL[s.min_level]}</span>}
                                  
                                  {(() => {
                                    const typeLabels: Record<string, string> = {
                                      avulsa_grupo: "Grupo",
                                      avulsa_particular: "Particular",
                                      aluguel: "Aluguel"
                                    };
                                    const typeColors: Record<string, string> = {
                                      avulsa_grupo: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                      avulsa_particular: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                                      aluguel: "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                    };
                                    const currentType = (s.class_type as string) in typeLabels ? s.class_type : "avulsa_grupo";
                                    return (
                                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${typeColors[currentType]}`}>
                                        {typeLabels[currentType]}
                                      </span>
                                    );
                                  })()}

                                  {isConfirmedSlot(s.notes) ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">✓ Confirmada</span>
                                  ) : isImprevistoSlot(s.notes) ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">⚠️ Cancelada</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">⏳ A Confirmar</span>
                                  )}
                                </div>

                                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 mt-2">
                                  <div className="flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-primary/70" />
                                    <span className={cn("font-medium", full ? "text-destructive" : taken > 0 ? "text-warning" : "text-foreground/80")}>
                                      {taken}/{s.capacity} agendados
                                    </span>
                                  </div>
                                  
                                  {s.location && (
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 text-primary/70" />
                                      <span className="truncate max-w-[120px] sm:max-w-xs">{s.location}</span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1.5 ml-auto">
                                    {!isConfirmedSlot(s.notes) && (
                                      <button onClick={() => handleConfirmClass(s)} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-success/10 hover:bg-success/20 text-success transition-all active:scale-95 border border-success/20">Confirmar</button>
                                    )}
                                    {!isImprevistoSlot(s.notes) && (
                                      <button onClick={() => setImprevistoSlot(s)} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all active:scale-95 border border-destructive/20">Cancelar</button>
                                    )}
                                    {(isConfirmedSlot(s.notes) || isImprevistoSlot(s.notes)) && (
                                      <button onClick={() => handleResetClassStatus(s)} className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground transition-all active:scale-95">Restaurar</button>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-2 h-1 rounded-full bg-secondary/40 overflow-hidden">
                                  <div className={cn("h-full transition-all", full ? "bg-destructive" : taken > 0 ? "bg-warning" : "bg-success/60")} style={{ width: `${pct}%` }} />
                                </div>

                                {isImprevistoSlot(s.notes) && (
                                  <div className="text-[11px] text-destructive mt-1.5 font-medium">
                                    Motivo: <span className="italic">{getImprevistoReason(s.notes)}</span>
                                  </div>
                                )}

                                {getDisplayNotes(s.notes) && (
                                  <div className="text-[11px] text-muted-foreground mt-1.5 italic bg-secondary/10 px-2 py-1 rounded-md inline-block">
                                    {getDisplayNotes(s.notes)}
                                  </div>
                                )}
                              </div>
                              <Select
                                value={s.min_level ?? "any"}
                                onValueChange={(v) => updateSlotLevel(s, v === "any" ? null : (v as Level))}
                              >
                                <SelectTrigger className="h-8 w-[130px] text-xs bg-background/40 border-border/40 hidden lg:flex">
                                  <SelectValue placeholder="Nível" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="any">Todos os níveis</SelectItem>
                                  <SelectItem value="iniciante">≥ Iniciante</SelectItem>
                                  <SelectItem value="intermediario">≥ Intermediário</SelectItem>
                                  <SelectItem value="avancado">≥ Avançado</SelectItem>
                                </SelectContent>
                              </Select>
                              <button
                                onClick={() => toggleSlot(s)}
                                className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full ${s.is_open ? "bg-success/15 text-success" : "bg-muted/40 text-muted-foreground"}`}
                              >
                                {s.is_open ? "Aberto" : "Fechado"}
                              </button>
                              <button onClick={() => setEditSlot(s)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-primary/10" title="Editar">
                                <Pencil className="w-4 h-4 text-muted-foreground hover:text-primary" />
                              </button>
                              <button onClick={() => removeSlot(s.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10" title="Excluir">
                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                              </button>
                              <button
                                onClick={() => taken > 0 && setExpandedSlot(isExpanded ? null : s.id)}
                                disabled={taken === 0}
                                className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-all border flex items-center gap-1.5 shrink-0",
                                  taken === 0
                                    ? "bg-transparent border-border/40 text-muted-foreground opacity-60 cursor-not-allowed"
                                    : isExpanded
                                      ? "bg-primary/20 border-primary text-primary active:scale-95"
                                      : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 active:scale-95"
                                )}
                                title={taken === 0 ? "Nenhum aluno inscrito" : "Gerenciar Alunos Inscritos"}
                              >
                                <Users className="w-3.5 h-3.5" />
                                Alunos ({taken})
                              </button>
                            </div>

                            {isExpanded && taken > 0 && (() => {
                              const pB = slotBookings.filter(b => (b as any).credit_used === 'avulsa_particular');
                              const gB = slotBookings.filter(b => (b as any).credit_used !== 'avulsa_particular');

                              const renderStudent = (b: any) => {
                                const isAccepted = b.is_accepted === true;
                                const isPending = b.is_accepted === null;

                                return (
                                  <div key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm py-2 px-3 rounded-xl bg-secondary/10 border border-border/20">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center overflow-hidden text-xs font-semibold shrink-0">
                                        {b.profiles?.avatar_url ? (
                                          <img src={b.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                          (b.profiles?.full_name ?? b.profiles?.email ?? "?")[0]?.toUpperCase()
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                                          <span className="truncate">{b.profiles?.full_name ?? "Sem nome"}</span>
                                          {isPending ? (
                                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/30">
                                              ⏳ Pendente
                                            </span>
                                          ) : isAccepted ? (
                                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                                              ✓ Aceito
                                            </span>
                                          ) : null}
                                          {(b as any).credit_used && (
                                            <span className={cn(
                                              "text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full border",
                                              (b as any).credit_used === 'avulsa_particular' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                              (b as any).credit_used === 'aluguel' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                              "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                            )}>
                                              {(b as any).credit_used === 'avulsa_particular' ? 'Particular' : (b as any).credit_used === 'aluguel' ? 'Aluguel' : 'Grupo'}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground truncate">{b.profiles?.email}</div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 justify-end">
                                      {isPending && (
                                        <button
                                          onClick={() => handleAcceptBooking(b, s)}
                                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-success text-success-foreground hover:bg-success/90 transition-all active:scale-95"
                                          title="Aceitar Inscrição"
                                        >
                                          Aceitar
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleUnbookStudent(b, s)}
                                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all active:scale-95 border border-destructive/20"
                                        title={isPending ? "Recusar Inscrição" : "Desmarcar Aluno"}
                                      >
                                        {isPending ? "Recusar" : "Desmarcar"}
                                      </button>
                                    </div>
                                  </div>
                                );
                              };

                              return (
                                <div className="mt-3 pt-3 border-t border-border/40 space-y-4">
                                  {gB.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Alunos em Grupo</div>
                                      {gB.map(renderStudent)}
                                    </div>
                                  )}
                                  {pB.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Alunos Particular</div>
                                      {pB.map(renderStudent)}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TEMPLATES SEMANAIS */}
        <TabsContent value="templates" className="mt-5 space-y-5">
          <div className="glass-strong rounded-3xl p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2"><Repeat className="w-5 h-5 text-primary" /> Períodos recorrentes</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Defina períodos por dia da semana (ex: toda terça das 7h às 10h, aulas de 60min).
                  Depois clique em <span className="font-semibold text-foreground">Aplicar</span> para gerar os horários nos próximos dias.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex bg-secondary/40 rounded-xl p-1 items-center mr-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 text-muted-foreground hidden sm:inline-block">Gerar Grade:</span>
                  <Button onClick={() => applyTemplates(7)} variant="ghost" size="sm" className="h-8 rounded-lg text-xs" title="Gerar próxima semana">1 Sem</Button>
                  <Button onClick={() => applyTemplates(14)} variant="ghost" size="sm" className="h-8 rounded-lg text-xs" title="Gerar próximas 2 semanas">2 Sem</Button>
                  <Button onClick={() => applyTemplates(30)} variant="ghost" size="sm" className="h-8 rounded-lg text-xs" title="Gerar próximo mês">1 Mês</Button>
                  <Button onClick={() => applyTemplates(365)} size="sm" className="h-8 rounded-lg text-xs bg-success/20 text-success hover:bg-success/30 ml-1" title="Gerar 365 dias">365 dias</Button>
                </div>
                <Button onClick={() => setShowTemplate({})} className="rounded-xl bg-gradient-to-r from-primary to-accent h-10">
                  <Plus className="w-4 h-4 mr-1" /> Novo
                </Button>
                <Button 
                  variant="destructive"
                  className="rounded-xl h-10"
                  onClick={async () => {
                    if (confirm("ATENÇÃO: Deseja apagar TODOS os períodos recorrentes (templates)?")) {
                      const { error } = await supabase.from('weekly_schedule_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                      if (error) toast.error(error.message);
                      else {
                        toast.success("Todos os templates foram apagados!");
                        load();
                      }
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Apagar Todos
                </Button>
              </div>
            </div>
          </div>

          {templates.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <Repeat className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <div className="text-sm text-muted-foreground mb-4">Nenhum período recorrente ainda.</div>
              <Button onClick={() => setShowTemplate({})} className="rounded-xl bg-gradient-to-r from-primary to-accent">
                <Plus className="w-4 h-4 mr-1" /> Criar primeiro
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {templates.map((t) => {
                const slotsCount = Math.floor(
                  (timeToMin(t.end_time) - timeToMin(t.start_time)) / t.duration_min,
                );
                return (
                  <div key={t.id} className={cn("glass-strong rounded-2xl p-4 flex items-start gap-3", !t.is_active && "opacity-50")}>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/15 text-primary flex flex-col items-center justify-center">
                      <span className="text-[10px] font-semibold uppercase">{WEEKDAYS[t.weekday]}</span>
                      <span className="text-[10px] opacity-70">{t.duration_min}min</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold flex items-center gap-1.5 flex-wrap">
                        {WEEKDAYS_LONG[t.weekday]} · {t.start_time.slice(0, 5)} – {t.end_time.slice(0, 5)}
                        {(() => {
                          const typeLabels: Record<string, string> = {
                            avulsa_grupo: "Grupo",
                            avulsa_particular: "Particular",
                            aluguel: "Aluguel"
                          };
                          const typeColors: Record<string, string> = {
                            avulsa_grupo: "bg-blue-500/10 text-blue-400 border-blue-500/20",
                            avulsa_particular: "bg-purple-500/10 text-purple-400 border-purple-500/20",
                            aluguel: "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          };
                          const currentType = (t.class_type as string) in typeLabels ? t.class_type : "avulsa_grupo";
                          return (
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full border ${typeColors[currentType]}`}>
                              {typeLabels[currentType]}
                            </span>
                          );
                        })()}

                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {slotsCount} aulas/dia</span>
                        <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {t.capacity} vagas</span>
                        {t.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.location}</span>}
                      </div>
                      {t.notes && <div className="text-xs text-muted-foreground mt-1 italic">{t.notes}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Switch checked={t.is_active} onCheckedChange={() => toggleTemplate(t)} />
                      <button onClick={() => setShowTemplate({ existing: t })} className="text-xs text-primary hover:underline">Editar</button>
                      <button onClick={() => removeTemplate(t.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showSlot && <SlotForm date={showSlot.date} onClose={() => { setShowSlot(null); load(); }} />}
      {showPeriod && <PeriodForm date={showPeriod.date} onClose={() => { setShowPeriod(null); load(); }} />}
      {showCond && <CondForm date={showCond.date} existing={showCond.existing} onClose={() => { setShowCond(null); load(); }} />}
      {showTemplate && <TemplateForm existing={showTemplate.existing} onClose={() => { setShowTemplate(null); load(); }} />}
      {editSlot && <EditSlotForm slot={editSlot} onClose={() => { setEditSlot(null); load(); }} />}
      {bulkEdit && <BulkEditForm slots={bulkEdit} onClose={() => { setBulkEdit(null); setSelectedSlotIds(new Set()); load(); }} />}
      {imprevistoSlot && (
        <ImprevistoModal
          slot={imprevistoSlot}
          onClose={() => setImprevistoSlot(null)}
          onSuccess={() => {
            setImprevistoSlot(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className={`w-2 h-2 rounded-full ${dot}`} />{label}
    </div>
  );
}

function SlotForm({ date, onClose }: { date: string; onClose: () => void }) {
  const [f, setF] = useState({ 
    date, start_time: "08:00", end_time: "09:00", capacity: 6, location: "Arpoador, Rio de Janeiro", notes: "", 
    min_level: "" as "" | Level,
    class_type: "avulsa_grupo" as "avulsa_grupo" | "avulsa_particular" | "aluguel"
  });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    const { error } = await supabase.from("class_slots").insert({
      date: f.date, start_time: f.start_time, end_time: f.end_time,
      capacity: f.capacity, location: f.location || null, notes: f.notes || null,
      min_level: (f.min_level || null) as any,
      class_type: f.class_type,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Horário criado"); onClose();
  };
  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-4">Horário avulso</h2>
      <div className="space-y-3">
        <div>
          <Label>Data</Label>
          <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Início</Label><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
          <div><Label>Fim</Label><Input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        </div>
        <div>
          <Label>Tipo de Horário</Label>
          <Select value={f.class_type} onValueChange={(v: any) => setF({ ...f, class_type: v })}>
            <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="avulsa_grupo">Aula Avulsa em Grupo</SelectItem>
              <SelectItem value="avulsa_particular">Aula Avulsa Particular</SelectItem>
              <SelectItem value="aluguel">Aluguel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Vagas</Label><Input type="number" min={1} value={f.capacity} onChange={(e) => setF({ ...f, capacity: +e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        <div><Label>Local</Label><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Ex: Praia Mole" className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        <div><Label>Observação</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="bg-input/60 border-0 rounded-xl mt-1" /></div>
        <div>
          <Label>Nível mínimo (opcional)</Label>
          <Select value={f.min_level || "any"} onValueChange={(v) => setF({ ...f, min_level: v === "any" ? "" : v as Level })}>
            <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Todos os níveis</SelectItem>
              <SelectItem value="iniciante">A partir de Iniciante</SelectItem>
              <SelectItem value="intermediario">A partir de Intermediário</SelectItem>
              <SelectItem value="avancado">Apenas Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={submit} disabled={!f.date || loading} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
        </Button>
      </div>
    </Modal>
  );
}

function PeriodForm({ date, onClose }: { date: string; onClose: () => void }) {
  const [f, setF] = useState({ 
    date, start_time: "07:00", end_time: "13:00", duration_min: 60, capacity: 6, location: "Arpoador, Rio de Janeiro", notes: "",
    class_type: "avulsa_grupo" as "avulsa_grupo" | "avulsa_particular" | "aluguel",
    alternate_type: false,
  });
  const [loading, setLoading] = useState(false);
  const preview = Math.max(0, Math.floor((timeToMin(f.end_time) - timeToMin(f.start_time)) / f.duration_min));
  const submit = async () => {
    if (preview < 1) { toast.error("Período inválido"); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc("generate_slots_from_period", {
      _date: f.date,
      _start: f.start_time,
      _end: f.end_time,
      _duration_min: f.duration_min,
      _capacity: f.capacity,
      _location: f.location || null,
      _notes: f.notes || null,
      _class_type: f.class_type,
      _alternate: f.alternate_type,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`${data} hor${data === 1 ? "ário criado" : "ários criados"}`);
    onClose();
  };
  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-1 flex items-center gap-2"><Wand2 className="w-5 h-5 text-primary" /> Gerar período</h2>
      <p className="text-xs text-muted-foreground mb-4">Cria automaticamente os horários do período divididos pela duração.</p>
      <div className="space-y-3">
        <div>
          <Label>Data</Label>
          <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Início</Label><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
          <div><Label>Fim</Label><Input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        </div>
        <div>
          <Label>Tipo de Horário</Label>
          <Select value={f.class_type} onValueChange={(v: any) => setF({ ...f, class_type: v })}>
            <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="avulsa_grupo">Aula Avulsa em Grupo</SelectItem>
              <SelectItem value="avulsa_particular">Aula Avulsa Particular</SelectItem>
              <SelectItem value="aluguel">Aluguel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div><Label>Duração da aula (min)</Label><Input type="number" min={15} step={15} value={f.duration_min} onChange={(e) => setF({ ...f, duration_min: +e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
          <div><Label>Vagas por aula</Label><Input type="number" min={1} value={f.capacity} onChange={(e) => setF({ ...f, capacity: +e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        </div>
        <div><Label>Local</Label><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Ex: Praia Mole" className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        <div><Label>Observação</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="bg-input/60 border-0 rounded-xl mt-1" /></div>
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-sm">
          <span className="font-semibold text-primary">Prévia:</span> {preview} aula{preview === 1 ? "" : "s"} serão criadas.
        </div>
        <Button onClick={submit} disabled={!f.date || loading || preview < 1} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerar horários"}
        </Button>
      </div>
    </Modal>
  );
}

function CondForm({ date, existing, onClose }: { date: string; existing?: Cond; onClose: () => void }) {
  const [f, setF] = useState<{ date: string; condition: CondKey; notes: string; min_level: "" | Level }>({
    date,
    condition: (existing?.condition as CondKey) ?? "good",
    notes: existing?.notes ?? "",
    min_level: (existing?.min_level as Level) ?? "",
  });
  const [loading, setLoading] = useState(false);
  const willBlock = f.condition === "bad" || f.condition === "flat";
  const submit = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("surf_conditions")
      .upsert({ date: f.date, condition: f.condition, notes: f.notes || null, min_level: (f.min_level || null) as any }, { onConflict: "date" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Condição salva"); onClose();
  };
  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-4">Condição do mar</h2>
      <div className="space-y-3">
        <div><Label>Data</Label><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        <div>
          <Label>Condição</Label>
          <Select value={f.condition} onValueChange={(v) => setF({ ...f, condition: v as CondKey })}>
            <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="good">Mar bom</SelectItem>
              <SelectItem value="medium">Mar médio</SelectItem>
              <SelectItem value="bad">Mar ruim</SelectItem>
              <SelectItem value="flat">Sem ondas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Observação</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Tamanho da onda, vento..." className="bg-input/60 border-0 rounded-xl mt-1" /></div>
        <div>
          <Label>Restrição de nível (todo o dia)</Label>
          <Select value={f.min_level || "any"} onValueChange={(v) => setF({ ...f, min_level: v === "any" ? "" : v as Level })}>
            <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Sem restrição</SelectItem>
              <SelectItem value="iniciante">A partir de Iniciante</SelectItem>
              <SelectItem value="intermediario">A partir de Intermediário</SelectItem>
              <SelectItem value="avancado">Apenas Avançado</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1">Aplica a todos os horários do dia. Pode ser sobrescrita por slot.</p>
        </div>
        {willBlock && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              Ao salvar, todos os horários do dia serão fechados. Aulas já agendadas serão canceladas e os créditos devolvidos automaticamente.
            </div>
          </div>
        )}
        <Button onClick={submit} disabled={!f.date || loading} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </Modal>
  );
}

function TemplateForm({ existing, onClose }: { existing?: Template; onClose: () => void }) {
  const [f, setF] = useState({
    weekday: existing?.weekday ?? 1,
    start_time: existing?.start_time?.slice(0, 5) ?? "07:00",
    end_time: existing?.end_time?.slice(0, 5) ?? "13:00",
    duration_min: existing?.duration_min ?? 60,
    capacity: existing?.capacity ?? 6,
    location: existing?.location ?? "Arpoador, Rio de Janeiro",
    notes: existing?.notes ?? "",
    is_active: existing?.is_active ?? true,
    class_type: existing?.class_type ?? ("avulsa_grupo" as "avulsa_grupo" | "avulsa_particular" | "aluguel"),
    alternate_type: existing?.alternate_type ?? false,
  });
  const [loading, setLoading] = useState(false);
  const preview = Math.max(0, Math.floor((timeToMin(f.end_time) - timeToMin(f.start_time)) / f.duration_min));
  const submit = async () => {
    if (preview < 1) { toast.error("Período inválido"); return; }
    setLoading(true);
    const basePayload = {
      start_time: f.start_time,
      end_time: f.end_time,
      duration_min: f.duration_min,
      capacity: f.capacity,
      location: f.location || null,
      notes: f.notes || null,
      is_active: f.is_active,
      class_type: f.class_type,
      alternate_type: f.alternate_type,
    };
    let q;
    if (existing) {
      q = supabase.from("weekly_schedule_templates").update({ ...basePayload, weekday: f.weekday }).eq("id", existing.id);
    } else {
      if (f.weekday === -1) {
        const payloads = [0, 1, 2, 3, 4, 5, 6].map((w) => ({ ...basePayload, weekday: w }));
        q = supabase.from("weekly_schedule_templates").insert(payloads);
      } else {
        q = supabase.from("weekly_schedule_templates").insert({ ...basePayload, weekday: f.weekday });
      }
    }
    const { error } = await q;
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(existing ? "Atualizado" : (f.weekday === -1 ? "Períodos criados para todos os dias" : "Período criado"));
    onClose();
  };
  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-4">{existing ? "Editar período" : "Novo período semanal"}</h2>
      <div className="space-y-3">
        <div>
          <Label>Dia da semana</Label>
          <Select value={String(f.weekday)} onValueChange={(v) => setF({ ...f, weekday: +v })}>
            <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {!existing && <SelectItem value="-1">Todos os dias</SelectItem>}
              {WEEKDAYS_LONG.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Início</Label><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
          <div><Label>Fim</Label><Input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        </div>
        <div>
          <Label>Tipo de Horário</Label>
          <Select value={f.class_type} onValueChange={(v: any) => setF({ ...f, class_type: v })}>
            <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="avulsa_grupo">Aula Avulsa em Grupo</SelectItem>
              <SelectItem value="avulsa_particular">Aula Avulsa Particular</SelectItem>
              <SelectItem value="aluguel">Aluguel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div><Label>Duração (min)</Label><Input type="number" min={15} step={15} value={f.duration_min} onChange={(e) => setF({ ...f, duration_min: +e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
          <div><Label>Vagas por aula</Label><Input type="number" min={1} value={f.capacity} onChange={(e) => setF({ ...f, capacity: +e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        </div>
        <div><Label>Local</Label><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Ex: Praia Mole" className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        <div><Label>Observação</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="bg-input/60 border-0 rounded-xl mt-1" /></div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
          <div>
            <div className="text-sm font-semibold">Ativo</div>
            <div className="text-xs text-muted-foreground">Será considerado ao aplicar templates</div>
          </div>
          <Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
        </div>
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-sm">
          <span className="font-semibold text-primary">Prévia:</span> {preview} aula{preview === 1 ? "" : "s"} por dia.
        </div>
        <Button onClick={submit} disabled={loading || preview < 1} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </Modal>
  );
}

function EditSlotForm({ slot, onClose }: { slot: Slot; onClose: () => void }) {
  const [f, setF] = useState({
    date: slot.date,
    start_time: slot.start_time.slice(0, 5),
    end_time: slot.end_time.slice(0, 5),
    capacity: slot.capacity,
    location: slot.location ?? "Arpoador, Rio de Janeiro",
    notes: slot.notes ?? "",
    min_level: (slot.min_level ?? "") as "" | Level,
    is_open: slot.is_open,
    class_type: slot.class_type ?? ("avulsa_grupo" as "avulsa_grupo" | "avulsa_particular" | "aluguel"),
  });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    const { error } = await supabase.from("class_slots").update({
      date: f.date,
      start_time: f.start_time,
      end_time: f.end_time,
      capacity: f.capacity,
      location: f.location || null,
      notes: f.notes || null,
      min_level: (f.min_level || null) as any,
      is_open: f.is_open,
      class_type: f.class_type,
    }).eq("id", slot.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Horário atualizado");
    onClose();
  };
  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-4">Editar horário</h2>
      <div className="space-y-3">
        <div>
          <Label>Data</Label>
          <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Início</Label><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
          <div><Label>Fim</Label><Input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        </div>
        <div>
          <Label>Tipo de Horário</Label>
          <Select value={f.class_type} onValueChange={(v: any) => setF({ ...f, class_type: v })}>
            <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="avulsa_grupo">Aula Avulsa em Grupo</SelectItem>
              <SelectItem value="avulsa_particular">Aula Avulsa Particular</SelectItem>
              <SelectItem value="aluguel">Aluguel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Vagas</Label><Input type="number" min={1} value={f.capacity} onChange={(e) => setF({ ...f, capacity: +e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        <div><Label>Local</Label><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
        <div><Label>Observação</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="bg-input/60 border-0 rounded-xl mt-1" /></div>
        <div>
          <Label>Nível mínimo</Label>
          <Select value={f.min_level || "any"} onValueChange={(v) => setF({ ...f, min_level: v === "any" ? "" : v as Level })}>
            <SelectTrigger className="bg-input/60 border-0 h-11 rounded-xl mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Todos os níveis</SelectItem>
              <SelectItem value="iniciante">≥ Iniciante</SelectItem>
              <SelectItem value="intermediario">≥ Intermediário</SelectItem>
              <SelectItem value="avancado">≥ Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between glass rounded-xl px-3 py-2">
          <Label className="m-0">Aberto para agendamento</Label>
          <Switch checked={f.is_open} onCheckedChange={(v) => setF({ ...f, is_open: v })} />
        </div>
        <Button onClick={submit} disabled={loading} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
        </Button>
      </div>
    </Modal>
  );
}

function BulkEditForm({ slots, onClose }: { slots: Slot[]; onClose: () => void }) {
  const [updateCapacity, setUpdateCapacity] = useState(false);
  const [capacity, setCapacity] = useState(slots[0]?.capacity ?? 4);
  const [updateLocation, setUpdateLocation] = useState(false);
  const [location, setLocation] = useState(slots[0]?.location ?? "");
  const [updateLevel, setUpdateLevel] = useState(false);
  const [minLevel, setMinLevel] = useState<"" | Level>((slots[0]?.min_level ?? "") as any);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [updateNotes, setUpdateNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const patch: any = {};
    if (updateCapacity) patch.capacity = capacity;
    if (updateLocation) patch.location = location || null;
    if (updateLevel) patch.min_level = minLevel || null;
    if (updateOpen) patch.is_open = isOpen;
    if (updateNotes) patch.notes = notes || null;
    if (Object.keys(patch).length === 0) return toast.error("Marque ao menos um campo para atualizar");
    setLoading(true);
    const ids = slots.map((s) => s.id);
    const { error } = await supabase.from("class_slots").update(patch).in("id", ids);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} horário(s) atualizado(s)`);
    onClose();
  };

  const Field = ({ enabled, onToggle, label, children }: { enabled: boolean; onToggle: (v: boolean) => void; label: string; children: React.ReactNode }) => (
    <div className={cn("glass rounded-xl p-3 space-y-2", !enabled && "opacity-50")}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} className="w-4 h-4 accent-primary" />
        <span className="text-sm font-semibold">{label}</span>
      </label>
      <div className={cn(!enabled && "pointer-events-none")}>{children}</div>
    </div>
  );

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-1">Editar em massa</h2>
      <p className="text-xs text-muted-foreground mb-4">Atualizando <strong>{slots.length}</strong> horário(s). Marque os campos que deseja alterar.</p>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        <Field enabled={updateCapacity} onToggle={setUpdateCapacity} label="Vagas">
          <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(+e.target.value)} className="bg-input/60 border-0 h-10 rounded-xl" />
        </Field>
        <Field enabled={updateLocation} onToggle={setUpdateLocation} label="Local">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Praia Mole" className="bg-input/60 border-0 h-10 rounded-xl" />
        </Field>
        <Field enabled={updateLevel} onToggle={setUpdateLevel} label="Nível mínimo">
          <Select value={minLevel || "any"} onValueChange={(v) => setMinLevel(v === "any" ? "" : v as Level)}>
            <SelectTrigger className="bg-input/60 border-0 h-10 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Todos os níveis</SelectItem>
              <SelectItem value="iniciante">≥ Iniciante</SelectItem>
              <SelectItem value="intermediario">≥ Intermediário</SelectItem>
              <SelectItem value="avancado">≥ Avançado</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field enabled={updateOpen} onToggle={setUpdateOpen} label="Status (aberto/fechado)">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{isOpen ? "Aberto para agendamento" : "Fechado"}</span>
            <Switch checked={isOpen} onCheckedChange={setIsOpen} />
          </div>
        </Field>
        <Field enabled={updateNotes} onToggle={setUpdateNotes} label="Observação">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-input/60 border-0 rounded-xl" rows={2} />
        </Field>
      </div>
      <Button onClick={submit} disabled={loading} className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-accent mt-4">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Aplicar a ${slots.length} horário(s)`}
      </Button>
    </Modal>
  );
}

const isConfirmedSlot = (notes: string | null) => notes?.includes("[CONFIRMADA]") ?? false;
const isImprevistoSlot = (notes: string | null) => notes?.includes("[IMPREVISTO]") ?? false;

const getImprevistoReason = (notes: string | null) => {
  if (!notes) return "";
  const match = notes.match(/\[IMPREVISTO\]\s*([^[\]\-]*)/);
  return match ? match[1].trim() : "";
};

const getDisplayNotes = (notes: string | null) => {
  if (!notes) return "";
  return notes
    .replace(/\[CONFIRMADA\]\s*/g, "")
    .replace(/\[IMPREVISTO\]\s*([^[\]\-]*)\s*(-|—)?\s*/g, "")
    .trim();
};

function ImprevistoModal({ slot, onClose, onSuccess }: { slot: Slot; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Por favor, digite o motivo do cancelamento");
      return;
    }
    setLoading(true);
    try {
      // 1. Get confirmed bookings for this slot to refund and notify
      const { data: bookingsToCancel, error: bErr } = await supabase
        .from("bookings")
        .select("id, user_id")
        .eq("slot_id", slot.id)
        .eq("status", "confirmed");

      if (bErr) throw bErr;

      // 2. Update slot status to cancelled & closed
      const cleanNotes = slot.notes ? slot.notes.replace(/\[IMPREVISTO\][^]*?|\[CONFIRMADA\]\s*/g, "").trim() : "";
      const newNotes = `[IMPREVISTO] ${reason.trim()}${cleanNotes ? " - " + cleanNotes : ""}`;

      const { error: sErr } = await supabase
        .from("class_slots")
        .update({ is_open: false, notes: newNotes })
        .eq("id", slot.id);

      if (sErr) throw sErr;

      // 3. Update bookings to cancelled (refunds credits) and create notifications
      if (bookingsToCancel && bookingsToCancel.length > 0) {
        const { error: upErr } = await supabase
          .from("bookings")
          .update({ status: "cancelled", notes: `Cancelada por motivo: ${reason.trim()}` })
          .eq("slot_id", slot.id)
          .eq("status", "confirmed");

        if (upErr) throw upErr;

        // Insert notifications for each student
        const notifications = bookingsToCancel.map((b) => ({
          user_id: b.user_id,
          title: "Aula Cancelada",
          body: `A aula do dia ${format(new Date(slot.date + "T12:00:00"), "dd/MM")} às ${parseInt(slot.start_time.slice(0, 2), 10)}h foi cancelada. Motivo: ${reason.trim()}. Seu crédito foi devolvido.`,
          kind: "class_cancellation",
        }));

        const { error: nErr } = await supabase.from("notifications").insert(notifications);
        if (nErr) throw nErr;
      }

      toast.success("Aula cancelada e alunos notificados com sucesso!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar aula");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-2 text-destructive flex items-center gap-2">
        ⚠️ Cancelar Aula
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Ao cancelar, esta aula será <strong>fechada</strong>. Todos os alunos agendados serão <strong>desmarcados</strong> e seus <strong>créditos serão devolvidos</strong> automaticamente, além de receberem uma notificação com o motivo.
      </p>
      <div className="space-y-4">
        <div>
          <Label>Motivo do Cancelamento</Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Chuva forte com raios, Instrutor doente..."
            className="bg-input/60 border-0 h-11 rounded-xl mt-1"
            disabled={loading}
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 h-11 rounded-xl"
            disabled={loading}
          >
            Voltar
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            disabled={loading || !reason.trim()}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Cancelamento"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

