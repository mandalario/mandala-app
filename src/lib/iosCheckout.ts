import { isIosApp } from "@/lib/platform";

/** Ignore cached app flags in Safari; require evidence from the native shell. */
export function isIosNativeCheckout(): boolean {
  if (typeof window === "undefined") return false;
  const nativeShell = Boolean(
    window.ReactNativeWebView ||
    window.__IS_MANDALARIO_APP__ ||
    /MandalarioApp|ReactNativeWebView/i.test(window.navigator.userAgent),
  );
  return nativeShell && isIosApp();
}
