import { describe, expect, it } from "vitest";
import {
  addDaysToYmd,
  getDefaultScheduleViewDate,
  getScheduleNowParts,
  isLastSlotOfDayPassed,
  isSlotStartInPast,
} from "./slotSchedule";

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

describe("isLastSlotOfDayPassed", () => {
  const slots = [
    { date: "2026-06-03", start_time: "08:00" },
    { date: "2026-06-03", start_time: "18:00" },
  ];

  it("is false before the last slot starts", () => {
    const now = new Date("2026-06-03T20:00:00.000Z"); // 17:00 Rio
    expect(isLastSlotOfDayPassed(slots, "2026-06-03", now)).toBe(false);
  });

  it("is true after the last slot starts", () => {
    const now = new Date("2026-06-03T22:00:00.000Z"); // 19:00 Rio
    expect(isLastSlotOfDayPassed(slots, "2026-06-03", now)).toBe(true);
  });

  it("is false when the day has no slots", () => {
    const now = new Date("2026-06-03T22:00:00.000Z");
    expect(isLastSlotOfDayPassed(slots, "2026-06-04", now)).toBe(false);
  });
});

describe("getDefaultScheduleViewDate", () => {
  it("returns today while slots remain", () => {
    const now = new Date("2026-06-03T20:00:00.000Z");
    const slots = [{ date: "2026-06-03", start_time: "18:00" }];
    expect(getDefaultScheduleViewDate(slots, now)).toBe("2026-06-03");
  });

  it("returns tomorrow after the last slot of today", () => {
    const now = new Date("2026-06-03T22:00:00.000Z");
    const slots = [{ date: "2026-06-03", start_time: "18:00" }];
    expect(getDefaultScheduleViewDate(slots, now)).toBe("2026-06-04");
  });
});

describe("addDaysToYmd", () => {
  it("adds days across month boundaries", () => {
    expect(addDaysToYmd("2026-06-30", 1)).toBe("2026-07-01");
  });
});
