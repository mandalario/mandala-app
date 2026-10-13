import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { OceanBackground } from "@/components/OceanBackground";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Completa transferência de sessão do app móvel para o navegador e redireciona direto para a página de compras. */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [statusText, setStatusText] = useState("Acessando sua conta...");

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashStr = window.location.hash.replace(/^#/, "");
        const hashParams = new URLSearchParams(hashStr);

        // Caminho de destino (padrão: /packages para cair direto na página de compras)
        const nextPath = searchParams.get("next") || hashParams.get("next") || "/packages";

        // 1. OAuth code exchange caso aplicável
        const code = searchParams.get("code") || hashParams.get("code");
        if (code) {
          setStatusText("Validando credenciais...");
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error("[AuthCallback] exchangeCode:", error.message);
        }

        // 2. Transferência de sessão direta do app móvel para o Safari/Chrome
        const accessToken = searchParams.get("access_token") || hashParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token") || hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          setStatusText("Sincronizando sessão...");
          const { error: sessErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessErr) {
            console.error("[AuthCallback] setSession error:", sessErr.message);
          }
        }

        // 3. Confirma o usuário ativo e pré-carrega o perfil no contexto de autenticação
        const { data: { user } } = await supabase.auth.getUser();

        if (cancelled) return;

        if (user) {
          setStatusText("Entrando na página de compras...");
          await refreshProfile(user);
          if (cancelled) return;
          // Redireciona com replace para que a tela de compras abra imediatamente
          navigate(nextPath, { replace: true });
        } else {
          // Se não houver sessão válida, direciona para o login informando o destino posterior
          navigate(`/auth?next=${encodeURIComponent(nextPath)}`, { replace: true });
        }
      } catch (e) {
        console.error("[AuthCallback] unexpected error:", e);
        if (!cancelled) {
          navigate("/auth", { replace: true });
        }
      }
    }

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate, refreshProfile]);

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <OceanBackground />
      <div className="text-center space-y-3 z-10 px-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-foreground/90 font-medium">{statusText}</p>
        <p className="text-xs text-muted-foreground">Mandala Rio Surf School</p>
      </div>
    </div>
  );
}
