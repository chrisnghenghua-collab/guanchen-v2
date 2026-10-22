import { mod } from "../pillars/jiazi.ts";

export type CivilDate = { year: number; month: number; day: number };
export type CivilDateTime = CivilDate & { hour: number; minute: number; second?: number };

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4,6,9,11].includes(month) ? 30 : 31;
}

export function assertCivilDateTime(v: CivilDateTime): void {
  if (!Number.isInteger(v.year) || !Number.isInteger(v.month) || !Number.isInteger(v.day)) throw new Error("Invalid date");
  if (v.month < 1 || v.month > 12) throw new Error("Invalid month");
  if (v.day < 1 || v.day > daysInMonth(v.year, v.month)) throw new Error("Invalid day");
  if (v.hour < 0 || v.hour > 23 || v.minute < 0 || v.minute > 59 || (v.second ?? 0) < 0 || (v.second ?? 0) > 59) throw new Error("Invalid time");
}

export function gregorianJdn(date: CivilDate): number {
  const a = Math.floor((14 - date.month) / 12);
  const y = date.year + 4800 - a;
  const m = date.month + 12 * a - 3;
  return date.day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

// Modern Gregorian dates: sexagenary day index, 0 = 甲子.
// Calibrated to the conventional JDN relation (JDN + 49) mod 60.
export function dayJiaziIndexForGregorianDate(date: CivilDate): number {
  return mod(gregorianJdn(date) + 49, 60);
}

export function addDays(date: CivilDate, days: number): CivilDate {
  const ms = Date.UTC(date.year, date.month - 1, date.day + days);
  const d = new Date(ms);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function addCalendarComponents(
  base: CivilDateTime,
  add: { years?: number; months?: number; days?: number; hours?: number; minutes?: number }
): CivilDateTime {
  assertCivilDateTime(base);
  let year = base.year + (add.years ?? 0);
  let month = base.month;
  let day = Math.min(base.day, daysInMonth(year, month));

  const monthDelta = add.months ?? 0;
  if (monthDelta !== 0) {
    const total = year * 12 + (month - 1) + monthDelta;
    year = Math.floor(total / 12);
    month = mod(total, 12) + 1;
    day = Math.min(day, daysInMonth(year, month));
  }

  const baseMs = Date.UTC(year, month - 1, day, base.hour, base.minute, base.second ?? 0);
  const extraMs = (((add.days ?? 0) * 24 + (add.hours ?? 0)) * 60 + (add.minutes ?? 0)) * 60_000;
  const out = new Date(baseMs + extraMs);
  return {
    year: out.getUTCFullYear(),
    month: out.getUTCMonth() + 1,
    day: out.getUTCDate(),
    hour: out.getUTCHours(),
    minute: out.getUTCMinutes(),
    second: out.getUTCSeconds(),
  };
}
