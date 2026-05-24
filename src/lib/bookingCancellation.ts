import { endOfDay, subDays } from "date-fns";

/** Last moment for a student to cancel and get their credit back (23:59:59 on the day before class). */
export function getCancellationRefundDeadline(classDate: string): Date {
  const classDay = new Date(`${classDate}T12:00:00`);
  return endOfDay(subDays(classDay, 1));
}

export function isCancellationRefundable(classDate: string, now = new Date()): boolean {
  return now.getTime() <= getCancellationRefundDeadline(classDate).getTime();
}
