import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isIosNativeCheckout } from "./iosCheckout";

const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";

beforeEach(() => {
  window.history.replaceState({}, "", "/adquirir-aulas");
  localStorage.clear();
  sessionStorage.clear();
  delete window.ReactNativeWebView;
  delete window.__IS_MANDALARIO_APP__;
});
afterEach(() => {
  vi.restoreAllMocks();
  delete window.ReactNativeWebView;
  delete window.__IS_MANDALARIO_APP__;
  localStorage.clear();
  sessionStorage.clear();
});

describe("iOS-only checkout visibility", () => {
  it("keeps the normal site unchanged in Safari even with cached app flags", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(iphone);
    localStorage.setItem("is_mandalario_app", "true");
    localStorage.setItem("app_platform", "ios");
    sessionStorage.setItem("is_mandalario_app", "true");
    expect(isIosNativeCheckout()).toBe(false);
  });
  it("does not enable the app UI just from URL parameters", () => {
    window.history.replaceState({}, "", "/adquirir-aulas?ios=1&app=1");
    expect(isIosNativeCheckout()).toBe(false);
  });
  it("enables it for the iPhone app with its native bridge", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(iphone);
    window.ReactNativeWebView = { postMessage: vi.fn() };
    expect(isIosNativeCheckout()).toBe(true);
  });
  it("supports an older iOS shell identified by its injected flag and URL", () => {
    window.__IS_MANDALARIO_APP__ = true;
    window.history.replaceState({}, "", "/adquirir-aulas?ios=1&app=1");
    expect(isIosNativeCheckout()).toBe(true);
  });
  it("keeps Android on the existing checkout", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Android MandalarioApp/1.0");
    window.ReactNativeWebView = { postMessage: vi.fn() };
    expect(isIosNativeCheckout()).toBe(false);
  });
});
