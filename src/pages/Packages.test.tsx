import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import pt from "@/i18n/locales/pt.json";

const { auth, from, invoke, catalog, history } = vi.hoisted(() => ({
  auth: { user: null as { id: string } | null, profile: null, refreshProfile: vi.fn() },
  from: vi.fn(),
  invoke: vi.fn(),
  catalog: vi.fn(),
  history: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from, functions: { invoke } } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/useBillingEnabled", () => ({ useBillingEnabled: () => true }));
vi.mock("@/hooks/useIsApp", () => ({ useIsApp: () => false }));
vi.mock("@/components/OceanBackground", () => ({ OceanBackground: () => null }));
vi.mock("@/i18n/LanguageContext", () => ({
  useTranslation: () => ({
    language: "pt",
    t: (key: string) => key.split(".").reduce((value, part) => value?.[part], pt as any) ?? key,
  }),
}));
import Packages from "./Packages";

const pkg = {
  id: "class-1", name: "Aula Avulsa", description: "Uma aula de surf",
  credits: 1, price_cents: 15000, class_type: "avulsa_grupo",
};

function LoginLocation() {
  const location = useLocation();
  return <div data-testid="login-location">{location.pathname}{location.search}</div>;
}

const mount = (entry = "/packages?checkout=1") => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/packages" element={<Packages />} />
      <Route path="/auth" element={<LoginLocation />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  vi.resetAllMocks();
  auth.user = null;
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({}, "", "/packages?checkout=1");
  catalog.mockResolvedValue({ data: [pkg], error: null });
  history.mockResolvedValue({ data: [], error: null });
  invoke.mockResolvedValue({ data: { error: "Pagamento de teste indisponível" }, error: null });
  from.mockImplementation((table: string) => ({
    select: () => table === "credit_packages"
      ? { eq: () => ({ order: catalog }) }
      : { order: () => ({ limit: history }) },
  }));
});
afterEach(cleanup);

describe("external class checkout", () => {
  it("shows the catalog without a Safari session and preserves the class through login", async () => {
    localStorage.setItem("is_mandalario_app", "true");
    localStorage.setItem("app_platform", "ios");
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Comprar agora" }));
    const login = await screen.findByTestId("login-location");
    const next = new URLSearchParams(login.textContent!.split("?")[1]).get("next");
    expect(next).toBe("/packages?checkout=1&package=class-1");
    expect(from).not.toHaveBeenCalledWith("payments");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("opens Pix for the selected class after login", async () => {
    auth.user = { id: "student-1" };
    mount("/packages?checkout=1&package=class-1");
    expect(await screen.findByText("Pacote selecionado")).toBeInTheDocument();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("mp-create-pix", {
      body: { package_id: pkg.id },
    }));
  });

  it("does not start payment for an anonymous link with a preselected class", async () => {
    mount("/packages?checkout=1&package=class-1");
    expect(await screen.findByRole("button", { name: "Comprar agora" })).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
    expect(screen.queryByText("Nenhum pagamento ainda.")).not.toBeInTheDocument();
  });

  it("shows a recoverable error when the catalog fails", async () => {
    catalog.mockResolvedValueOnce({ data: null, error: new Error("Network error") });
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar as aulas");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("button", { name: "Comprar agora" })).toBeInTheDocument();
  });

  it("explains an empty catalog and offers login instead of showing only empty history", async () => {
    catalog.mockResolvedValue({ data: [], error: null });
    mount();
    expect(await screen.findByText("Nenhuma aula disponível para compra no momento.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar para comprar" })).toHaveAttribute(
      "href", "/auth?next=%2Fpackages%3Fcheckout%3D1",
    );
    expect(screen.queryByText("Nenhum pagamento ainda.")).not.toBeInTheDocument();
  });

  it("does not wait for payment history before displaying classes", async () => {
    auth.user = { id: "student-1" };
    history.mockReturnValue(new Promise(() => {}));
    mount();
    expect(await screen.findByRole("button", { name: "Comprar agora" })).toBeInTheDocument();
  });
});
