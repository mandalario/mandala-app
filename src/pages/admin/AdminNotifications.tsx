import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { addDaysToYmd, getScheduleNowParts } from "@/lib/slotSchedule";
import { getRollingWeekBounds, ymdToLocalNoon } from "@/lib/rollingWeek";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Search, Users, Smartphone, BellRing, Calendar } from "lucide-react";

type Student = { id: string; full_name: string | null; email: string; avatar_url: string | null };

function toastPushResult(data: {
  ok?: boolean;
  sent?: number;
  attempted?: number;
  error?: string;
} | null) {
  if (!data?.ok) {
    toast.error(data?.error ?? "Falha ao enviar push");
    return false;
  }
  const attempted = data.attempted ?? data.sent ?? 0;
  if (attempted > (data.sent ?? 0)) {
    toast.warning(`Push entregue em ${data.sent} de ${attempted} dispositivo(s)`);
  } else {
    toast.success(`Push enviado para ${data.sent} dispositivo(s)`);
  }
  return true;
}

export default function AdminNotifications() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("info");
  const [sending, setSending] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);

  // Push panel
  const [pushTarget, setPushTarget] = useState<string>("__all__");
  const [pushSelected, setPushSelected] = useState<Set<string>>(new Set());
  const [pushSearch, setPushSearch] = useState("");
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("");
  const [pushSending, setPushSending] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => addDaysToYmd(getScheduleNowParts().date, 1));
  const [bookingsByDate, setBookingsByDate] = useState<Record<string, Set<string>>>({});
  const [weekLoading, setWeekLoading] = useState(false);

  const weekBounds = useMemo(() => getRollingWeekBounds(), []);
  const weekDates = weekBounds.dates;

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .order("full_name", { ascending: true })
      .then(({ data }) => setStudents((data ?? []) as Student[]));
  }, []);

  useEffect(() => {
    if (pushTarget !== "__scheduled__") return;

    let cancelled = false;
    (async () => {
      setWeekLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("user_id, class_slots!inner(date)")
        .eq("status", "confirmed")
        .gte("class_slots.date", weekBounds.startYmd)
        .lte("class_slots.date", weekBounds.endYmd);

      if (cancelled) return;

      if (error) {
        toast.error("Erro ao carregar agendamentos da semana");
        setBookingsByDate({});
      } else {
        const byDate: Record<string, Set<string>> = Object.fromEntries(
          weekDates.map((d) => [d, new Set<string>()]),
        );
        for (const row of data ?? []) {
          const date = row.class_slots.date;
          byDate[date]?.add(row.user_id);
        }
        setBookingsByDate(byDate);
      }
      setWeekLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [pushTarget, weekBounds.endYmd, weekBounds.startYmd, weekDates]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) => (s.full_name ?? "").toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [students, search]);

  const pushFiltered = useMemo(() => {
    const q = pushSearch.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) => (s.full_name ?? "").toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [students, pushSearch]);

  const scheduledBookedIds = useMemo(
    () => bookingsByDate[scheduledDate] ?? new Set<string>(),
    [bookingsByDate, scheduledDate],
  );

  const scheduledStudents = useMemo(
    () => students.filter((s) => scheduledBookedIds.has(s.id)),
    [students, scheduledBookedIds],
  );

  const scheduledDayLabel = useMemo(
    () => format(ymdToLocalNoon(scheduledDate), "EEEE, dd/MM", { locale: ptBR }),
    [scheduledDate],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((s) => s.id)));
  };

  const togglePush = (id: string) => {
    setPushSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePushAll = () => {
    if (pushSelected.size === pushFiltered.length) setPushSelected(new Set());
    else setPushSelected(new Set(pushFiltered.map((s) => s.id)));
  };

  const send = async () => {
    if (!title.trim()) return toast.error("Informe o título");
    if (selected.size === 0) return toast.error("Selecione ao menos um destinatário");
    setSending(true);
    const rows = Array.from(selected).map((uid) => ({
      user_id: uid,
      title: title.trim(),
      body: body.trim() || null,
      kind,
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(`Notificação enviada para ${rows.length} usuário(s)`);
    setTitle("");
    setBody("");
    setSelected(new Set());
  };

  const sendPush = async () => {
    if (!pushTitle.trim()) return toast.error("Informe o título do push");
    if (pushTarget === "__selected__" && pushSelected.size === 0) {
      return toast.error("Selecione ao menos um destinatário");
    }
    if (pushTarget === "__scheduled__" && scheduledBookedIds.size === 0) {
      return toast.error("Nenhum agendamento confirmado para o dia selecionado");
    }
    setPushSending(true);
    try {
      const userIds =
        pushTarget === "__selected__"
          ? Array.from(pushSelected)
          : pushTarget === "__scheduled__"
            ? Array.from(scheduledBookedIds)
            : undefined;

      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          userIds,
          title: pushTitle.trim(),
          body: pushBody.trim(),
          url: pushUrl.trim() || undefined,
        },
      });
      if (error) {
        let errorMessage = error.message;
        try {
          if (error.context) {
            const body = await error.context.json();
            errorMessage = body?.error || error.message;
          }
        } catch (e) {
          // ignore
        }
        throw new Error(errorMessage);
      }
      if (!toastPushResult(data)) return;
      setPushTitle("");
      setPushBody("");
      setPushUrl("");
      if (pushTarget === "__selected__") setPushSelected(new Set());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPushSending(false);
    }
  };

  const testPush = async () => {
    if (!user) return toast.error("Você precisa estar logado");
    setPushTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: user.id,
          title: "Teste Mandala Rio",
          body: "Esta é uma notificação de teste!",
          url: "/feed",
        },
      });
      if (error) {
        let errorMessage = error.message;
        try {
          if (error.context) {
            const body = await error.context.json();
            errorMessage = body?.error || error.message;
          }
        } catch (e) {
          // ignore
        }
        throw new Error(errorMessage);
      }
      if (toastPushResult(data)) toast.message("Verifique seu celular.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPushTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enviar notificações</h1>
        <p className="text-sm text-muted-foreground">
          Notificações no app + push notifications no celular (Expo).
        </p>
      </div>

      {/* Push notifications (Expo) */}
      <div className="glass-strong rounded-3xl p-5 space-y-4">
        <div className="font-semibold flex items-center gap-2">
          <BellRing className="w-4 h-4" /> Push notification
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Destinatário</label>
            <Select
              value={pushTarget}
              onValueChange={(value) => {
                setPushTarget(value);
                if (value !== "__selected__") setPushSelected(new Set());
                if (value === "__scheduled__" && !weekDates.includes(scheduledDate)) {
                  setScheduledDate(weekDates[0]);
                }
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os usuários</SelectItem>
                <SelectItem value="__scheduled__">Agendados por dia</SelectItem>
                <SelectItem value="__selected__">Selecionar pessoas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">URL de redirecionamento (opcional)</label>
            <Input
              value={pushUrl}
              onChange={(e) => setPushUrl(e.target.value)}
              placeholder="/feed ou https://..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Título</label>
            <Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} placeholder="Ex.: Mar perfeito hoje!" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Mensagem</label>
            <Input value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Detalhes..." />
          </div>
        </div>
        {pushTarget === "__scheduled__" && (
          <div className="space-y-4 rounded-2xl border border-border/60 p-4">
            <div className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Próximos 7 dias
            </div>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {weekDates.map((date) => {
                const count = bookingsByDate[date]?.size ?? 0;
                const isSelected = scheduledDate === date;
                const isToday = date === getScheduleNowParts().date;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setScheduledDate(date)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 transition-colors",
                      "hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                      isSelected && "bg-primary/15 ring-1 ring-primary/40",
                    )}
                    aria-pressed={isSelected}
                  >
                    <span
                      className={cn(
                        "text-[10px] uppercase font-medium",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {ymdToLocalNoon(date).toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}
                    </span>
                    <span className={cn("text-sm font-bold leading-none", isSelected && "text-primary")}>
                      {format(ymdToLocalNoon(date), "dd")}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold rounded-full px-1.5 min-w-[1.25rem]",
                        count > 0
                          ? isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-primary/20 text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {weekLoading ? "…" : count}
                    </span>
                    {isToday && (
                      <span className="text-[9px] text-primary font-medium">hoje</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-1 border-t border-border/40">
              <div className="text-sm font-medium capitalize mb-3">
                {weekLoading
                  ? "Carregando agendados..."
                  : `${scheduledBookedIds.size} aluno(s) — ${scheduledDayLabel}`}
              </div>
              <div className="max-h-48 overflow-y-auto -mx-2">
                {weekLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">Carregando...</div>
                ) : scheduledStudents.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum agendamento confirmado neste dia
                  </div>
                ) : (
                  scheduledStudents.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl">
                      {s.avatar_url ? (
                        <img src={s.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                          {(s.full_name ?? s.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{s.full_name ?? "Sem nome"}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        {pushTarget === "__selected__" && (
          <div className="space-y-3 rounded-2xl border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                {pushSelected.size} selecionado(s)
              </div>
              <button onClick={togglePushAll} className="text-xs text-primary hover:underline">
                {pushSelected.size === pushFiltered.length && pushFiltered.length > 0
                  ? "Desmarcar todos"
                  : "Selecionar todos"}
              </button>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={pushSearch}
                onChange={(e) => setPushSearch(e.target.value)}
                placeholder="Buscar por nome ou email"
                className="pl-9"
              />
            </div>
            <div className="max-h-48 overflow-y-auto -mx-2">
              {pushFiltered.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Nenhum usuário encontrado</div>
              ) : (
                pushFiltered.map((s) => {
                  const checked = pushSelected.has(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${checked ? "bg-primary/10" : "hover:bg-secondary/40"}`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => togglePush(s.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{s.full_name ?? "Sem nome"}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={sendPush} disabled={pushSending}>
            <BellRing className="w-4 h-4 mr-2" />
            {pushSending
              ? "Enviando..."
              : pushTarget === "__scheduled__"
                ? `Enviar push para ${scheduledBookedIds.size} agendado(s)`
                : pushTarget === "__selected__"
                  ? `Enviar push para ${pushSelected.size} usuário(s)`
                  : "Enviar push"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Compose in-app */}
        <div className="glass-strong rounded-3xl p-5 space-y-4 h-fit">
          <div className="font-semibold flex items-center gap-2"><Send className="w-4 h-4" /> Mensagem no app</div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Aula confirmada amanhã" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Mensagem (opcional)</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Detalhes da notificação..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Tipo</label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Informativo</SelectItem>
                <SelectItem value="booking">Aula</SelectItem>
                <SelectItem value="payment">Pagamento</SelectItem>
                <SelectItem value="approval">Aprovação</SelectItem>
                <SelectItem value="alert">Alerta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={send} disabled={sending} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Enviando..." : `Enviar para ${selected.size} usuário(s)`}
          </Button>
        </div>

        {/* Recipients */}
        <div className="glass-strong rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Destinatários</div>
            <button onClick={toggleAll} className="text-xs text-primary hover:underline">
              {selected.size === filtered.length && filtered.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou email" className="pl-9" />
          </div>
          <div className="max-h-[480px] overflow-y-auto -mx-2">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Nenhum usuário encontrado</div>
            ) : (
              filtered.map((s) => {
                const checked = selected.has(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${checked ? "bg-primary/10" : "hover:bg-secondary/40"}`}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(s.id)} />
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                        {(s.full_name ?? s.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.full_name ?? "Sem nome"}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
