import { addDaysToYmd, getScheduleNowParts } from "./slotSchedule";

/** Number of days shown in rolling week views (today + 6 ahead). */
export const ROLLING_WEEK_LENGTH = 7;

export type RollingWeekBounds = {
  /** Inclusive start date (today in school timezone). */
  startYmd: string;
  /** Inclusive end date (today + 6 in school timezone). */
  endYmd: string;
  /** Ordered YYYY-MM-DD strings from today through today + 6. */
  dates: string[];
  /** Local noon Date for the first day (safe for UI labels). */
  start: Date;
  /** Local noon Date for the last day (safe for UI labels). */
  end: Date;
};

export function ymdToLocalNoon(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`);
}

/**
 * Rolling 7-day window: today first, then the next 6 calendar days.
 * Weekdays that already passed this calendar week appear as their next occurrence
 * (e.g. on Monday the last slot is next Sunday, not last Sunday).
 */
export function getRollingWeekBounds(now = new Date()): RollingWeekBounds {
  const { date: startYmd } = getScheduleNowParts(now);
  const dates = Array.from({ length: ROLLING_WEEK_LENGTH }, (_, i) => addDaysToYmd(startYmd, i));
  const endYmd = dates[dates.length - 1];

  return {
    startYmd,
    endYmd,
    dates,
    start: ymdToLocalNoon(startYmd),
    end: ymdToLocalNoon(endYmd),
  };
}
