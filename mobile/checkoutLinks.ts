export const PUBLIC_CHECKOUT_URL = "https://www.mandalario.app/packages?checkout=1";

/** Resolve checkout links before allowing navigation inside the WebView. */
export function getExternalCheckoutUrl(rawUrl: string): string | null {
  try {
    let url = new URL(rawUrl);
    if (url.protocol !== "https:" ||
      !["mandalario.app", "www.mandalario.app"].includes(url.hostname) ||
      url.username || url.password || url.port) return null;

    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path === "/auth/checkout") {
      // Preserve the one-time ticket in the fragment, including encoded values.
      return url.toString();
    }

    if (path === "/auth") {
      const next = url.searchParams.get("next");
      if (!next) return null;
      const destination = new URL(next, url.origin);
      if (destination.origin !== url.origin) return null;
      url = destination;
    }

    if (url.pathname.replace(/\/+$/, "") !== "/packages") return null;
    url.searchParams.set("checkout", "1");
    for (const flag of ["app", "ios", "mock_platform", "webview", "is_app"]) {
      url.searchParams.delete(flag);
    }
    return url.toString();
  } catch {
    return null;
  }
}
