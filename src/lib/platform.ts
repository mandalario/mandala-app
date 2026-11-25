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
 * Checkout no host www — o binário da App Store intercepta www.mandalario.app
 * para abrir fora da WebView (mandalario.app sem www é a origem do app).
 */
export const WEB_CHECKOUT_URL = "https://www.mandalario.app/packages?checkout=1";

/**
 * Pede ao app nativo para abrir o Safari/Chrome via OPEN_EXTERNAL_URL.
 * No iOS isso é obrigatório: a WebView não consegue sair sozinha para o mesmo site.
 * Não navegar com location.href / window.open dentro do app — isso trava em loading.
 */
export function requestExternalUrl(url: string): boolean {
  if (typeof window === "undefined" || !url) return false;

  const payload = JSON.stringify({ type: "OPEN_EXTERNAL_URL", url });

  const bridge = (window as any).ReactNativeWebView;
  if (bridge && typeof bridge.postMessage === "function") {
    try {
      bridge.postMessage(payload);
      return true;
    } catch { /* Allow another handler or the link's default navigation. */ }
  }

  const webkitHandlers = (window as any).webkit?.messageHandlers;
  for (const handler of [webkitHandlers?.abrirExterno, webkitHandlers?.openExternalUrl]) {
    if (typeof handler?.postMessage !== "function") continue;
    try {
      handler.postMessage(url);
      return true;
    } catch { /* Try the next available handler. */ }
  }
  return false;
}

export function openExternalUrl(url: string = WEB_CHECKOUT_URL): void {
  if (typeof window === "undefined" || !url) return;
  if (requestExternalUrl(url) || isMandalarioApp()) return;

  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {}
}

/** Abre o checkout no Safari/navegador externo. Síncrono: não espera sessão (tokens quebram o open no iOS). */
export function openWebWithCurrentAuth(_nextPath = "/packages"): void {
  openExternalUrl(WEB_CHECKOUT_URL);
}
