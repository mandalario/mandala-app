import { describe, expect, it } from "vitest";
import { getRollingWeekBounds } from "./rollingWeek";

describe("getRollingWeekBounds", () => {
  it("starts on today and spans 7 days forward", () => {
    const now = new Date("2026-06-10T15:00:00.000Z"); // Wednesday in Rio
    const { startYmd, endYmd, dates } = getRollingWeekBounds(now);

    expect(startYmd).toBe("2026-06-10");
    expect(endYmd).toBe("2026-06-16");
    expect(dates).toEqual([
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
      "2026-06-13",
      "2026-06-14",
      "2026-06-15",
      "2026-06-16",
    ]);
  });

  it("on Monday ends on next Sunday, not the past one", () => {
    const now = new Date("2026-06-08T15:00:00.000Z"); // Monday in Rio
    const { dates } = getRollingWeekBounds(now);

    expect(dates[0]).toBe("2026-06-08");
    expect(dates[6]).toBe("2026-06-14"); // next Sunday
  });
});
