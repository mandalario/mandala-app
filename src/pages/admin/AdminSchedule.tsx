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
import { ptBR } from "date-fns/locale";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Loader2, Waves, Wind, CloudOff, Clock, MapPin, Users,
  CalendarDays, Sparkles, Repeat, Wand2, Lock, Pencil, ChevronDown, ChevronUp, CheckSquare, Square, X,
} from "lucide-react";
import { Modal } from "./AdminStudents";
import { ForecastWidget } from "@/components/ForecastWidget";

type Level = "iniciante" | "intermediario" | "avancado";
const LEVEL_LABEL: Record<Level, string> = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };

type Slot = {
  id: string; date: string; start_time: string; end_time: string;
  capacity: number; location: string | null; notes: string | null; is_open: boolean;
  min_level: Level | null;
};
type Cond = { id: string; date: string; condition: "good" | "medium" | "bad" | "flat"; notes: string | null; min_level: Level | null };
type CondKey = Cond["condition"];
type Template = {
  id: string; weekday: number; start_time: string; end_time: string;
  duration_min: number; capacity: number; location: string | null;
  notes: string | null; is_active: boolean;
};

const condLabel: Record<CondKey, string> = { good: "Mar bom", medium: "Mar médio", bad: "Mar ruim", flat: "Sem ondas" };
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

type BookingRow = { id: string; slot_id: string; user_id: string; status: string; profiles: { full_name: string | null; email: string; avatar_url: string | null } | null };

