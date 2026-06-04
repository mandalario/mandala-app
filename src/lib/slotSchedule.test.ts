import { describe, expect, it } from "vitest";
import { getScheduleNowParts, isSlotStartInPast } from "./slotSchedule";

describe("isSlotStartInPast", () => {
  it("blocks earlier time on the same day", () => {
    const now = new Date("2026-06-03T11:00:00.000Z"); // 08:00 in Rio (UTC-3)
    expect(isSlotStartInPast("2026-06-03", "07:00:00", now)).toBe(true);
    expect(isSlotStartInPast("2026-06-03", "08:00:00", now)).toBe(false);
  });

  it("blocks previous days", () => {
    const now = new Date("2026-06-03T15:00:00.000Z");
    expect(isSlotStartInPast("2026-06-02", "18:00:00", now)).toBe(true);
  });

  it("allows future days", () => {
    const now = new Date("2026-06-03T15:00:00.000Z");
    expect(isSlotStartInPast("2026-06-04", "07:00:00", now)).toBe(false);
  });
});

describe("getScheduleNowParts", () => {
  it("returns Rio calendar date", () => {
    const parts = getScheduleNowParts(new Date("2026-06-03T11:30:00.000Z"));
    expect(parts.date).toBe("2026-06-03");
    expect(parts.minutes).toBe(8 * 60 + 30);
  });
});
