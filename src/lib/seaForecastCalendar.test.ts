import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import {
  formatForecastDayLabel,
  getDefaultForecastDay,
  getForecastCalendarModifiers,
  getForecastDayDate,
  getForecastWeekStart,
  getRotatedForecastDays,
  isRotatedForecastDayToday,
  seaStatusToCondition,
} from "./seaForecastCalendar";

describe("seaStatusToCondition", () => {
  it("maps statuses to calendar legend keys", () => {
    expect(seaStatusToCondition("excelente")).toBe("good");
    expect(seaStatusToCondition("bom")).toBe("good");
    expect(seaStatusToCondition("medio")).toBe("medium");
    expect(seaStatusToCondition("ruim")).toBe("bad");
    expect(seaStatusToCondition("flat")).toBe("flat");
  });
});

describe("getForecastWeekStart", () => {
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");

  it("uses the current week for updates on Sunday through Friday", () => {
    expect(fmt(getForecastWeekStart(new Date(2026, 5, 7)))).toBe("2026-06-07"); // Sun
    expect(fmt(getForecastWeekStart(new Date(2026, 5, 9)))).toBe("2026-06-07"); // Tue
    expect(fmt(getForecastWeekStart(new Date(2026, 5, 12)))).toBe("2026-06-07"); // Fri
  });

  it("targets the next week when saving on Saturday", () => {
    expect(fmt(getForecastWeekStart(new Date(2026, 5, 13)))).toBe("2026-06-14");
  });
});

describe("getRotatedForecastDays", () => {
  const fmt = (entry: { dayId: string; date: Date }) =>
    `${entry.dayId} ${format(entry.date, "dd/MM")}`;

  it("starts from today and moves passed days to the end on the next week", () => {
    const weekStart = getForecastWeekStart(new Date(2026, 5, 10));
    const rotated = getRotatedForecastDays(weekStart, new Date(2026, 5, 10));

    expect(rotated.map(fmt)).toEqual([
      "qua 10/06",
      "qui 11/06",
      "sex 12/06",
      "sab 13/06",
      "dom 14/06",
      "seg 15/06",
      "ter 16/06",
    ]);
    expect(rotated.filter((d) => d.deferred).map((d) => d.dayId)).toEqual(["dom", "seg", "ter"]);
  });

  it("keeps chronological order when today is before the target week", () => {
    const weekStart = getForecastWeekStart(new Date(2026, 5, 13));
    const rotated = getRotatedForecastDays(weekStart, new Date(2026, 5, 13));

    expect(rotated.map(fmt)).toEqual([
      "dom 14/06",
      "seg 15/06",
      "ter 16/06",
      "qua 17/06",
      "qui 18/06",
      "sex 19/06",
      "sab 20/06",
    ]);
  });
});

describe("formatForecastDayLabel", () => {
  it("includes day and month next to the weekday label", () => {
    const weekStart = getForecastWeekStart(new Date(2026, 5, 9));
    expect(formatForecastDayLabel("seg", getForecastDayDate("seg", weekStart))).toBe("Seg 08/06");
    expect(formatForecastDayLabel("sab", getForecastDayDate("sab", weekStart))).toBe("Sáb 13/06");
  });
});

describe("getDefaultForecastDay", () => {
  const currentWeekForecast = {
    updated_at: "2026-06-09T15:00:00.000Z",
    seg: { status: "bom" as const },
  };
  const nextWeekForecast = {
    updated_at: "2026-06-13T15:00:00.000Z",
    seg: { status: "bom" as const },
  };

  it("selects today when inside the target week", () => {
    expect(getDefaultForecastDay(currentWeekForecast, new Date(2026, 5, 9))).toBe("ter");
  });

  it("selects the first day when today is Saturday before the next target week", () => {
    expect(getDefaultForecastDay(nextWeekForecast, new Date(2026, 5, 13))).toBe("dom");
  });

  it("marks today only on the rotated date", () => {
    const weekStart = getForecastWeekStart(new Date(2026, 5, 13));
    const rotated = getRotatedForecastDays(weekStart, new Date(2026, 5, 13));
    const sunday = rotated[0];
    expect(isRotatedForecastDayToday(sunday, new Date(2026, 5, 13))).toBe(false);
    expect(isRotatedForecastDayToday(sunday, new Date(2026, 5, 14))).toBe(true);
  });
});

describe("getForecastCalendarModifiers", () => {
  it("returns empty modifiers without updated_at", () => {
    const result = getForecastCalendarModifiers({
      seg: { status: "bom" },
    });
    expect(result.good).toHaveLength(0);
  });

  it("rotates calendar marks from the update day", () => {
    const data = {
      updated_at: "2026-06-09T15:00:00.000Z",
      dom: { status: "flat" as const },
      seg: { status: "bom" as const },
      ter: { status: "medio" as const },
      qua: { status: "ruim" as const },
      qui: { status: "excelente" as const },
      sex: { status: "bom" as const },
      sab: { status: "flat" as const },
    };

    const result = getForecastCalendarModifiers(data);
    const fmt = (d: Date) => format(d, "yyyy-MM-dd");

    expect(result.flat.map(fmt)).toEqual(["2026-06-13"]);
    expect(result.good.map(fmt)).toEqual(["2026-06-11", "2026-06-12"]);
    expect(result.medium.map(fmt)).toEqual(["2026-06-09"]);
    expect(result.bad.map(fmt)).toEqual(["2026-06-10"]);
  });

  it("maps to the next week when updated on Saturday", () => {
    const data = {
      updated_at: "2026-06-13T15:00:00.000Z",
      dom: { status: "flat" as const },
      seg: { status: "bom" as const },
      ter: { status: "medio" as const },
      qua: { status: "ruim" as const },
      qui: { status: "excelente" as const },
      sex: { status: "bom" as const },
      sab: { status: "flat" as const },
    };

    const result = getForecastCalendarModifiers(data);
    const fmt = (d: Date) => format(d, "yyyy-MM-dd");

    expect(result.flat.map(fmt)).toEqual(["2026-06-14", "2026-06-20"]);
    expect(result.good.map(fmt)).toEqual(["2026-06-15", "2026-06-18", "2026-06-19"]);
    expect(result.medium.map(fmt)).toEqual(["2026-06-16"]);
    expect(result.bad.map(fmt)).toEqual(["2026-06-17"]);
  });

  it("uses calendar_condition when set, overriding status", () => {
    const data = {
      updated_at: "2026-06-09T15:00:00.000Z",
      seg: { status: "bom" as const },
      ter: { status: "bom" as const, calendar_condition: "bad" as const },
    };

    const result = getForecastCalendarModifiers(data);
    expect(result.bad.map((d) => format(d, "yyyy-MM-dd"))).toEqual(["2026-06-09"]);
    expect(result.good).toHaveLength(0);
  });
});
