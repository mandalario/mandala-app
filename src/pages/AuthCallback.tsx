import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { OceanBackground } from "@/components/OceanBackground";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashStr = window.location.hash.replace(/^#/, "");
      const hashParams = new URLSearchParams(hashStr);

      const nextPath = searchParams.get("next") || hashParams.get("next") || "/packages";
      const accessToken = searchParams.get("access_token") || hashParams.get("access_token");
      const refreshToken = searchParams.get("refresh_token") || hashParams.get("refresh_token");
      const code = searchParams.get("code") || hashParams.get("code");

      if (code) {
        supabase.auth.exchangeCodeForSession(code).finally(() => {
          navigate(nextPath, { replace: true });
        });
        return;
      }

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).finally(() => {
          navigate(nextPath, { replace: true });
        });
        return;
      }

      navigate(nextPath, { replace: true });
    } catch {
      navigate("/packages", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <OceanBackground />
      <div className="text-center space-y-3 z-10 px-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-xs text-muted-foreground">Abrindo página de compras...</p>
      </div>
    </div>
  );
}
