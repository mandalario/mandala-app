import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { OceanBackground } from "@/components/OceanBackground";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/** Completes Supabase OAuth (Google) and returns the user to the app home. */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[AuthCallback] exchangeCodeForSession:", error.message);
        }
      }
      await supabase.auth.getSession();
      if (!cancelled && (window.location.search || window.location.hash)) {
        window.history.replaceState({}, "", "/auth/callback");
      }
    }

    completeAuth().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    navigate(user ? "/" : "/auth", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <OceanBackground />
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
