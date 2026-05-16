import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ShieldCheck, ArrowDown, Check, Loader2 } from "lucide-react";

type PrivacyDoc = { id: string; version: string; title: string; content: string };

type Props = {
  onAccepted: () => void;
};

export const PrivacyGate = ({ onAccepted }: Props) => {
  const { user } = useAuth();
  const [doc, setDoc] = useState<PrivacyDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reachedBottom, setReachedBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("privacy_policy")
        .select("id, version, title, content")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setDoc(data as PrivacyDoc | null);
      setLoading(false);
    })();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 32) {
      setReachedBottom(true);
    }
  };

  const handleAccept = async () => {
    if (!user || !doc) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("privacy_acceptances")
      .insert({ user_id: user.id, privacy_id: doc.id });
    setSubmitting(false);
    if (error && !error.message.includes("duplicate")) {
      toast.error("Erro: " + error.message);
      return;
    }
    onAccepted();
  };

  if (loading) {
    return (
      <div className="glass-strong rounded-3xl p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="glass-strong rounded-3xl p-8 text-center text-muted-foreground">
        Nenhuma política de privacidade cadastrada. Avise o admin.
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-3xl overflow-hidden shadow-elevated">
      <div className="p-6 border-b border-white/5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold">{doc.title}</h2>
          <p className="text-xs text-muted-foreground">Versão {doc.version}</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="px-6 py-5 max-h-[50vh] overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-foreground/90"
      >
        {doc.content}
      </div>

      {!reachedBottom && (
        <div className="px-6 pt-2 flex items-center justify-center gap-2 text-xs text-primary animate-pulse">
          <ArrowDown className="w-3 h-3" /> role até o fim para liberar o aceite
        </div>
      )}

      <div className="p-6 space-y-4 border-t border-white/5 bg-background/30">
        <label className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${reachedBottom ? "bg-secondary/40 cursor-pointer" : "bg-secondary/10 opacity-50 cursor-not-allowed"}`}>
          <Checkbox
            checked={agreed}
            onCheckedChange={(v) => setAgreed(!!v)}
            disabled={!reachedBottom}
            className="mt-0.5"
          />
          <span className="text-sm">
            Li e concordo integralmente com a <span className="text-primary font-medium">Política de Privacidade</span>.
          </span>
        </label>

        <Button
          onClick={handleAccept}
          disabled={!agreed || submitting}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold disabled:opacity-40"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <span className="inline-flex items-center gap-2"><Check className="w-4 h-4" /> Aceitar e continuar</span>
          )}
        </Button>
      </div>
    </div>
  );
};
