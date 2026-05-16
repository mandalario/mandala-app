import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Loader2, Megaphone } from "lucide-react";

type Msg = { id: string; conversation_user: string; sender_id: string; body: string; created_at: string; kind?: string | null };

export default function Chat() {
  const { user, isAdmin } = useAuth();
  const [params] = useSearchParams();
  // Para admin, conversation_user vem da query string. Para aluno, é o próprio user.id
  const convUser = isAdmin ? params.get("u") : user?.id;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!convUser) return;
    (async () => {
      const { data } = await supabase.from("chat_messages").select("*").eq("conversation_user", convUser).order("created_at");
      setMsgs((data ?? []) as Msg[]);
      setLoading(false);
      // Marcar como lidas as mensagens da contraparte
      await supabase.from("chat_messages").update({ read_at: new Date().toISOString() })
        .eq("conversation_user", convUser).is("read_at", null).neq("sender_id", user!.id);

      if (isAdmin) {
        const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("id", convUser).maybeSingle();
        setOtherName(prof?.full_name ?? prof?.email ?? "Aluno");
      } else {
        setOtherName("Instrutor");
      }
    })();

    const channel = supabase.channel(`chat:${convUser}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_user=eq.${convUser}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [convUser, isAdmin, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || !convUser || !user) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      conversation_user: convUser,
      sender_id: user.id,
      body: text.trim(),
    });
    setSending(false);
    if (error) return;
    setText("");
  };

  if (!convUser) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <OceanBackground />
        <div className="glass-strong rounded-2xl p-8 text-center">Nenhuma conversa selecionada.</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <OceanBackground />
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link to={isAdmin ? "/admin/chat" : "/"} className="w-10 h-10 rounded-full glass flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80">Chat</p>
          <h1 className="text-xl font-bold">{otherName}</h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-4 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : msgs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Comece a conversa.</div>
        ) : (
          msgs.map((m) => {
            const mine = m.sender_id === user!.id;
            if (m.kind === "broadcast") {
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="max-w-[90%] px-4 py-3 rounded-2xl border border-primary/40 bg-primary/10 text-sm">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary mb-1">
                      <Megaphone className="w-3 h-3" /> Aviso do instrutor
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
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${mine ? "bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-br-sm" : "glass rounded-bl-sm"}`}>
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

      <div className="p-3 sticky bottom-0 glass-strong">
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Mensagem..." className="bg-input/60 border-0 h-12 rounded-xl" />
          <Button onClick={send} disabled={sending || !text.trim()} className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary to-accent p-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
