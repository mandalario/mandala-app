import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithOAuth } = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signInWithOAuth } } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, isGuest: false, loading: false }) }));
vi.mock("@/i18n/LanguageContext", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/OceanBackground", () => ({ OceanBackground: () => null }));
vi.mock("@/components/LanguageSwitcher", () => ({ LanguageSwitcher: () => null }));
import Auth from "./Auth";

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({}, "", "/auth");
  delete window.ReactNativeWebView;
  delete window.__IS_MANDALARIO_APP__;
});

afterEach(() => {
  cleanup();
  delete window.ReactNativeWebView;
  delete window.__IS_MANDALARIO_APP__;
  localStorage.clear();
  sessionStorage.clear();
});

describe("Google login visibility", () => {
  it("preserves the browser login without a Google button", () => {
    render(<MemoryRouter><Auth /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "login.google" })).not.toBeInTheDocument();
    expect(signInWithOAuth).not.toHaveBeenCalled();
  });

  it("restores Google login in the app and sends OAuth to the native shell", async () => {
    const url = "https://accounts.google.com/o/oauth2/v2/auth";
    window.ReactNativeWebView = { postMessage: vi.fn() };
    signInWithOAuth.mockResolvedValue({ data: { url }, error: null });
    render(<MemoryRouter><Auth /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "login.google" }));

    const redirectTo = `${window.location.origin}/auth/callback`;
    await waitFor(() => expect(window.ReactNativeWebView?.postMessage).toHaveBeenCalledWith(
      JSON.stringify({ type: "OAUTH_URL", url, redirectTo }),
    ));
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } },
    });
  });
});