export default function AdminSchedule() {
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

  const load = async () => {
    setLoading(true);
    const today = ymd(new Date());
    const [{ data: s }, { data: c }, { data: t }, { data: b }] = await Promise.all([
      supabase.from("class_slots").select("*").gte("date", today).order("date").order("start_time"),
      supabase.from("surf_conditions").select("*").gte("date", today).order("date"),
      supabase.from("weekly_schedule_templates").select("*").order("weekday").order("start_time"),
      supabase.from("bookings").select("id, slot_id, user_id, status, profiles(full_name, email, avatar_url)").eq("status", "confirmed"),
    ]);
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
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    let total = 0;
    for (let i = 0; i < days; i++) {
      const d = addDays(today, i);
      const wd = d.getDay();
      const dateStr = ymd(d);
      const cond = condByDate[dateStr];
      if (cond && (cond.condition === "bad" || cond.condition === "flat")) continue;
      const dayTpls = templates.filter((t) => t.is_active && t.weekday === wd);
      for (const t of dayTpls) {
        const { data, error } = await supabase.rpc("generate_slots_from_period", {
          _date: dateStr,
          _start: t.start_time,
          _end: t.end_time,
          _duration_min: t.duration_min,
          _capacity: t.capacity,
          _location: t.location,
          _notes: t.notes,
        });
        if (!error && typeof data === "number") total += data;
      }
    }
    toast.success(`${total} hor${total === 1 ? "ário gerado" : "ários gerados"} para os próximos ${days} dias`);
    load();
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
          <h1 className="text-3xl font-bold">Agenda & Mar</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure períodos recorrentes ou gerencie dia a dia.</p>
        </div>
      </div>

      <ForecastWidget />

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
                  locale={ptBR}
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
                          {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
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
                                  {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                                  {s.min_level && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30">≥ {LEVEL_LABEL[s.min_level]}</span>}
                                  <span className={cn(
                                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                                    full
                                      ? "bg-destructive/15 text-destructive border-destructive/30"
                                      : taken > 0
                                        ? "bg-warning/15 text-warning border-warning/30"
                                        : "bg-success/10 text-success border-success/30",
                                  )}>
                                    {taken}/{s.capacity} {full ? "lotado" : "agendados"}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                                  <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {s.capacity} vagas</span>
                                  {s.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {s.location}</span>}
                                </div>
                                <div className="mt-2 h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                                  <div className={cn(
                                    "h-full transition-all",
                                    full ? "bg-destructive" : taken > 0 ? "bg-warning" : "bg-success/60",
                                  )} style={{ width: `${pct}%` }} />
                                </div>
                                {s.notes && <div className="text-xs text-muted-foreground mt-1 italic">{s.notes}</div>}
                              </div>
                              <Select
                                value={s.min_level ?? "any"}
                                onValueChange={(v) => updateSlotLevel(s, v === "any" ? null : (v as Level))}
                              >
                                <SelectTrigger className="h-8 w-[140px] text-xs bg-background/40 border-border/40 hidden md:flex">
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
                              {taken > 0 && (
                                <button
                                  onClick={() => setExpandedSlot(isExpanded ? null : s.id)}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary/40"
                                  title="Ver agendados"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                            </div>

                            {isExpanded && taken > 0 && (
                              <div className="mt-3 pt-3 border-t border-border/40 space-y-1.5">
                                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Agendados</div>
                                {slotBookings.map((b) => (
                                  <div key={b.id} className="flex items-center gap-2 text-sm">
                                    <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center overflow-hidden text-[11px] font-semibold shrink-0">
                                      {b.profiles?.avatar_url ? (
                                        <img src={b.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        (b.profiles?.full_name ?? b.profiles?.email ?? "?")[0]?.toUpperCase()
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{b.profiles?.full_name ?? b.profiles?.email ?? "—"}</div>
                                      {b.profiles?.full_name && <div className="text-[10px] text-muted-foreground truncate">{b.profiles?.email}</div>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
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
              <div className="flex gap-2">
                <Button onClick={() => applyTemplates(14)} variant="secondary" className="rounded-xl bg-secondary/60 border-0">
                  <Wand2 className="w-4 h-4 mr-1" /> Aplicar 14 dias
                </Button>
                <Button onClick={() => applyTemplates(30)} className="rounded-xl bg-gradient-to-r from-primary to-accent">
                  <Wand2 className="w-4 h-4 mr-1" /> Aplicar 30 dias
                </Button>
                <Button onClick={() => setShowTemplate({})} className="rounded-xl bg-gradient-to-r from-primary to-accent">
                  <Plus className="w-4 h-4 mr-1" /> Novo
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
                      <div className="font-semibold">
                        {WEEKDAYS_LONG[t.weekday]} · {t.start_time.slice(0, 5)} – {t.end_time.slice(0, 5)}
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
  const [f, setF] = useState({ date, start_time: "08:00", end_time: "09:00", capacity: 4, location: "", notes: "", min_level: "" as "" | Level });
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    const { error } = await supabase.from("class_slots").insert({
      date: f.date, start_time: f.start_time, end_time: f.end_time,
      capacity: f.capacity, location: f.location || null, notes: f.notes || null,
      min_level: (f.min_level || null) as any,
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
  const [f, setF] = useState({ date, start_time: "08:00", end_time: "11:00", duration_min: 60, capacity: 4, location: "", notes: "" });
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
    start_time: existing?.start_time?.slice(0, 5) ?? "08:00",
    end_time: existing?.end_time?.slice(0, 5) ?? "11:00",
    duration_min: existing?.duration_min ?? 60,
    capacity: existing?.capacity ?? 4,
    location: existing?.location ?? "",
    notes: existing?.notes ?? "",
    is_active: existing?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const preview = Math.max(0, Math.floor((timeToMin(f.end_time) - timeToMin(f.start_time)) / f.duration_min));
  const submit = async () => {
    if (preview < 1) { toast.error("Período inválido"); return; }
    setLoading(true);
    const payload = {
      weekday: f.weekday,
      start_time: f.start_time,
      end_time: f.end_time,
      duration_min: f.duration_min,
      capacity: f.capacity,
      location: f.location || null,
      notes: f.notes || null,
      is_active: f.is_active,
    };
    const q = existing
      ? supabase.from("weekly_schedule_templates").update(payload).eq("id", existing.id)
      : supabase.from("weekly_schedule_templates").insert(payload);
    const { error } = await q;
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success(existing ? "Atualizado" : "Período criado");
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
              {WEEKDAYS_LONG.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Início</Label><Input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
          <div><Label>Fim</Label><Input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} className="bg-input/60 border-0 h-11 rounded-xl mt-1" /></div>
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
    location: slot.location ?? "",
    notes: slot.notes ?? "",
    min_level: (slot.min_level ?? "") as "" | Level,
    is_open: slot.is_open,
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

