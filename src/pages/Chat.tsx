import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Loader2, Megaphone } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";
import { intlLocaleFor } from "@/i18n/dateLocale";
import { fetchGuestName, guestHasSession, isGuestUser, startGuestChat } from "@/lib/guestChat";
import { toast } from "sonner";

type Msg = { id: string; conversation_user: string; sender_id: string; body: string; created_at: string; kind?: string | null };

export default function Chat() {
  const { user, isAdmin, isGuest, hasAdminArea, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminConv = isAdmin && location.pathname.startsWith("/admin/chat");
  const { t, language } = useTranslation();
  const timeLocale = intlLocaleFor(language);
  const [params] = useSearchParams();
  const convUser = isAdmin ? params.get("u") : user?.id;
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState<string>("");
  const [guestReady, setGuestReady] = useState<boolean | null>(null);
  const [guestName, setGuestName] = useState("");
  const [startingGuest, setStartingGuest] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const backTo = isAdmin ? "/admin/chat" : isGuest || !user ? "/support" : "/";

  useEffect(() => {
    if (authLoading || isAdminConv) return;
    if (user && !isGuestUser(user)) {
      setGuestReady(true);
      return;
    }
    if (!user) {
      setGuestReady(false);
      return;
    }
    guestHasSession(user.id).then(setGuestReady);
  }, [user, authLoading, isAdminConv]);

  useEffect(() => {
    if (authLoading || !isAdminConv) return;
    if (!hasAdminArea("chat")) {
      navigate("/admin", { replace: true });
    }
  }, [authLoading, isAdminConv, hasAdminArea, navigate]);

  useEffect(() => {
    if (!convUser || guestReady === false) return;
    (async () => {
      const { data } = await supabase.from("chat_messages").select("*").eq("conversation_user", convUser).order("created_at");
      setMsgs((data ?? []) as Msg[]);
      setLoading(false);
      if (user) {
        await supabase.from("chat_messages").update({ read_at: new Date().toISOString() })
          .eq("conversation_user", convUser).is("read_at", null).neq("sender_id", user.id);
      }

      if (isAdmin) {
        const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("id", convUser).maybeSingle();
        if (prof) {
          setOtherName(prof.full_name ?? prof.email ?? t("common.student"));
        } else {
          const guestNameLabel = await fetchGuestName(convUser);
          setOtherName(guestNameLabel ?? t("support.guestLabel"));
        }
      } else {
        setOtherName(t("common.instructor"));
      }
    })();

    const channel = supabase.channel(`chat:${convUser}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_user=eq.${convUser}` },
        (payload) => setMsgs((prev) => [...prev, payload.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [convUser, isAdmin, user, guestReady, t]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const handleStartGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setStartingGuest(true);
    const { error } = await startGuestChat(guestName);
    setStartingGuest(false);
    if (error === "short_name") {
      toast.error(t("support.guestNameShort"));
      return;
    }
    if (error) {
      toast.error(t("support.guestStartError"));
      return;
    }
    setGuestReady(true);
  };

  const send = async () => {
    if (!text.trim() || !convUser || !user) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      conversation_user: convUser,
      sender_id: user.id,
      body: text.trim(),
    });
    setSending(false);
    if (error) {
      toast.error(t("chat.sendError"));
      return;
    }
    setText("");
  };

  if (!isAdminConv && (authLoading || guestReady === null)) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <OceanBackground />
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!isAdminConv && guestReady === false) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <OceanBackground />
        <div className="w-full max-w-md glass-strong rounded-3xl p-8 shadow-elevated">
          <Link to="/support" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> {t("common.back")}
          </Link>
          <h1 className="text-2xl font-bold mb-2">{t("support.guestNameTitle")}</h1>
          <p className="text-sm text-muted-foreground mb-6">{t("support.guestNameDescription")}</p>
          <form onSubmit={handleStartGuest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guest_name">{t("support.guestNameLabel")}</Label>
              <Input
                id="guest_name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t("support.guestNamePlaceholder")}
                className="bg-input/60 border-0 h-12 rounded-xl"
                required
                minLength={2}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={startingGuest || guestName.trim().length < 2}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold"
            >
              {startingGuest ? <Loader2 className="w-5 h-5 animate-spin" /> : t("support.guestNameContinue")}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!convUser) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <OceanBackground />
        <div className="glass-strong rounded-2xl p-8 text-center">{t("chat.noConversation")}</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <OceanBackground />
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link to={backTo} className="w-10 h-10 rounded-full glass flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80">{t("chat.eyebrow")}</p>
          <h1 className="text-xl font-bold">{otherName}</h1>
        </div>
      </header>

      <main className="flex-1 px-4 pb-4 overflow-y-auto space-y-2">
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : msgs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">{t("chat.empty")}</div>
        ) : (
          msgs.map((m) => {
            const mine = m.sender_id === user!.id;
            if (m.kind === "broadcast") {
              return (
                <div key={m.id} className="flex justify-center">
                  <div className="max-w-[90%] px-4 py-3 rounded-2xl border border-primary/40 bg-primary/10 text-sm">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary mb-1">
                      <Megaphone className="w-3 h-3" /> {t("chat.instructorNotice")}
                    </div>
                    <div className="whitespace-pre-line break-words">{m.body}</div>
                    <div className="text-[10px] mt-1 text-muted-foreground">
                      {new Date(m.created_at).toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" })}
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
                    {new Date(m.created_at).toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" })}
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
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={t("chat.messagePlaceholder")} className="bg-input/60 border-0 h-12 rounded-xl" />
          <Button onClick={send} disabled={sending || !text.trim()} className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary to-accent p-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
