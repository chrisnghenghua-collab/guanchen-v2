import { LunarDay, LunarYear, SolarDay } from "tyme4ts";
import type { CivilDate } from "./gregorian.ts";

export type LunarDate = {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
};

export type LunarConversionResult =
  | { status: "OK"; solar: CivilDate; lunar: LunarDate }
  | { status: "INVALID_LUNAR_DATE"; message: string };

export function leapMonthOfLunarYear(year: number): number {
  return LunarYear.fromYear(year).getLeapMonth();
}

export function solarToLunar(date: CivilDate): LunarDate {
  const lunar = SolarDay.fromYmd(date.year, date.month, date.day).getLunarDay();
  const month = lunar.getLunarMonth();
  return {
    year: lunar.getYear(),
    month: month.getMonth(),
    day: lunar.getDay(),
    isLeapMonth: month.isLeap(),
  };
}

export function lunarToSolar(date: LunarDate): LunarConversionResult {
  try {
    const signedMonth = date.isLeapMonth ? -Math.abs(date.month) : Math.abs(date.month);
    const lunar = LunarDay.fromYmd(date.year, signedMonth, date.day);
    const solar = lunar.getSolarDay();
    return {
      status: "OK",
      solar: { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() },
      lunar: { ...date, month: Math.abs(date.month) },
    };
  } catch (error) {
    return {
      status: "INVALID_LUNAR_DATE",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
