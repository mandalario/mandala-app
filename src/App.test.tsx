import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { id: "student-1", app_metadata: { provider: "email" } },
    profile: { profile_completed: true, approval_status: "approved" },
    isAdmin: false, isGuest: false, loading: false,
  }),
}));
vi.mock("@/i18n/LanguageContext", () => ({
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/components/BottomNav", () => ({ BottomNav: () => null }));
vi.mock("@/components/PushNotificationManager", () => ({ PushNotificationManager: () => null }));
vi.mock("./pages/Packages.tsx", () => ({ default: () => <div>Checkout da aula</div> }));
vi.mock("./pages/Index.tsx", () => ({ default: () => <div>Início</div> }));
import App from "./App";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(cleanup);

describe("post-login checkout redirect", () => {
  it("returns to the selected class instead of redirecting to home", async () => {
    window.history.replaceState({}, "", "/auth?next=%2Fpackages%3Fcheckout%3D1%26package%3Dclass-1");
    render(<App />);
    expect(await screen.findByText("Checkout da aula")).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe("/packages?checkout=1&package=class-1");
  });

  it("preserves the normal home redirect for login without a checkout destination", async () => {
    window.history.replaceState({}, "", "/auth");
    render(<App />);
    expect(await screen.findByText("Início")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
  });

  it("does not accept an external checkout destination", async () => {
    window.history.replaceState({}, "", "/auth?next=https%3A%2F%2Fexample.com%2Fpackages");
    render(<App />);
    expect(await screen.findByText("Início")).toBeInTheDocument();
  });
});
