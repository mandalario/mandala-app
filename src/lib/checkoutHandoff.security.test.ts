import { webcrypto } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHandler, type Dependencies } from "../../supabase/functions/checkout-handoff/handler";
import { issueTicket, readTicket } from "../../supabase/functions/checkout-handoff/ticket";

const secret = "server-only-test-secret";
beforeAll(() => vi.stubGlobal("crypto", webcrypto));
afterAll(() => vi.unstubAllGlobals());
const user = { id: "customer-a", email: "a@example.com", email_confirmed_at: "2026-01-01" };
const request = (body: unknown, authenticated = false) => new Request("https://example.com", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...(authenticated ? { Authorization: "Bearer valid-user-token" } : {}) },
  body: JSON.stringify(body),
});

function setup() {
  let used = false;
  const deps: Dependencies = {
    secret,
    getUser: vi.fn(async () => user),
    generateOtp: vi.fn(async () => ({ userId: user.id, tokenHash: "one-time-otp" })),
    redeemOtp: vi.fn(async () => {
      if (used) return null;
      used = true;
      return { access_token: "new-safari-access", refresh_token: "new-safari-refresh", user: { id: user.id } };
    }),
  };
  return { deps, handle: createHandler(deps) };
}

describe("checkout handoff security", () => {
  it("requires a verified session to issue a ticket and ignores a supplied victim email", async () => {
    const { handle, deps } = setup();
    expect((await handle(request({ action: "create" }))).status).toBe(401);
    expect(deps.generateOtp).not.toHaveBeenCalled();
    const response = await handle(request({ action: "create", email: "victim@example.com", userId: "victim" }, true));
    expect(response.status).toBe(200);
    expect(deps.generateOtp).toHaveBeenCalledWith(user.email);
    const result = await response.json();
    expect(result.ticket).not.toContain("one-time-otp");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects guests and users without confirmed email", async () => {
    const { handle, deps } = setup();
    vi.mocked(deps.getUser).mockResolvedValue({ ...user, email_confirmed_at: undefined });
    expect((await handle(request({ action: "create" }, true))).status).toBe(403);
    vi.mocked(deps.getUser).mockResolvedValue({ ...user, is_anonymous: true });
    expect((await handle(request({ action: "create" }, true))).status).toBe(403);
    expect(deps.generateOtp).not.toHaveBeenCalled();
  });

  it("redeems once without app authentication and creates a separate Safari session", async () => {
    const { handle } = setup();
    const { ticket } = await (await handle(request({ action: "create" }, true))).json();
    const response = await handle(request({ action: "redeem", ticket }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ session: { access_token: "new-safari-access", refresh_token: "new-safari-refresh" } });
    expect((await handle(request({ action: "redeem", ticket }))).status).toBe(400);
  });

  it("rejects expired tickets and modifications before calling Supabase", async () => {
    const { handle, deps } = setup();
    const expired = await issueTicket(user.id, "otp", secret, Date.now() - 300_001);
    expect((await handle(request({ action: "redeem", ticket: expired.ticket }))).status).toBe(400);
    const { ticket } = await issueTicket(user.id, "otp", secret);
    const modified = (ticket[0] === "A" ? "B" : "A") + ticket.slice(1);
    expect((await handle(request({ action: "redeem", ticket: modified }))).status).toBe(400);
    expect(deps.redeemOtp).not.toHaveBeenCalled();
    await expect(readTicket(ticket, "other-secret")).rejects.toThrow();
  });

  it("refuses an OTP generated for a different account", async () => {
    const { handle, deps } = setup();
    vi.mocked(deps.generateOtp).mockResolvedValue({ userId: "customer-b", tokenHash: "otp" });
    expect((await handle(request({ action: "create" }, true))).status).toBe(500);
  });
});
