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
          try {
            await Promise.race([
              supabase.auth.exchangeCodeForSession(code),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout exchangeCode")), 3000)),
            ]);
          } catch (err: any) {
            console.error("[AuthCallback] exchangeCode error:", err?.message || err);
          }
        }

        // 2. Checa se o Supabase já restaurou a sessão automaticamente
        setStatusText("Sincronizando sessão...");
        let activeUser = null;

        try {
          const { data: initialSession } = await Promise.race([
            supabase.auth.getSession(),
            new Promise<{ data: { session: null } }>((resolve) =>
              setTimeout(() => resolve({ data: { session: null } }), 1500)
            ),
          ]);
          if (initialSession?.session?.user) {
            activeUser = initialSession.session.user;
          }
        } catch (e) {
          console.warn("[AuthCallback] getSession check fallback:", e);
        }

        // 3. Se ainda não tiver sessão, aplica setSession com os tokens (timeout de 2.5s)
        if (!activeUser) {
          const accessToken = searchParams.get("access_token") || hashParams.get("access_token");
          const refreshToken = searchParams.get("refresh_token") || hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            try {
              const setSessionPromise = supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              const timeoutPromise = new Promise<{ data: { session: null; user: null }; error: any }>((resolve) =>
                setTimeout(() => resolve({ data: { session: null, user: null }, error: new Error("setSession timeout") }), 2500)
              );
              const { data: sessData, error: sessErr } = await Promise.race([setSessionPromise, timeoutPromise]);
              if (sessErr) {
                console.error("[AuthCallback] setSession error:", sessErr.message || sessErr);
              } else if (sessData?.user) {
                activeUser = sessData.user;
              }
            } catch (err) {
              console.error("[AuthCallback] setSession exception:", err);
            }
          }
        }

        // 4. Última checagem rápida de usuário
        if (!activeUser) {
          try {
            const { data: userData } = await Promise.race([
              supabase.auth.getUser(),
              new Promise<{ data: { user: null } }>((resolve) =>
                setTimeout(() => resolve({ data: { user: null } }), 1500)
              ),
            ]);
            activeUser = userData?.user ?? null;
          } catch { }
        }

        if (cancelled) return;

        if (activeUser) {
          setStatusText("Entrando na página de compras...");
          try {
            await Promise.race([
              refreshProfile(activeUser),
              new Promise((resolve) => setTimeout(resolve, 2000)),
            ]);
          } catch (e) {
            console.warn("[AuthCallback] refreshProfile timeout/error:", e);
          }

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
