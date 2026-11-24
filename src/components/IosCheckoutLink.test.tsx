import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { createLink } = vi.hoisted(() => ({ createLink: vi.fn() }));
vi.mock("@/lib/checkoutHandoff", () => ({ createCheckoutLink: createLink }));
import { IosCheckoutLink } from "./IosCheckoutLink";

beforeEach(() => {
  vi.resetAllMocks();
  window.ReactNativeWebView = { postMessage: vi.fn() };
});

afterEach(() => {
  cleanup();
  delete window.ReactNativeWebView;
});

describe("iOS checkout button", () => {
  it("opens the personal checkout link through the native bridge", async () => {
    const url = "https://www.mandalario.app/auth/checkout#ticket=personal-ticket";
    createLink.mockResolvedValue({ url, expiresAt: Date.now() + 300_000 });
    render(<IosCheckoutLink />);

    fireEvent.click(screen.getByRole("button", { name: "Gerar acesso ao site de compras" }));
    const link = await screen.findByRole("link", { name: "Acessar site da escola (Safari)" });
    expect(link).toHaveAttribute("href", url);
    expect(window.ReactNativeWebView?.postMessage).not.toHaveBeenCalled();

    expect(fireEvent.click(link)).toBe(false);
    expect(window.ReactNativeWebView?.postMessage).toHaveBeenCalledExactlyOnceWith(
      JSON.stringify({ type: "OPEN_EXTERNAL_URL", url }),
    );
    expect(screen.getByRole("button", { name: "Copiar link de compra" })).toBeInTheDocument();
  });

  it("allows retrying when preparing the link fails", async () => {
    createLink.mockRejectedValue(new Error("Falha ao gerar acesso"));
    render(<IosCheckoutLink />);
    fireEvent.click(screen.getByRole("button", { name: "Gerar acesso ao site de compras" }));

    expect(await screen.findByRole("button", { name: "Gerar acesso ao site de compras" })).toBeEnabled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(window.ReactNativeWebView?.postMessage).not.toHaveBeenCalled();
  });
});
