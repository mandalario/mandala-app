import { addDays, format, startOfDay, startOfWeek } from "date-fns";

export type SeaStatus = "excelente" | "bom" | "medio" | "ruim" | "flat";
export type SurfConditionKey = "good" | "medium" | "bad" | "flat";

export type DaySeaForecast = {
  status?: SeaStatus;
  calendar_condition?: SurfConditionKey | null;
};

export const CALENDAR_CONDITION_LABELS: Record<SurfConditionKey, string> = {
  good: "Mar bom",
  medium: "Mar médio",
  bad: "Mar ruim",
  flat: "Sem ondas",
};

export const SURF_CONDITION_KEYS: SurfConditionKey[] = ["good", "medium", "bad", "flat"];

export const CALENDAR_CONDITION_LEGEND_CLASSES: Record<
  SurfConditionKey,
  { dot: string; active: string; inactive: string }
> = {
  good: {
    dot: "bg-success",
    active: "bg-success/20 text-emerald-100 border-success/45 ring-1 ring-success/30",
    inactive: "text-sky-200/45 border-white/10",
  },
  medium: {
    dot: "bg-warning",
    active: "bg-warning/20 text-amber-100 border-warning/45 ring-1 ring-warning/30",
    inactive: "text-sky-200/45 border-white/10",
  },
  bad: {
    dot: "bg-destructive",
    active: "bg-destructive/20 text-rose-100 border-destructive/45 ring-1 ring-destructive/30",
    inactive: "text-sky-200/45 border-white/10",
  },
  flat: {
    dot: "bg-muted-foreground",
    active: "bg-white/10 text-sky-100 border-white/25 ring-1 ring-white/20",
    inactive: "text-sky-200/45 border-white/10",
  },
};

export const CALENDAR_CONDITION_DOT_COLORS: Record<SurfConditionKey, string> = Object.fromEntries(
  SURF_CONDITION_KEYS.map((key) => [key, CALENDAR_CONDITION_LEGEND_CLASSES[key].dot]),
) as Record<SurfConditionKey, string>;

export const FORECAST_UNCONFIGURED_KEY = "unconfigured" as const;
export type ForecastCalendarModifierKey = SurfConditionKey | typeof FORECAST_UNCONFIGURED_KEY;

export const FORECAST_UNCONFIGURED_DOT_CLASS = "bg-white ring-1 ring-black/25";
export const FORECAST_UNCONFIGURED_LABEL = "Não configurado";

export const FORECAST_UNCONFIGURED_LEGEND_CLASSES = {
  dot: FORECAST_UNCONFIGURED_DOT_CLASS,
  active: "bg-white/15 text-white border-white/40 ring-1 ring-white/25",
  inactive: "text-sky-200/45 border-white/10",
};

export function getDayCalendarCondition(day: DaySeaForecast | undefined | null): SurfConditionKey | null {
  if (!day || typeof day !== "object") return null;
  if (day.calendar_condition === null) return null;
  if (day.calendar_condition) return day.calendar_condition;
  if (day.status) return seaStatusToCondition(day.status);
  return null;
}

export function getRotatedDayCalendarCondition(
  day: DaySeaForecast | undefined | null,
  entry: Pick<RotatedForecastDay, "deferred">,
): SurfConditionKey | null {
  if (entry.deferred) return null;
  return getDayCalendarCondition(day);
}

export function getForecastDayDotClass(
  condition: SurfConditionKey | null,
  options?: { unconfigured?: boolean },
): string {
  if (options?.unconfigured || !condition) return FORECAST_UNCONFIGURED_DOT_CLASS;
  return CALENDAR_CONDITION_DOT_COLORS[condition];
}

export const FORECAST_DAY_IDS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
export type ForecastDayId = (typeof FORECAST_DAY_IDS)[number];

/** Monday-first order for forecast editors and student day picker. */
export const FORECAST_EDITOR_DAY_IDS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const;

export const FORECAST_DAY_LABELS: Record<ForecastDayId, string> = {
  dom: "Dom",
  seg: "Seg",
  ter: "Ter",
  qua: "Qua",
  qui: "Qui",
  sex: "Sex",
  sab: "Sáb",
};
export type WeeklySeaForecast = Record<string, DaySeaForecast | string | undefined> & {
  updated_at?: string;
};

/** True when the day has an explicit forecast entry in stored weekly data. */
export function isForecastDayConfigured(
  data: WeeklySeaForecast | null | undefined,
  dayId: ForecastDayId,
): boolean {
  if (!data || typeof data !== "object") return false;
  const day = data[dayId];
  return !!day && typeof day === "object" && getDayCalendarCondition(day) !== null;
}

export function seaStatusToCondition(status: SeaStatus): SurfConditionKey {
  if (status === "excelente" || status === "bom") return "good";
  if (status === "medio") return "medium";
  if (status === "ruim") return "bad";
  return "flat";
}

export function isWeeklySeaForecast(data: unknown): data is WeeklySeaForecast {
  return typeof data === "object" && data !== null && "seg" in data;
}

export function parseWeeklySeaForecast(raw: string | null | undefined): WeeklySeaForecast | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isWeeklySeaForecast(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Returns the Sunday that starts the calendar week the forecast applies to.
 * On Saturday (last day of the Sun–Sat week), the next save targets the upcoming week.
 */
export function getForecastWeekStart(referenceDate: Date): Date {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 0 });
  if (referenceDate.getDay() === 6) {
    return addDays(weekStart, 7);
  }
  return weekStart;
}

