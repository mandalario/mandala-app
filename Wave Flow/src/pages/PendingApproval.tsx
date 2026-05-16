import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Hourglass, LogOut, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function PendingApproval() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const rejected = profile?.approval_status === "rejected";

  // Redirect when approved
  useEffect(() => {
    if (profile?.approval_status === "approved" && profile?.profile_completed) {
      navigate("/", { replace: true });
    }
  }, [profile?.approval_status, profile?.profile_completed, navigate]);

  // Realtime: react when admin approves
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`pending-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => {
          refreshProfile();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshProfile]);

  const handleRefresh = async () => {
    await refreshProfile();
    // Re-fetch directly to be sure (state may not have updated yet)
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("approval_status, profile_completed")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.approval_status === "approved" && data?.profile_completed) {
        navigate("/", { replace: true });
      } else if (data?.approval_status === "rejected") {
        toast.error("Cadastro recusado pelo instrutor.");
      } else {
        toast.info("Ainda aguardando aprovação do instrutor.");
      }
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <OceanBackground />
      <div className="max-w-md w-full text-center">
        <div className="glass-strong rounded-3xl p-10 shadow-elevated">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 ${rejected ? "bg-destructive/20" : "bg-primary/15 glow-primary animate-float"}`}>
            {rejected ? <XCircle className="w-10 h-10 text-destructive" /> : <Hourglass className="w-10 h-10 text-primary" />}
          </div>
          <h1 className="text-3xl font-bold mb-3">
            {rejected ? "Cadastro não aprovado" : "Quase lá"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {rejected
              ? "Seu cadastro foi recusado pelo instrutor. Entre em contato para mais informações."
              : "Sua ficha foi enviada e está aguardando aprovação do instrutor. Você receberá acesso assim que for liberado."}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              className="flex-1 h-11 rounded-xl bg-secondary/60 border-0"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
            </Button>
            <Button
              variant="ghost"
              onClick={signOut}
              className="flex-1 h-11 rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
