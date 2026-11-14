import { beforeEach, describe, expect, it, vi } from "vitest";
const { invoke, setSession } = vi.hoisted(() => ({ invoke: vi.fn(), setSession: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke }, auth: { setSession } } }));
import { createCheckoutLink, redeemCheckoutLink } from "./checkoutHandoff";

beforeEach(() => { vi.resetAllMocks(); });
describe("checkout links", () => {
  it("puts only the opaque ticket in the URL fragment", async () => {
    invoke.mockResolvedValue({ data: { ticket: "opaque-ticket", expiresAt: 12345 }, error: null });
    expect(await createCheckoutLink()).toEqual({
      url: "https://www.mandalario.app/auth/checkout#ticket=opaque-ticket", expiresAt: 12345,
    });
  });
  it("replaces an existing browser account with the ticket account", async () => {
    const session = { access_token: "incoming-access", refresh_token: "incoming-refresh" };
    invoke.mockResolvedValue({ data: { session }, error: null });
    setSession.mockResolvedValue({ error: null });
    await redeemCheckoutLink("ticket");
    expect(setSession).toHaveBeenCalledWith(session);
  });
  it("does not continue with a previously logged in account when redemption fails", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("used") });
    await expect(redeemCheckoutLink("used-ticket")).rejects.toThrow("expirou");
    expect(setSession).not.toHaveBeenCalled();
  });
});
