import { supabase } from "@/integrations/supabase/client";

/**
 * Utilitários para detecção do aplicativo nativo (Expo/ReactNativeWebView) e plataforma.
 */

export function isMandalarioApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("app") === "1" || params.has("ios") || params.get("mock_platform")) {
      return true;
    }
  } catch {}
  return Boolean(
    (window as any).__IS_MANDALARIO_APP__ ||
      sessionStorage.getItem("is_mandalario_app") === "true" ||
      localStorage.getItem("is_mandalario_app") === "true" ||
      (window as any).ReactNativeWebView
  );
}

export function isIosApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("ios") || params.get("mock_platform") === "ios") {
      return true;
    }
    if (params.get("mock_platform") === "android") {
      return false;
    }
  } catch {}
  const isApp = isMandalarioApp();
  if (!isApp) return false;

  const platform =
    (window as any).__APP_PLATFORM__ ||
    sessionStorage.getItem("app_platform") ||
    localStorage.getItem("app_platform");

  if (platform === "ios") return true;

  // Fallback baseado no User Agent se estiver rodando dentro do App
  const ua = window.navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua);
}

/**
 * Abre uma URL no navegador externo (Safari no iOS / Chrome no Android)
 * enviando mensagem para a bridge nativa da WebView ou abrindo nova aba na web.
 */
export function openExternalUrl(url: string): void {
  if (typeof window === "undefined") return;
  const bridge = (window as any).ReactNativeWebView;
  if (bridge && typeof bridge.postMessage === "function") {
    bridge.postMessage(
      JSON.stringify({
        type: "OPEN_EXTERNAL_URL",
        url,
      })
    );
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Transfere a sessão atual do usuário do app móvel para o Safari/navegador externo,
 * garantindo que ele caia na página desejada JÁ LOGADO.
 */
export async function openWebWithCurrentAuth(nextPath = "/packages"): Promise<void> {
  const baseUrl = "https://mandalario.app";

  try {
    let session = (await supabase.auth.getSession()).data.session;

    // Se a sessão existir, tenta renovar para garantir tokens 100% válidos
    if (session?.refresh_token) {
      try {
        const refreshed = await supabase.auth.refreshSession();
        if (refreshed.data.session) {
          session = refreshed.data.session;
        }
      } catch (err) {
        console.warn("[openWebWithCurrentAuth] refreshSession fallback:", err);
      }
    }

    if (session?.access_token && session?.refresh_token) {
      const at = encodeURIComponent(session.access_token);
      const rt = encodeURIComponent(session.refresh_token);
      const np = encodeURIComponent(nextPath);
      // Passa tokens tanto via query params quanto via hash fragment para compatibilidade universal
      const authUrl = `${baseUrl}/auth/callback?next=${np}&access_token=${at}&refresh_token=${rt}#access_token=${at}&refresh_token=${rt}&type=recovery`;
      openExternalUrl(authUrl);
      return;
    }
  } catch (e) {
    console.error("[openWebWithCurrentAuth] Erro ao obter sessão:", e);
  }
  // Se não estiver logado ou falhar token, abre a página de produção diretamente
  openExternalUrl(`${baseUrl}${nextPath}`);
}

