import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

import { checkPhoneAvailable } from "./checkPhoneAvailable";

const USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("checkPhoneAvailable", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("does not call RPC when phone has fewer than 10 digits", async () => {
    const result = await checkPhoneAvailable("(11) 9999", USER_ID);

    expect(result).toEqual({ ok: true, available: true });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("returns available when RPC returns true", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });

    const result = await checkPhoneAvailable("(11) 99999-9999", USER_ID);

    expect(result).toEqual({ ok: true, available: true });
    expect(rpcMock).toHaveBeenCalledWith("check_phone_available", {
      p_phone: "(11) 99999-9999",
      p_user_id: USER_ID,
    });
  });

  it("returns unavailable when RPC returns false", async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });

    const result = await checkPhoneAvailable("+5511999999999", USER_ID);

    expect(result).toEqual({ ok: true, available: false });
  });

  it("treats null RPC data as unavailable", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });

    const result = await checkPhoneAvailable("(11) 99999-9999", USER_ID);

    expect(result).toEqual({ ok: true, available: false });
  });

  it("ignores missing RPC (PGRST202) and allows save fallback", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function" },
    });

    const result = await checkPhoneAvailable("(11) 99999-9999", USER_ID);

    expect(result).toEqual({ ok: true, available: true });
  });

  it("ignores schema-cache RPC errors", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: "42883", message: "check_phone_available not in schema cache" },
    });

    const result = await checkPhoneAvailable("(11) 99999-9999", USER_ID);

    expect(result).toEqual({ ok: true, available: true });
  });

  it("returns error for unexpected RPC failures", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });

    const result = await checkPhoneAvailable("(11) 99999-9999", USER_ID);

    expect(result).toEqual({
      ok: false,
      error: { message: "permission denied" },
    });
  });
});
