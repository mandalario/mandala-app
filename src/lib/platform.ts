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

  const ua = window.navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua);
}

/**
 * Abre uma URL no navegador externo (Safari no iOS / Chrome no Android)
 * enviando mensagem para a bridge nativa da WebView ou abrindo nova aba na web.
 */
export function openExternalUrl(url: string): void {
  if (typeof window === "undefined" || !url) return;

  const bridge = (window as any).ReactNativeWebView;
  if (bridge && typeof bridge.postMessage === "function") {
    bridge.postMessage(
      JSON.stringify({
        type: "OPEN_EXTERNAL_URL",
        url,
      })
    );
    return;
  }

  const webkitHandlers = (window as any).webkit?.messageHandlers;
  if (webkitHandlers?.abrirExterno && typeof webkitHandlers.abrirExterno.postMessage === "function") {
    webkitHandlers.abrirExterno.postMessage(url);
    return;
  }
  if (webkitHandlers?.openExternalUrl && typeof webkitHandlers.openExternalUrl.postMessage === "function") {
    webkitHandlers.openExternalUrl.postMessage(url);
    return;
  }

  // Nunca usar window.location.href dentro do app: a WebView navega e trava em loading.
  if (isMandalarioApp()) {
    try {
      const w = window.open(url, "_blank");
      if (!w) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch {}
    return;
  }

  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    window.location.href = url;
  }
}

/**
 * Transfere a sessão atual do usuário do app móvel para o Safari/navegador externo,
 * caindo na página de compras já logado, sem travar a WebView.
 */
export async function openWebWithCurrentAuth(nextPath = "/packages"): Promise<void> {
  const checkoutUrl = `https://mandalario.app${nextPath}?checkout=1`;

  let opened = false;
  const openOnce = (url: string) => {
    if (opened) return;
    opened = true;
    openExternalUrl(url);
  };

  const fallbackTimer = setTimeout(() => openOnce(checkoutUrl), 120);

  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (session?.access_token && session?.refresh_token) {
      const at = encodeURIComponent(session.access_token);
      const rt = encodeURIComponent(session.refresh_token);
      clearTimeout(fallbackTimer);
      openOnce(`${checkoutUrl}#access_token=${at}&refresh_token=${rt}`);
      return;
    }
  } catch (e) {
    console.warn("[openWebWithCurrentAuth] Erro ao obter sessão:", e);
  }

  clearTimeout(fallbackTimer);
  openOnce(checkoutUrl);
}
