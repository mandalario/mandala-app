import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
const { redeem, navigate } = vi.hoisted(() => ({ redeem: vi.fn(), navigate: vi.fn() }));
vi.mock("@/lib/checkoutHandoff", () => ({ redeemCheckoutLink: redeem }));
vi.mock("react-router-dom", async (original) => ({ ...await original<typeof import("react-router-dom")>(), useNavigate: () => navigate }));
import CheckoutAccess from "./CheckoutAccess";

beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState({}, "", "/auth/checkout#ticket=personal-ticket");
  delete window.ReactNativeWebView;
  delete window.__IS_MANDALARIO_APP__;
});
afterEach(cleanup);
const mount = () => render(<MemoryRouter><CheckoutAccess /></MemoryRouter>);

describe("checkout access page", () => {
  it("removes the ticket before redemption and waits for the new account", async () => {
    redeem.mockImplementation(async () => {
      expect(window.location.hash).toBe("");
      expect(navigate).not.toHaveBeenCalled();
    });
    mount();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/packages?checkout=1", { replace: true }));
    expect(redeem).toHaveBeenCalledWith("personal-ticket");
  });
  it("does not consume the ticket inside an old app WebView", async () => {
    window.ReactNativeWebView = { postMessage: vi.fn() };
    mount();
    expect(await screen.findByText(/Abra este link no Safari/)).toBeInTheDocument();
    expect(redeem).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
  it("stays on the error screen when redemption fails", async () => {
    redeem.mockRejectedValue(new Error("Link expirado"));
    mount();
    expect(await screen.findByText("Link expirado")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
