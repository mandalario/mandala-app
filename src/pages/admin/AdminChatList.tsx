import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, MessageCircle, Megaphone, Search, Send, ArrowLeft, Users, Bell } from "lucide-react";

type Student = {
  id: string;
  full_name: string | null;
  email: string;
  surf_level: "iniciante" | "intermediario" | "avancado" | null;
};

type ConvMeta = { last_msg: string; last_at: string; unread: number };

type Msg = {
  id: string;
  conversation_user: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  kind?: string | null;
};

const levelLabel = (l: Student["surf_level"]) =>
  l === "iniciante" ? "Iniciante" : l === "intermediario" ? "Intermediário" : l === "avancado" ? "Avançado" : "—";

export default function AdminChatList() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const activeUser = params.get("u");

  const [students, setStudents] = useState<Student[]>([]);
  const [convs, setConvs] = useState<Map<string, ConvMeta>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"chats" | "all">("chats");

  const loadConvs = async () => {
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("conversation_user, body, created_at, sender_id, read_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    const map = new Map<string, ConvMeta>();
    (msgs ?? []).forEach((m: any) => {
      const cur = map.get(m.conversation_user);
      const isUnread = m.sender_id === m.conversation_user && !m.read_at;
      if (!cur) {
        map.set(m.conversation_user, { last_msg: m.body, last_at: m.created_at, unread: isUnread ? 1 : 0 });
      } else if (isUnread) {
        map.set(m.conversation_user, { ...cur, unread: cur.unread + 1 });
      }
    });
    setConvs(map);
  };

  useEffect(() => {
    (async () => {
      const [{ data: profs }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, surf_level").order("full_name"),
      ]);
      setStudents((profs ?? []) as Student[]);
      await loadConvs();
      setLoading(false);
    })();

    const channel = supabase
      .channel("admin-chat-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => loadConvs())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base: Student[];
    if (tab === "chats") {
      base = students.filter((s) => convs.has(s.id));
      base.sort((a, b) => {
        const aT = convs.get(a.id)?.last_at ?? "";
        const bT = convs.get(b.id)?.last_at ?? "";
        return bT.localeCompare(aT);
      });
    } else {
      base = [...students].sort((a, b) => (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email));
    }
    if (!q) return base;
    return base.filter(
      (s) => (s.full_name ?? "").toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [students, convs, search, tab]);

  const openConv = (uid: string) => setParams({ u: uid });

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-3">
      {/* Sidebar */}
      <aside className={`${activeUser ? "hidden md:flex" : "flex"} flex-col w-full md:w-[340px] glass-strong rounded-2xl overflow-hidden shrink-0`}>
        <div className="p-4 border-b border-border/40 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Conversas</h1>
            <BroadcastDialog students={students} senderId={user?.id} onSent={loadConvs} />
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nome ou email…"
              className="pl-9 bg-input/60 border-0 h-10 rounded-xl"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-secondary/40">
            <button
              onClick={() => setTab("chats")}
              className={`flex-1 h-8 rounded-lg text-xs font-semibold transition ${tab === "chats" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <MessageCircle className="w-3.5 h-3.5 inline mr-1" /> Conversas
            </button>
            <button
              onClick={() => setTab("all")}
              className={`flex-1 h-8 rounded-lg text-xs font-semibold transition ${tab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <Users className="w-3.5 h-3.5 inline mr-1" /> Alunos
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              {tab === "chats" ? "Nenhuma conversa ainda." : "Nenhum aluno encontrado."}
            </div>
          ) : (
            filtered.map((s) => {
              const c = convs.get(s.id);
              const active = activeUser === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => openConv(s.id)}
                  className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-border/20 transition-colors ${active ? "bg-primary/15" : "hover:bg-secondary/30"}`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold shrink-0">
                    {(s.full_name ?? s.email)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate text-sm">{s.full_name ?? s.email}</span>
                      {c && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(c.last_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground truncate">
                        {c?.last_msg ?? `${levelLabel(s.surf_level)} · ${s.email}`}
                      </span>
                      {c && c.unread > 0 && (
                        <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 shrink-0">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Main */}
      <section className={`${activeUser ? "flex" : "hidden md:flex"} flex-1 glass-strong rounded-2xl overflow-hidden flex-col min-w-0`}>
        {activeUser ? (
          <ConversationPanel
            convUser={activeUser}
            student={students.find((s) => s.id === activeUser)}
            onBack={() => setParams({})}
            onMessageRead={loadConvs}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <MessageCircle className="w-16 h-16 opacity-30 mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Selecione uma conversa</h2>
            <p className="text-sm">Escolha um aluno na lista ao lado, ou dispare uma mensagem em massa.</p>
          </div>
        )}
      </section>
    </div>
  );
}

/* ============ Conversation panel ============ */
function ConversationPanel({
  convUser,
  student,
  onBack,
  onMessageRead,
}: {
  convUser: string;
  student?: Student;
  onBack: () => void;
  onMessageRead: () => void;
}) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setMsgs([]);
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_user", convUser)
        .order("created_at");
      setMsgs((data ?? []) as Msg[]);
      setLoading(false);
      await supabase
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_user", convUser)
        .is("read_at", null)
        .neq("sender_id", user!.id);
      onMessageRead();
    })();

    const channel = supabase
      .channel(`chat:${convUser}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_user=eq.${convUser}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as Msg]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convUser]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      conversation_user: convUser,
      sender_id: user.id,
      body: text.trim(),
      kind: "text",
    } as any);
    setSending(false);
    if (error) {
      toast.error("Erro ao enviar");
      return;
    }
    setText("");
  };

  const initial = (student?.full_name ?? student?.email ?? "?")[0]?.toUpperCase();

  return (
    <>
      <header className="px-4 py-3 border-b border-border/40 flex items-center gap-3">
        <button onClick={onBack} className="md:hidden w-9 h-9 rounded-full glass flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">{initial}</div>
        <div className="min-w-0">
          <h2 className="font-semibold truncate">{student?.full_name ?? student?.email ?? "Aluno"}</h2>
          <p className="text-xs text-muted-foreground truncate">{student?.email} · {levelLabel(student?.surf_level ?? null)}</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : msgs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma mensagem ainda. Comece a conversa.</div>
        ) : (
          msgs.map((m) => {
            const mine = m.sender_id === user!.id;
            const isBroadcast = m.kind === "broadcast";
            if (isBroadcast) {
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="max-w-[85%] px-4 py-3 rounded-2xl border border-primary/40 bg-primary/10 text-sm">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary mb-1">
                      <Megaphone className="w-3 h-3" /> Aviso
                    </div>
                    <div className="whitespace-pre-line break-words">{m.body}</div>
                    <div className="text-[10px] mt-1 text-muted-foreground">
                      {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${mine ? "bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-br-sm" : "glass rounded-bl-sm"}`}>
                  <div className="whitespace-pre-line break-words">{m.body}</div>
                  <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </main>

      <div className="p-3 border-t border-border/40">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Mensagem..."
            className="bg-input/60 border-0 h-12 rounded-xl"
          />
          <Button onClick={send} disabled={sending || !text.trim()} className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary to-accent p-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

/* ============ Broadcast dialog ============ */
function BroadcastDialog({
  students,
  senderId,
  onSent,
}: {
  students: Student[];
  senderId: string | undefined;
  onSent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [levels, setLevels] = useState<Record<string, boolean>>({ iniciante: true, intermediario: true, avancado: true, none: true });
  const [activityMode, setActivityMode] = useState<"all" | "has_upcoming" | "inactive_30">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activityIds, setActivityIds] = useState<Set<string> | null>(null);

  // load activity-based filters
  useEffect(() => {
    if (!open) return;
    if (activityMode === "all") {
      setActivityIds(null);
      return;
    }
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      if (activityMode === "has_upcoming") {
        const { data } = await supabase
          .from("bookings")
          .select("user_id, class_slots!inner(date)")
          .eq("status", "confirmed")
          .gte("class_slots.date", today);
        setActivityIds(new Set((data ?? []).map((b: any) => b.user_id)));
      } else {
        // inactive 30 days = no booking in last 30 days
        const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const { data } = await supabase
          .from("bookings")
          .select("user_id, class_slots!inner(date)")
          .gte("class_slots.date", cutoff);
        const recent = new Set((data ?? []).map((b: any) => b.user_id));
        setActivityIds(new Set(students.filter((s) => !recent.has(s.id)).map((s) => s.id)));
      }
    })();
  }, [activityMode, open, students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const lvl = s.surf_level ?? "none";
      if (!levels[lvl]) return false;
      if (activityIds && !activityIds.has(s.id)) return false;
      if (q && !(s.full_name ?? "").toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [students, search, levels, activityIds]);

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(filtered.map((s) => s.id)));
    else setSelected(new Set());
  };

  const send = async () => {
    if (!senderId || !text.trim() || selected.size === 0) {
      toast.error("Selecione destinatários e escreva a mensagem");
      return;
    }
    setSending(true);
    const rows = [...selected].map((uid) => ({
      conversation_user: uid,
      sender_id: senderId,
      body: text.trim(),
      kind: "broadcast",
    }));
    const { error } = await supabase.from("chat_messages").insert(rows as any);
    setSending(false);
    if (error) {
      toast.error("Erro ao enviar disparo");
      return;
    }
    toast.success(`Aviso enviado para ${selected.size} aluno(s)`);
    setOpen(false);
    setText("");
    setSelected(new Set());
    onSent();
  };

  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9 rounded-xl bg-gradient-to-r from-primary to-accent gap-1.5">
          <Megaphone className="w-4 h-4" /> Disparar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bell className="w-4 h-4" /> Disparo de aviso</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 overflow-y-auto pr-1">
          {/* Filters */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nível</Label>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {(["iniciante", "intermediario", "avancado", "none"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm glass rounded-lg px-2 py-1.5 cursor-pointer">
                    <Checkbox checked={levels[k]} onCheckedChange={(v) => setLevels((s) => ({ ...s, [k]: !!v }))} />
                    {k === "none" ? "Sem nível" : levelLabel(k as any)}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Atividade</Label>
              <Select value={activityMode} onValueChange={(v) => setActivityMode(v as any)}>
                <SelectTrigger className="h-9 mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="has_upcoming">Com aula agendada</SelectItem>
                  <SelectItem value="inactive_30">Inativos há 30+ dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Mensagem</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva o aviso…"
                rows={6}
                className="mt-1.5 bg-input/60 border-0"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Aparecerá como aviso destacado na conversa do aluno.</p>
            </div>
          </div>

          {/* Recipients */}
          <div className="flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Destinatários ({selected.size}/{filtered.length})</Label>
              <button onClick={() => toggleAll(!allSelected)} className="text-xs text-primary hover:underline">
                {allSelected ? "Limpar" : "Selecionar todos"}
              </button>
            </div>
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="pl-8 h-8 bg-input/60 border-0 text-sm"
              />
            </div>
            <div className="flex-1 overflow-y-auto glass rounded-xl divide-y divide-border/20 max-h-[280px]">
              {filtered.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Nenhum aluno bate com os filtros.</div>
              ) : (
                filtered.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/30">
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={(v) => {
                        setSelected((prev) => {
                          const n = new Set(prev);
                          if (v) n.add(s.id);
                          else n.delete(s.id);
                          return n;
                        });
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.full_name ?? s.email}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{s.email} · {levelLabel(s.surf_level)}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={send} disabled={sending || !text.trim() || selected.size === 0} className="bg-gradient-to-r from-primary to-accent">
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
            Enviar para {selected.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
