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
 * Checkout no host www — o binário da App Store já intercepta www.mandalario.app
 * e manda para fora da WebView. mandalario.app (sem www) é a origem do app e o iOS não sai.
 */
export const WEB_CHECKOUT_URL = "https://www.mandalario.app/packages?checkout=1";

/**
 * Abre uma URL no navegador externo (Safari no iOS / Chrome no Android).
 * No iOS do app da loja o clique tem que ser um <a href> em www; postMessage na mesma
 * origem trava a WebView em loading e não abre o Safari.
 */
export function openExternalUrl(url: string = WEB_CHECKOUT_URL): void {
  if (typeof window === "undefined" || !url) return;

  if (isIosApp()) {
    return;
  }

  const bridge = (window as any).ReactNativeWebView;
  if (bridge && typeof bridge.postMessage === "function") {
    bridge.postMessage(JSON.stringify({ type: "OPEN_EXTERNAL_URL", url }));
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

  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {}
}

/** Abre o checkout no Safari/navegador externo. Síncrono: não espera sessão (tokens quebram o open no iOS). */
export function openWebWithCurrentAuth(_nextPath = "/packages"): void {
  openExternalUrl(WEB_CHECKOUT_URL);
}
