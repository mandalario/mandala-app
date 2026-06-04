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
