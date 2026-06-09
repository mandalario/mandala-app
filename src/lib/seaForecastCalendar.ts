import { addDays, startOfWeek } from "date-fns";

export type SeaStatus = "excelente" | "bom" | "medio" | "ruim" | "flat";
export type SurfConditionKey = "good" | "medium" | "bad" | "flat";

export type DaySeaForecast = {
  status?: SeaStatus;
  calendar_condition?: SurfConditionKey;
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

export const FORECAST_DAY_IDS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
export const FORECAST_DAY_LABELS: Record<(typeof FORECAST_DAY_IDS)[number], string> = {
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

const DAY_IDS = FORECAST_DAY_IDS;

export function getDayCalendarCondition(day: DaySeaForecast): SurfConditionKey | null {
  if (day.calendar_condition) return day.calendar_condition;
  if (day.status) return seaStatusToCondition(day.status);
  return null;
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

/** Maps the 7 days of the week when the forecast was last updated to calendar condition colors. */
export function getForecastCalendarModifiers(
  data: WeeklySeaForecast | null | undefined,
): Record<SurfConditionKey, Date[]> {
  const result: Record<SurfConditionKey, Date[]> = {
    good: [],
    medium: [],
    bad: [],
    flat: [],
  };

  if (!data?.updated_at || !isWeeklySeaForecast(data)) return result;

  const updatedAt = new Date(data.updated_at);
  if (Number.isNaN(updatedAt.getTime())) return result;

  const weekStart = getForecastWeekStart(updatedAt);

  for (let i = 0; i < 7; i++) {
    const dayId = DAY_IDS[i];
    const dayEntry = data[dayId];
    if (!dayEntry || typeof dayEntry !== "object") continue;
    const condition = getDayCalendarCondition(dayEntry);
    if (!condition) continue;
    result[condition].push(addDays(weekStart, i));
  }

  return result;
}

export const CALENDAR_CONDITION_DOT_CLASSES: Record<SurfConditionKey, string> = {
  good: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-success after:rounded-full",
  medium: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-warning after:rounded-full",
  bad: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-destructive after:rounded-full",
  flat: "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-muted-foreground after:rounded-full",
};
