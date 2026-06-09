import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import {
  getForecastCalendarModifiers,
  getForecastWeekStart,
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

describe("getForecastCalendarModifiers", () => {
  it("returns empty modifiers without updated_at", () => {
    const result = getForecastCalendarModifiers({
      seg: { status: "bom" },
    });
    expect(result.good).toHaveLength(0);
  });

  it("marks only the week containing updated_at", () => {
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

    expect(result.flat.map(fmt)).toEqual(["2026-06-07", "2026-06-13"]);
    expect(result.good.map(fmt)).toEqual(["2026-06-08", "2026-06-11", "2026-06-12"]);
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
    expect(result.good.map((d) => format(d, "yyyy-MM-dd"))).toEqual(["2026-06-08"]);
  });
});
