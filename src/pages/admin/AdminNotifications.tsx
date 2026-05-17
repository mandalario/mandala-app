import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Search, Users, Smartphone, BellRing } from "lucide-react";

type Student = { id: string; full_name: string | null; email: string; avatar_url: string | null };

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
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("");
  const [pushSending, setPushSending] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .order("full_name", { ascending: true })
      .then(({ data }) => setStudents((data ?? []) as Student[]));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter(
      (s) => (s.full_name ?? "").toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [students, search]);

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
    setPushSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          userId: pushTarget === "__all__" ? null : pushTarget,
          title: pushTitle.trim(),
          body: pushBody.trim(),
          url: pushUrl.trim() || undefined,
        },
      });
      if (error) throw error;
      if (!data?.ok) {
        toast.error(data?.error ?? "Falha ao enviar push");
      } else {
        toast.success(`Push enviado para ${data.sent} dispositivo(s)`);
        setPushTitle("");
        setPushBody("");
        setPushUrl("");
      }
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
      if (error) throw error;
      if (data?.ok) toast.success("Push enviado! Verifique seu celular.");
      else toast.error(data?.error ?? "Falha ao enviar push");
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
            <Select value={pushTarget} onValueChange={setPushTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__all__">Todos os usuários</SelectItem>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name ?? s.email}
                  </SelectItem>
                ))}
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
        <div className="flex gap-2 flex-wrap">
          <Button onClick={sendPush} disabled={pushSending}>
            <BellRing className="w-4 h-4 mr-2" />
            {pushSending ? "Enviando..." : "Enviar push"}
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
