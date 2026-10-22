import { addCalendarComponents, type CivilDateTime } from "../calendar/gregorian.ts";

export type LuckStartAge = { years: number; months: number; days: number; hours: number };

export function intervalMinutesToLuckStartAge(sourceIntervalMinutes: number): LuckStartAge {
  if (!Number.isFinite(sourceIntervalMinutes) || sourceIntervalMinutes < 0) throw new Error("Invalid interval");
  let remaining = Math.round(sourceIntervalMinutes);
  const years = Math.floor(remaining / 4320); remaining %= 4320;
  const months = Math.floor(remaining / 360); remaining %= 360;
  const days = Math.floor(remaining / 12); remaining %= 12;
  const hours = remaining * 2;
  return { years, months, days, hours };
}

export function firstLuckStartLocal(birthLocal: CivilDateTime, age: LuckStartAge): CivilDateTime {
  return addCalendarComponents(birthLocal, age);
}

export function dayunBoundaryFromAnchor(firstStartLocal: CivilDateTime, periodIndex: number): CivilDateTime {
  if (!Number.isInteger(periodIndex) || periodIndex < 0) throw new Error("Invalid periodIndex");
  return addCalendarComponents(firstStartLocal, { years: periodIndex * 10 });
}