export function getForecastTargetWeekStart(
  data: WeeklySeaForecast | null | undefined,
  now: Date = new Date(),
): Date {
  if (data?.updated_at) {
    const updatedAt = new Date(data.updated_at);
    if (!Number.isNaN(updatedAt.getTime())) {
      return getForecastWeekStart(updatedAt);
    }
  }
  return startOfWeek(now, { weekStartsOn: 0 });
}

export function getForecastDayDate(dayId: ForecastDayId, weekStart: Date): Date {
  const index = FORECAST_DAY_IDS.indexOf(dayId);
  return addDays(weekStart, index);
}

export function formatForecastDayLabel(
  dayId: ForecastDayId,
  date: Date,
  dateFormat = "dd/MM",
): string {
  return `${FORECAST_DAY_LABELS[dayId]} ${format(date, dateFormat)}`;
}

export type RotatedForecastDay = {
  dayId: ForecastDayId;
  date: Date;
  /** Passed days shown at the end for a future edit — not painted on the calendar yet. */
  deferred: boolean;
};

/**
 * Rotates the forecast week starting from today. Days already passed move to the end
 * with dates from the following week (e.g. on Wed: Qua→today, …, Dom/Seg/Ter→next week).
 */
export function getRotatedForecastDays(
  weekStart: Date,
  now: Date = new Date(),
): RotatedForecastDay[] {
  const weekStartDay = startOfDay(weekStart);
  const weekEndDay = startOfDay(addDays(weekStart, 6));
  const today = startOfDay(now);
  const chronologicalIds = [...FORECAST_DAY_IDS];

  if (today < weekStartDay || today > weekEndDay) {
    return chronologicalIds.map((dayId) => ({
      dayId,
      date: getForecastDayDate(dayId, weekStart),
      deferred: false,
    }));
  }

  const todayDayId = FORECAST_DAY_IDS[now.getDay()];
  const todayIndex = chronologicalIds.indexOf(todayDayId);
  const remaining = chronologicalIds.slice(todayIndex);
  const passed = chronologicalIds.slice(0, todayIndex);

  return [
    ...remaining.map((dayId) => ({
      dayId,
      date: getForecastDayDate(dayId, weekStart),
      deferred: false,
    })),
    ...passed.map((dayId) => ({
      dayId,
      date: addDays(getForecastDayDate(dayId, weekStart), 7),
      deferred: true,
    })),
  ];
}

export function isRotatedForecastDayToday(
  entry: RotatedForecastDay,
  now: Date = new Date(),
): boolean {
  return format(startOfDay(entry.date), "yyyy-MM-dd") === format(startOfDay(now), "yyyy-MM-dd");
}

/** Picks the day tab based on the forecast target week (same rotation as the calendar). */
export function getDefaultForecastDay(
  data: WeeklySeaForecast | null | undefined,
  now: Date = new Date(),
): ForecastDayId {
  const weekStart = getForecastTargetWeekStart(data, now);
  const rotated = getRotatedForecastDays(weekStart, now);
  const todayEntry = rotated.find((entry) => isRotatedForecastDayToday(entry, now));
  return todayEntry?.dayId ?? rotated[0]?.dayId ?? "dom";
}

/** Maps forecast days to calendar dot colors, including white for unconfigured future days. */
export function getForecastCalendarModifiers(
  data: WeeklySeaForecast | null | undefined,
  now: Date = new Date(),
): Record<ForecastCalendarModifierKey, Date[]> {
  const result: Record<ForecastCalendarModifierKey, Date[]> = {
    good: [],
    medium: [],
    bad: [],
    flat: [],
    unconfigured: [],
  };

  if (!data?.updated_at || !isWeeklySeaForecast(data)) return result;

  const updatedAt = new Date(data.updated_at);
  if (Number.isNaN(updatedAt.getTime())) return result;

  const weekStart = getForecastWeekStart(updatedAt);
  const weekEnd = startOfDay(addDays(weekStart, 6));
  const today = startOfDay(now);
  const rotatedDays = getRotatedForecastDays(weekStart, now);

  if (today > weekEnd) {
    for (let i = 0; i < 56; i++) {
      result.unconfigured.push(addDays(today, i));
    }
    return result;
  }

  for (const entry of rotatedDays) {
    const { dayId, date, deferred } = entry;
    if (startOfDay(date) < today) continue;

    const dayEntry = data[dayId];
    const condition = getRotatedDayCalendarCondition(
      dayEntry && typeof dayEntry === "object" ? dayEntry : null,
      { deferred },
    );

    if (!condition) {
      result.unconfigured.push(date);
    } else {
      result[condition].push(date);
    }
  }

  return result;
}

export const CALENDAR_CONDITION_DOT_CLASSES: Record<ForecastCalendarModifierKey, string> = {
  good: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-success after:rounded-full",
  medium: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-warning after:rounded-full",
  bad: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-destructive after:rounded-full",
  flat: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-muted-foreground after:rounded-full",
  unconfigured:
    "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-white after:shadow-[0_0_0_1px_rgba(0,0,0,0.35)]",
};
