import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  read_at: string | null;
  created_at: string;
};

const useFormatTime = () => {
  const { t, language } = useTranslation();
  const localeMap: Record<string, string> = { pt: "pt-BR", en: "en-US", es: "es-ES" };
  return (iso: string) => {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return t("notifications.now");
    if (diff < 3600) return `${Math.floor(diff / 60)} ${t("notifications.minShort")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${t("notifications.hourShort")}`;
    return d.toLocaleDateString(localeMap[language] ?? "en-US", { day: "2-digit", month: "short" });
  };
};

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function localizeNotif(n: Notif, t: TFn): { title: string; body: string | null } {
  const title = (n.title || "").trim();
  const body = (n.body || "").trim();

  if (title === "Cadastro aprovado!") {
    return {
      title: t("notifications.items.approvalApprovedTitle"),
      body: t("notifications.items.approvalApprovedBody"),
    };
  }
  if (title === "Cadastro recusado") {
    return {
      title: t("notifications.items.approvalRejectedTitle"),
      body: t("notifications.items.approvalRejectedBody"),
    };
  }
  if (title === "Créditos liberados") {
    const m = body.match(/\+(\d+)/);
    return {
      title: t("notifications.items.paymentApprovedTitle"),
      body: t("notifications.items.paymentApprovedBody", { credits: m ? m[1] : "" }),
    };
  }
  if (title === "Pagamento recusado") {
    const isDefault = !body || body === "Verifique e envie novamente.";
    return {
      title: t("notifications.items.paymentRejectedTitle"),
      body: isDefault ? t("notifications.items.paymentRejectedBody") : n.body,
    };
  }
  if (title === "Aula cancelada") {
    const m = body.match(/(\d{2}\/\d{2})/);
    return {
      title: t("notifications.items.bookingCancelledTitle"),
      body: t("notifications.items.bookingCancelledBody", { date: m ? m[1] : "" }),
    };
  }
  return { title: n.title, body: n.body };
}

export function NotificationsBell({ className = "" }: { className?: string }) {
  const { user, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const formatTime = useFormatTime();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, kind, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as Notif[]);
  };

  useEffect(() => {
    if (!user) return;
    load();

    const channel = supabase
      .channel(`notifs-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const n = payload.new as Notif;
            setItems((prev) => [n, ...prev].slice(0, 30));
            const loc = localizeNotif(n, t);
            toast.message(loc.title, { description: loc.body ?? undefined });
            // Some notifications mean profile changed (approval / credits)
            if (n.kind === "approval" || n.kind === "payment") refreshProfile();
          } else if (payload.eventType === "UPDATE") {
            const n = payload.new as Notif;
            setItems((prev) => prev.map((x) => (x.id === n.id ? n : x)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = items.filter((n) => !n.read_at).length;

  const markOne = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  const markAll = async () => {
    if (!user || unread === 0) return;
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`w-10 h-10 rounded-full glass flex items-center justify-center relative ${className}`}
          aria-label={t("notifications.aria")}
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 glass-strong border-white/10">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="font-semibold text-sm">{t("notifications.title")}</div>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs text-primary hover:underline flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5" /> {t("notifications.markAll")}
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <Inbox className="w-6 h-6 mx-auto mb-2 opacity-50" />
              {t("notifications.empty")}
            </div>
          ) : (
            items.map((n) => {
              const loc = localizeNotif(n, t);
              return (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-white/5 last:border-b-0 flex gap-3 ${!n.read_at ? "bg-primary/5" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{loc.title}</span>
                      {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    {loc.body && <div className="text-xs text-muted-foreground mt-0.5 break-words">{loc.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
                      {formatTime(n.created_at)}
                    </div>
                  </div>
                  {!n.read_at && (
                    <button
                      onClick={() => markOne(n.id)}
                      className="text-muted-foreground hover:text-primary self-start"
                      aria-label={t("notifications.markRead")}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
