import * as AstronomyNS from "astronomy-engine";
// Works whether the host loads astronomy-engine as ES module or as CommonJS (Netlify, 2026-10-23). Same function either way.
const { SearchSunLongitude } = ("SearchSunLongitude" in AstronomyNS ? AstronomyNS : (AstronomyNS as any).default) as any;

export const SOLAR_TERMS = [
  { name: "小寒", longitude: 285, approxMonth: 1, approxDay: 5, kind: "JIE" },
  { name: "大寒", longitude: 300, approxMonth: 1, approxDay: 20, kind: "ZHONG_QI" },
  { name: "立春", longitude: 315, approxMonth: 2, approxDay: 4, kind: "JIE" },
  { name: "雨水", longitude: 330, approxMonth: 2, approxDay: 19, kind: "ZHONG_QI" },
  { name: "惊蛰", longitude: 345, approxMonth: 3, approxDay: 5, kind: "JIE" },
  { name: "春分", longitude: 0, approxMonth: 3, approxDay: 20, kind: "ZHONG_QI" },
  { name: "清明", longitude: 15, approxMonth: 4, approxDay: 4, kind: "JIE" },
  { name: "谷雨", longitude: 30, approxMonth: 4, approxDay: 20, kind: "ZHONG_QI" },
  { name: "立夏", longitude: 45, approxMonth: 5, approxDay: 5, kind: "JIE" },
  { name: "小满", longitude: 60, approxMonth: 5, approxDay: 21, kind: "ZHONG_QI" },
  { name: "芒种", longitude: 75, approxMonth: 6, approxDay: 5, kind: "JIE" },
  { name: "夏至", longitude: 90, approxMonth: 6, approxDay: 21, kind: "ZHONG_QI" },
  { name: "小暑", longitude: 105, approxMonth: 7, approxDay: 7, kind: "JIE" },
  { name: "大暑", longitude: 120, approxMonth: 7, approxDay: 22, kind: "ZHONG_QI" },
  { name: "立秋", longitude: 135, approxMonth: 8, approxDay: 7, kind: "JIE" },
  { name: "处暑", longitude: 150, approxMonth: 8, approxDay: 23, kind: "ZHONG_QI" },
  { name: "白露", longitude: 165, approxMonth: 9, approxDay: 7, kind: "JIE" },
  { name: "秋分", longitude: 180, approxMonth: 9, approxDay: 23, kind: "ZHONG_QI" },
  { name: "寒露", longitude: 195, approxMonth: 10, approxDay: 8, kind: "JIE" },
  { name: "霜降", longitude: 210, approxMonth: 10, approxDay: 23, kind: "ZHONG_QI" },
  { name: "立冬", longitude: 225, approxMonth: 11, approxDay: 7, kind: "JIE" },
  { name: "小雪", longitude: 240, approxMonth: 11, approxDay: 22, kind: "ZHONG_QI" },
  { name: "大雪", longitude: 255, approxMonth: 12, approxDay: 7, kind: "JIE" },
  { name: "冬至", longitude: 270, approxMonth: 12, approxDay: 21, kind: "ZHONG_QI" },
] as const;

export type SolarTermName = typeof SOLAR_TERMS[number]["name"];
export type SolarTermKind = typeof SOLAR_TERMS[number]["kind"];
export type SolarTermInstant = {
  name: SolarTermName;
  longitude: number;
  kind: SolarTermKind;
  gregorianYear: number;
  instantMs: number;
};

const TERM_BY_NAME = new Map<SolarTermName, typeof SOLAR_TERMS[number]>(
  SOLAR_TERMS.map((x) => [x.name, x])
);

const TERM_CACHE = new Map<string, SolarTermInstant>();
const JIE_YEAR_CACHE = new Map<number, SolarTermInstant[]>();

export function solarTermDefinition(name: SolarTermName) {
  const term = TERM_BY_NAME.get(name);
  if (!term) throw new Error(`Unknown solar term: ${name}`);
  return term;
}

/**
 * Astronomy Engine searches for the apparent geocentric solar longitude.
 * We give it a narrow 8-day window centered on the normal Gregorian date
 * of each term. This keeps SearchSunLongitude inside its recommended small
 * search interval while still covering natural year-to-year drift.
 */
export function solarTermInstantUtc(gregorianYear: number, name: SolarTermName): SolarTermInstant {
  if (!Number.isInteger(gregorianYear) || gregorianYear < 1 || gregorianYear > 9999) {
    throw new Error(`Invalid Gregorian year: ${gregorianYear}`);
  }
  const key = `${gregorianYear}|${name}`;
  const cached = TERM_CACHE.get(key);
  if (cached) return cached;

  const def = solarTermDefinition(name);
  const start = new Date(Date.UTC(gregorianYear, def.approxMonth - 1, def.approxDay - 4, 0, 0, 0));
  const found = SearchSunLongitude(def.longitude, start, 8);
  if (!found) throw new Error(`SOLAR_TERM_SEARCH_FAILED:${gregorianYear}:${name}`);
  const value = {
    name,
    longitude: def.longitude,
    kind: def.kind,
    gregorianYear,
    instantMs: found.date.getTime(),
  };
  TERM_CACHE.set(key, value);
  return value;
}

export function solarTermsForGregorianYear(gregorianYear: number): SolarTermInstant[] {
  return SOLAR_TERMS.map((x) => solarTermInstantUtc(gregorianYear, x.name));
}

export function jieTermsForGregorianYear(gregorianYear: number): SolarTermInstant[] {
  const cached = JIE_YEAR_CACHE.get(gregorianYear);
  if (cached) return cached;
  const value = SOLAR_TERMS
    .filter((x) => x.kind === "JIE")
    .map((x) => solarTermInstantUtc(gregorianYear, x.name));
  JIE_YEAR_CACHE.set(gregorianYear, value);
  return value;
}

export function liChunInstantUtc(gregorianYear: number): number {
  return solarTermInstantUtc(gregorianYear, "立春").instantMs;
}

function surroundingJie(instantMs: number): SolarTermInstant[] {
  if (!Number.isFinite(instantMs)) throw new Error("Invalid instant");
  const year = new Date(instantMs).getUTCFullYear();
  return [year - 1, year, year + 1]
    .flatMap(jieTermsForGregorianYear)
    .sort((a, b) => a.instantMs - b.instantMs);
}

/** Active Jie uses a half-open boundary: exact Jie instant belongs to the new month. */
export function activeJieAtInstant(instantMs: number): SolarTermInstant {
  const list = surroundingJie(instantMs).filter((x) => x.instantMs <= instantMs);
  const value = list.at(-1);
  if (!value) throw new Error("ACTIVE_JIE_NOT_FOUND");
  return value;
}

/** Strict previous/next Jie are used for Dayun target selection. */
export function strictPreviousJie(instantMs: number): SolarTermInstant {
  const list = surroundingJie(instantMs).filter((x) => x.instantMs < instantMs);
  const value = list.at(-1);
  if (!value) throw new Error("PREVIOUS_JIE_NOT_FOUND");
  return value;
}

export function strictNextJie(instantMs: number): SolarTermInstant {
  const value = surroundingJie(instantMs).find((x) => x.instantMs > instantMs);
  if (!value) throw new Error("NEXT_JIE_NOT_FOUND");
  return value;
}
