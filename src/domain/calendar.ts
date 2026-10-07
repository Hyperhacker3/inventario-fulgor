/** Calendar arithmetic uses UTC, so daylight-saving changes cannot shift a date. */
export function calendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}
export const calendarISO = (date: Date) => date.toISOString().slice(0, 10);
export function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function shiftCalendarDay(value: string, days: number) {
  const date = calendarDate(value)!;
  date.setUTCDate(date.getUTCDate() + days);
  return calendarISO(date);
}
export function shiftCalendarMonth(value: string, months: number) {
  const date = calendarDate(value)!;
  const day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return calendarISO(date);
}
export function calendarCells(month: string) {
  const first = `${month.slice(0, 7)}-01`;
  const mondayOffset = (calendarDate(first)!.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => shiftCalendarDay(first, index - mondayOffset));
}
export const dateInRange = (value: string, min?: string, max?: string) => (!min || value >= min) && (!max || value <= max);
export function calendarLabel(value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Intl.DateTimeFormat('es-CO', { ...options, timeZone: 'UTC' }).format(calendarDate(value)!);
}
