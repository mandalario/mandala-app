/** Same timezone used in booking triggers (Rio). */
export const SCHEDULE_TIMEZONE = "America/Sao_Paulo";

export function parseTimeToMinutes(startTime: string): number {
  const [h, m] = startTime.split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

export function getScheduleNowParts(now = new Date()): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: SCHEDULE_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: parseInt(parts.hour!, 10) * 60 + parseInt(parts.minute!, 10),
  };
}

/** True when class start is strictly before "now" in the school timezone. */
export function isSlotStartInPast(date: string, startTime: string, now = new Date()): boolean {
  const { date: today, minutes: nowMinutes } = getScheduleNowParts(now);
  if (date < today) return true;
  if (date > today) return false;
  return parseTimeToMinutes(startTime) < nowMinutes;
}

export type SlotDateTime = { date: string; start_time: string };

export function addDaysToYmd(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True when the day has at least one slot and its latest start time is already past. */
export function isLastSlotOfDayPassed(slots: SlotDateTime[], day: string, now = new Date()): boolean {
  const daySlots = slots.filter((s) => s.date === day);
  if (daySlots.length === 0) return false;

  const latestMinutes = Math.max(...daySlots.map((s) => parseTimeToMinutes(s.start_time)));
  const latestSlot = daySlots.find((s) => parseTimeToMinutes(s.start_time) === latestMinutes)!;
  return isSlotStartInPast(day, latestSlot.start_time, now);
}

/** Default calendar day: first day from today with a bookable slot, else today/tomorrow fallback. */
export function getDefaultScheduleViewDate(slots: SlotDateTime[], now = new Date()): string {
  const { date: today } = getScheduleNowParts(now);
  const dates = [...new Set(slots.map((s) => s.date))]
    .filter((d) => d >= today)
    .sort();

  for (const date of dates) {
    const hasUpcoming = slots
      .filter((s) => s.date === date)
      .some((s) => !isSlotStartInPast(s.date, s.start_time, now));
    if (hasUpcoming) return date;
  }

  if (slots.some((s) => s.date === today) && isLastSlotOfDayPassed(slots, today, now)) {
    return addDaysToYmd(today, 1);
  }
  return today;
}
