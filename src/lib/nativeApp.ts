/** True when the site runs inside the Mandalario React Native WebView shell. */
export function isReactNativeWebView(): boolean {
  return typeof window !== "undefined" && !!(window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView;
}

export function getOAuthRedirectUrl(): string {
  return `${window.location.origin}/auth/callback`;
}
