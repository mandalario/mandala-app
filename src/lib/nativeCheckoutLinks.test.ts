import { describe, expect, it } from "vitest";
import { getExternalCheckoutUrl } from "../../mobile/checkoutLinks";

describe("native checkout routing", () => {
  it.each(["mandalario.app", "www.mandalario.app"])("preserves personal tickets on %s", (host) => {
    const url = `https://${host}/auth/checkout#ticket=personal%2Bticket%3D`;
    expect(getExternalCheckoutUrl(url)).toBe(url);
  });

  it("keeps the selected class and removes app flags", () => {
    expect(getExternalCheckoutUrl("https://www.mandalario.app/packages?package=class-1&app=1&ios=1"))
      .toBe("https://www.mandalario.app/packages?package=class-1&checkout=1");
  });

  it("recognizes login links returning to the selected class", () => {
    expect(getExternalCheckoutUrl("https://www.mandalario.app/auth?next=%2Fpackages%3Fcheckout%3D1%26package%3Dclass-1"))
      .toBe("https://www.mandalario.app/packages?checkout=1&package=class-1");
  });

  it.each([
    "https://www.mandalario.app/auth/callback?code=oauth-code",
    "https://www.mandalario.app/adquirir-aulas",
    "https://other.example/auth/checkout#ticket=private",
    "https://www.mandalario.app/auth?next=https%3A%2F%2Fother.example%2Fpackages",
    "https://other.example@www.mandalario.app/auth/checkout",
    "http://www.mandalario.app/packages",
    "invalid-url",
  ])("leaves non-checkout and untrusted URLs to normal routing: %s", (url) => {
    expect(getExternalCheckoutUrl(url)).toBeNull();
  });
});
