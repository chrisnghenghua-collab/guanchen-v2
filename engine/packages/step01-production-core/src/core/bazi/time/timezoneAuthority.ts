import moment from "moment-timezone";
import { assertCivilDateTime, type CivilDateTime } from "../calendar/gregorian.ts";
import { offsetMinutesAtInstant as intlOffsetMinutesAtInstant } from "./timezone.ts";

export type AuthorityLocalTimeResolution =
  | { status: "RESOLVED"; instantMs: number; offsetMinutes: number }
  | { status: "AMBIGUOUS_LOCAL_TIME"; candidates: Array<{ instantMs: number; offsetMinutes: number }> }
  | { status: "INVALID_LOCAL_TIME" }
  | { status: "UNKNOWN_TIMEZONE"; timezoneId: string };

export function timezoneAuthorityDataVersion(): string {
  return moment.tz.dataVersion;
}

function zoneOrNull(zoneId: string) {
  return moment.tz.zone(zoneId);
}

export function authorityOffsetMinutesAtInstant(instantMs: number, zoneId: string): number {
  const zone = zoneOrNull(zoneId);
  if (!zone) throw new Error(`UNKNOWN_TIMEZONE:${zoneId}`);
  // Moment's Zone#utcOffset is minutes west of UTC. Guancheng uses east-positive.
  return -zone.utcOffset(instantMs);
}

export function formatInstantInAuthorityZone(instantMs: number, zoneId: string): CivilDateTime {
  const zone = zoneOrNull(zoneId);
  if (!zone) throw new Error(`UNKNOWN_TIMEZONE:${zoneId}`);
  const v = moment.utc(instantMs).tz(zoneId);
  return {
    year: v.year(), month: v.month() + 1, day: v.date(),
    hour: v.hour(), minute: v.minute(), second: v.second(),
  };
}

function sameLocal(a: CivilDateTime, b: CivilDateTime): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute && (a.second ?? 0) === (b.second ?? 0);
}

/**
 * Resolve a local civil wall-clock time using pinned tzdb data.
 * We do not ask Moment to guess through gaps/overlaps. Instead every distinct
 * zone offset is treated as a candidate and is round-tripped back to local time.
 */
export function resolveLocalDateTimeAuthority(local: CivilDateTime, zoneId: string): AuthorityLocalTimeResolution {
  assertCivilDateTime(local);
  const zone = zoneOrNull(zoneId);
  if (!zone) return { status: "UNKNOWN_TIMEZONE", timezoneId: zoneId };

  const naiveMs = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second ?? 0);
  const eastPositiveOffsets = [...new Set(zone.offsets.map(offsetWest => -offsetWest))];
  const candidates: Array<{ instantMs: number; offsetMinutes: number }> = [];

  for (const offsetMinutes of eastPositiveOffsets) {
    const instantMs = naiveMs - offsetMinutes * 60_000;
    if (sameLocal(formatInstantInAuthorityZone(instantMs, zoneId), local)) {
      candidates.push({ instantMs, offsetMinutes });
    }
  }

  const unique = [...new Map(candidates.map(x => [x.instantMs, x])).values()].sort((a,b) => a.instantMs - b.instantMs);
  if (unique.length === 0) return { status: "INVALID_LOCAL_TIME" };
  if (unique.length > 1) return { status: "AMBIGUOUS_LOCAL_TIME", candidates: unique };
  return { status: "RESOLVED", ...unique[0] };
}

export function compareHostIntlToPinnedAuthority(instantMs: number, zoneId: string): {
  authorityOffsetMinutes: number;
  hostIntlOffsetMinutes: number;
  match: boolean;
} {
  const authorityOffsetMinutes = authorityOffsetMinutesAtInstant(instantMs, zoneId);
  const hostIntlOffsetMinutes = intlOffsetMinutesAtInstant(instantMs, zoneId);
  return { authorityOffsetMinutes, hostIntlOffsetMinutes, match: authorityOffsetMinutes === hostIntlOffsetMinutes };
}
