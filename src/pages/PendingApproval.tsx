import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { OceanBackground } from "@/components/OceanBackground";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Hourglass, LogOut, RefreshCw, XCircle } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageContext";

export default function PendingApproval() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rejected = profile?.approval_status === "rejected";

  useEffect(() => {
    if (profile?.approval_status === "approved" && profile?.profile_completed) {
      navigate("/", { replace: true });
    }
  }, [profile?.approval_status, profile?.profile_completed, navigate]);

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
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        async () => {
          await signOut();
          navigate("/auth", { replace: true });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshProfile, signOut, navigate]);

  const handleRefresh = () => {
    window.location.reload();
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
            {rejected ? t("pendingApproval.rejectedTitle") : t("pendingApproval.pendingTitle")}
          </h1>
          <p className="text-muted-foreground mb-8">
            {rejected ? t("pendingApproval.rejectedBody") : t("pendingApproval.pendingBody")}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              className="flex-1 h-11 rounded-xl bg-secondary/60 border-0"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> {t("common.refresh")}
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await signOut();
                navigate("/auth", { replace: true });
              }}
              className="flex-1 h-11 rounded-xl"
            >
              <LogOut className="w-4 h-4 mr-2" /> {t("common.signOut")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
