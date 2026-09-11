/**
 * Robust detection of whether the web app is running inside a native shell / WebView
 * (React Native WebView, iOS WKWebView/UIWebView, Android WebView, PWA standalone, or custom bridge).
 */

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (data: string) => void;
    };
    __IS_MANDALARIO_APP__?: boolean;
  }
}

export function isReactNativeWebView(): boolean {
  if (typeof window === "undefined") return false;

  // 1. Direct explicit flag injected by WebView
  if (window.__IS_MANDALARIO_APP__ === true) {
    return true;
  }

  // 2. React Native WebView bridge object
  if (typeof window.ReactNativeWebView !== "undefined") {
    return true;
  }

  // 3. Cached detection from current session
  try {
    if (sessionStorage.getItem("is_mandalario_app") === "true") {
      return true;
    }
  } catch {
    // ignore storage access errors
  }

  // 4. URL query parameter / hash check (e.g., ?app=1, ?is_app=true, ?webview=true)
  try {
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("app") === "true" ||
      params.get("app") === "1" ||
      params.get("webview") === "true" ||
      params.get("is_app") === "1" ||
      params.get("is_app") === "true"
    ) {
      try {
        sessionStorage.setItem("is_mandalario_app", "true");
      } catch {}
      return true;
    }
  } catch {
    // ignore url errors
  }

  // 5. User-Agent inspection
  const ua = window.navigator?.userAgent || "";

  // Custom app user-agent identifier
  if (ua.includes("MandalarioApp") || ua.includes("ReactNativeWebView")) {
    try {
      sessionStorage.setItem("is_mandalario_app", "true");
    } catch {}
    return true;
  }

  // Android WebView signatures (standard `wv` or `Version/X.X Chrome`)
  const isAndroid = /Android/i.test(ua);
  const isAndroidWebView = isAndroid && (/;\s*wv\b/i.test(ua) || /Version\/[0-9.]+/i.test(ua));
  if (isAndroidWebView) {
    try {
      sessionStorage.setItem("is_mandalario_app", "true");
    } catch {}
    return true;
  }

  // iOS WebView signatures (WKWebView / UIWebView inside apps)
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isWebKit = /AppleWebKit/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);
  if (isIOS && isWebKit && !isSafari) {
    try {
      sessionStorage.setItem("is_mandalario_app", "true");
    } catch {}
    return true;
  }

  // iOS Standalone mode (PWA / embedded)
  if (isIOS && (window.navigator as any)?.standalone) {
    try {
      sessionStorage.setItem("is_mandalario_app", "true");
    } catch {}
    return true;
  }

  return false;
}

export function getOAuthRedirectUrl(): string {
  return `${window.location.origin}/auth/callback`;
}
