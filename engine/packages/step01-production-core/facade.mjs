// Server orchestration only. Recovered algorithms remain byte-for-byte frozen.
import { readFileSync } from 'node:fs';
import { assertCivilDateTime } from './src/core/bazi/calendar/gregorian.ts';
import { lunarToSolar, solarToLunar } from './src/core/bazi/calendar/lunarCalendar.ts';
import { baziYearPillarForInstant, baziMonthPillarForInstant, luckTargetJieForInstant } from './src/core/bazi/calendar/authorityCalendar.ts';
import { resolveLocalDateTimeAuthority, timezoneAuthorityDataVersion } from './src/core/bazi/time/timezoneAuthority.ts';
import { astronomyEquationOfTimeMinutes } from './src/core/bazi/time/astronomyEquationOfTime.ts';
import { localApparentSolarDateTime } from './src/core/bazi/time/trueSolarTime.ts';
import { resolveDayHourPillars } from './src/core/bazi/pillars/dayHour.ts';
import { luckDirection } from './src/core/bazi/luck/luckDirection.ts';
import { dayunSequence } from './src/core/bazi/luck/dayunSequence.ts';
import { intervalMinutesToLuckStartAge, firstLuckStartLocal, dayunBoundaryFromAnchor } from './src/core/bazi/luck/luckStart.ts';
import { BA_ZI_RULE_AUTHORITY } from './src/core/bazi/authority/ruleAuthority.ts';

const catalog = JSON.parse(readFileSync(new URL('./data/locations.v2.json', import.meta.url), 'utf8')).records;
const locations = new Map(catalog.map(row => [row.id, row]));
// P2-01 2026-10-22 (approved by Chris): 12 Dayun periods (~120 years) instead of 8, so older users are no longer rejected.
const DAYUN_PERIODS = 12;
const reject = (code, extra = {}) => ({ status: 'REJECTED', code, ...extra });
const unsupported = code => ({ status: 'UNSUPPORTED', code });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value, allowed) => object(value) && Object.keys(value).every(key => allowed.includes(key));
const preferenceValid = value => value === undefined || value === 'EARLIER' || value === 'LATER';
function civilValid(value) {
  if (!keys(value, ['year', 'month', 'day', 'hour', 'minute', 'second'])) return false;
  if (!['year', 'month', 'day', 'hour', 'minute'].every(key => Number.isInteger(value[key]))) return false;
  if (value.second !== undefined && !Number.isInteger(value.second)) return false;
  if (value.year < 1 || value.year > 9999) return false;
  try { assertCivilDateTime(value); return true; } catch { return false; }
}
function choose(local, timezone, preference, field) {
  const resolution = resolveLocalDateTimeAuthority(local, timezone);
  if (resolution.status === 'RESOLVED') return resolution;
  if (resolution.status === 'AMBIGUOUS_LOCAL_TIME' && preference) {
    return { status: 'RESOLVED', ...resolution.candidates[preference === 'EARLIER' ? 0 : resolution.candidates.length - 1] };
  }
  return reject(resolution.status, { field, resolution });
}
function supportedInstant(instantMs) {
  const year = new Date(instantMs).getUTCFullYear();
  // Source uses Date.UTC and searches year +/- 1. Years 0..99 are unsafe
  // in Date.UTC; the source solar-term authority accepts at most 9999.
  return Number.isFinite(instantMs) && year >= 101 && year <= 9998;
}
function resolveAsOf(asOf, timezone) {
  if (keys(asOf, ['instantUTC']) && typeof asOf.instantUTC === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(asOf.instantUTC)) return reject('INVALID_ASOF');
    const instantMs = Date.parse(asOf.instantUTC);
    if (!Number.isFinite(instantMs) || new Date(instantMs).toISOString() !== asOf.instantUTC.replace(/(?<=:\d{2})Z$/, '.000Z')) return reject('INVALID_ASOF');
    return { status: 'RESOLVED', instantMs };
  }
  if (!keys(asOf, ['local', 'ambiguousTimePreference']) || !civilValid(asOf.local) || !preferenceValid(asOf.ambiguousTimePreference)) return reject('INVALID_ASOF');
  if (asOf.local.year < 101) return unsupported('UNSUPPORTED_CALENDAR_RANGE');
  return choose(asOf.local, timezone, asOf.ambiguousTimePreference, 'asOf');
}

