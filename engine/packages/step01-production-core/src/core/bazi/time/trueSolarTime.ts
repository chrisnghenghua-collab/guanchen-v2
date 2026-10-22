import type { CivilDateTime } from "../calendar/gregorian.ts";

export type EquationOfTimeProvider = (instantMs: number) => number; // minutes; apparent - mean solar time

function dayOfYearUtc(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86400000) + 1;
}

/**
 * NOAA-style approximation retained only as an independent cross-check.
 * Release-path code should pass astronomyEquationOfTimeMinutes explicitly.
 */
export const noaaApproxEquationOfTimeMinutes: EquationOfTimeProvider = (instantMs) => {
  const d = new Date(instantMs);
  const n = dayOfYearUtc(d);
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const gamma = (2 * Math.PI / 365) * (n - 1 + (hour - 12) / 24);
  return 229.18 * (
    0.000075 +
    0.001868 * Math.cos(gamma) -
    0.032077 * Math.sin(gamma) -
    0.014615 * Math.cos(2 * gamma) -
    0.040849 * Math.sin(2 * gamma)
  );
};

export function apparentSolarOffsetMinutesFromUtc(
  instantMs: number,
  longitudeDegEast: number,
  eotProvider: EquationOfTimeProvider
): number {
  return longitudeDegEast * 4 + eotProvider(instantMs);
}

export function localApparentSolarDateTime(
  instantMs: number,
  longitudeDegEast: number,
  eotProvider: EquationOfTimeProvider
): CivilDateTime {
  const offsetMin = apparentSolarOffsetMinutesFromUtc(instantMs, longitudeDegEast, eotProvider);
  const d = new Date(instantMs + offsetMin * 60_000);
  return {
    year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
    hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
  };
}