/** Narrow internal computational port, not the public product request schema. */
export function computeStep01(request) {
  if (!keys(request, ['birth', 'location', 'asOf'])) return reject('INVALID_REQUEST');
  const { birth, location: locationId, asOf } = request;
  if (typeof locationId !== 'string' || !locations.has(locationId)) return reject('UNKNOWN_LOCATION_ID');
  const location = locations.get(locationId);
  if (!keys(birth, ['calendar', 'time', 'gender', 'timeMode', 'ambiguousTimePreference']) ||
      !['MALE', 'FEMALE'].includes(birth.gender) || !['STANDARD_TIME', 'TRUE_SOLAR_TIME'].includes(birth.timeMode) ||
      !preferenceValid(birth.ambiguousTimePreference) || !keys(birth.calendar, ['type', 'date']) ||
      !['SOLAR', 'LUNAR'].includes(birth.calendar.type) || !keys(birth.time, ['hour', 'minute', 'second']) ||
      (birth.time.second !== undefined && !Number.isInteger(birth.time.second))) return reject('INVALID_BIRTH');
  const date = birth.calendar.date;
  const lunar = birth.calendar.type === 'LUNAR';
  if (!keys(date, lunar ? ['year', 'month', 'day', 'isLeapMonth'] : ['year', 'month', 'day']) ||
      !['year', 'month', 'day'].every(key => Number.isInteger(date[key])) || date.month < 1 || date.month > 12 || date.day < 1 ||
      (lunar && (date.day > 30 || typeof date.isLeapMonth !== 'boolean'))) return reject('INVALID_CALENDAR_DATE');
  if (date.year < 101 || date.year > 9998) return unsupported('UNSUPPORTED_CALENDAR_RANGE');
  const conversion = lunar ? lunarToSolar(date) : { status: 'OK', solar: date };
  if (conversion.status !== 'OK') return reject('INVALID_LUNAR_DATE');
  const civilDateTime = { ...conversion.solar, ...birth.time, second: birth.time.second ?? 0 };
  if (!civilValid(civilDateTime)) return reject('INVALID_CIVIL_DATE_TIME');
  const chosenBirth = choose(civilDateTime, location.timezone, birth.ambiguousTimePreference, 'birth');
  if (chosenBirth.status !== 'RESOLVED') return chosenBirth;
  const chosenAsOf = resolveAsOf(asOf, location.timezone);
  if (chosenAsOf.status !== 'RESOLVED') return chosenAsOf;
  if (!supportedInstant(chosenBirth.instantMs) || !supportedInstant(chosenAsOf.instantMs)) return unsupported('UNSUPPORTED_CALENDAR_RANGE');
  if (timezoneAuthorityDataVersion() !== '2026c') return reject('TIMEZONE_AUTHORITY_MISMATCH');
  try {
    const instantMs = chosenBirth.instantMs;
    const year = baziYearPillarForInstant(instantMs);
    const month = baziMonthPillarForInstant(instantMs);
    const trueSolarTime = localApparentSolarDateTime(instantMs, location.longitude, astronomyEquationOfTimeMinutes);
    const workingDateTime = birth.timeMode === 'TRUE_SOLAR_TIME' ? trueSolarTime : civilDateTime;
    const dayHour = resolveDayHourPillars(workingDateTime);
    const direction = luckDirection(year.index % 10, birth.gender);
    const targetJie = luckTargetJieForInstant(instantMs, direction);
    const sourceIntervalMinutes = Math.abs(targetJie.instantMs - instantMs) / 60_000;
    const startAge = intervalMinutesToLuckStartAge(sourceIntervalMinutes);
    const firstStartLocal = firstLuckStartLocal(civilDateTime, startAge);
    const sequence = dayunSequence(month.index, direction, DAYUN_PERIODS);
    const boundariesLocal = Array.from({ length: DAYUN_PERIODS + 1 }, (_, i) => dayunBoundaryFromAnchor(firstStartLocal, i));
    if (boundariesLocal.some(value => value.year > 9999)) return unsupported('UNSUPPORTED_CALENDAR_RANGE');
    // No inferred DST preference for derived boundaries.
    const resolutions = boundariesLocal.map(local => resolveLocalDateTimeAuthority(local, location.timezone));
    const unresolved = resolutions.findIndex(value => value.status !== 'RESOLVED');
    if (unresolved !== -1) return reject('UNRESOLVED_DAYUN_BOUNDARY', { boundaryIndex: unresolved, resolution: resolutions[unresolved] });
    const boundariesUTC = resolutions.map(value => value.instantMs);
    if (boundariesUTC.some((value, i) => i > 0 && value <= boundariesUTC[i - 1])) return reject('INVALID_DAYUN_BOUNDARY_ORDER');
    const asOfMs = chosenAsOf.instantMs;
    if (asOfMs >= boundariesUTC.at(-1)) return unsupported('POST_SUPPORTED_DAYUN_RANGE');
    const periodIndex = asOfMs < boundariesUTC[0] ? -1 : boundariesUTC.findIndex((value, i) => i < DAYUN_PERIODS && asOfMs >= value && asOfMs < boundariesUTC[i + 1]);
    const annual = baziYearPillarForInstant(asOfMs);
    const asOfMonth = baziMonthPillarForInstant(asOfMs);
    return structuredClone({
      status: 'OK',
      authority: { ruleVersion: BA_ZI_RULE_AUTHORITY.version, timezoneEngine: BA_ZI_RULE_AUTHORITY.timezone.authorityEngine, timezoneDataVersion: timezoneAuthorityDataVersion() },
      calendar: { solar: conversion.solar, lunar: solarToLunar(conversion.solar) },
      location, civilDateTime, birthInstantUTC: new Date(instantMs).toISOString(), utcOffsetMinutes: chosenBirth.offsetMinutes,
      trueSolarTime, workingTimeBasis: birth.timeMode, workingDateTime,
      pillars: { year: year.name, month: month.name, day: dayHour.day, hour: dayHour.hour },
      primitives: { year, month, dayHour },
      luck: { direction, targetJie, sourceIntervalMinutes, startAge, firstStartLocal, sequence, boundariesLocal, boundariesUTC,
        intervalConvention: '[start,end)', asOf: { status: periodIndex === -1 ? 'PRE_LUCK' : 'ACTIVE', periodIndex, period: periodIndex === -1 ? null : sequence[periodIndex] } },
      timing: { asOfInstantUTC: new Date(asOfMs).toISOString(), annual, activeJie: asOfMonth.activeJie, month: asOfMonth },
    });
  } catch {
    // A computational failure stays visible; never manufacture a chart.
    return { status: 'FAIL', code: 'RECOVERED_COMPUTATION_FAILED' };
  }
}
