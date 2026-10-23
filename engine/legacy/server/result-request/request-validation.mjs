import { readFileSync } from 'node:fs';
import { validateStep05BirthRequestInput } from '../../src/step05A2BirthInputResultRequestFlow.mjs';
import { assertCivilDateTime } from '../../../packages/step01-production-core/src/core/bazi/calendar/gregorian.mjs';

const rows = JSON.parse(readFileSync(new URL('../../../packages/step01-production-core/data/locations.v2.json', import.meta.url), 'utf8')).records;
const exactKeys = (value, expected) => value && Object.getPrototypeOf(value) === Object.prototype && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
function invalid(code) { const error = new Error('Invalid product request'); error.code = 'INVALID_PRODUCT_REQUEST'; error.reason = code; throw error; }
function civil(parts) {
  const [year, month, day, hour = 0, minute = 0, second = 0] = parts.map(Number);
  const value = { year, month, day, hour, minute, second };
  if (year < 101 || year > 9998) invalid('UNSUPPORTED_CALENDAR_RANGE');
  try { assertCivilDateTime(value); } catch { invalid('INVALID_CIVIL_DATE_TIME'); }
  return value;
}
export function validateProductionRequest(input) {
  if (!exactKeys(input, ['requestType', 'requestVersion', 'birth', 'asOfLocal']) ||
      !exactKeys(input.birth, ['calendar', 'date', 'timeKnowledge', 'time', 'gender', 'location'])) invalid('REQUEST_SHAPE');
  if (input.requestType !== 'GUANCHEN_PRODUCT_RESULT_REQUEST' || input.requestVersion !== '1.0.0') invalid('REQUEST_VERSION');
  const lexical = validateStep05BirthRequestInput(input);
  if (!lexical.valid) invalid('LEXICAL_VALIDATION');
  const b = input.birth;
  if (typeof b.date !== 'string' || typeof input.asOfLocal !== 'string') invalid('STRING_FIELDS_REQUIRED');
  if (b.timeKnowledge === 'UNKNOWN' && b.time !== null) invalid('UNKNOWN_CLOCK_MUST_BE_NULL');
  if (b.time !== null && typeof b.time !== 'string') invalid('CLOCK_TYPE');
  if (b.time === '') invalid('EMPTY_CLOCK_NOT_CANONICAL');
  const date = civil(b.date.split('-'));
  const locations = rows.filter(row => row.id === b.location || row.city === b.location || row.aliases.includes(b.location));
  if (locations.length !== 1) invalid('LOCATION_NOT_IN_APPROVED_CATALOG');
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/.exec(input.asOfLocal);
  if (!match) invalid('INVALID_ASOF_LEXICAL');
  const local = civil(match.slice(1, 7).map(value => value ?? '0'));
  const offset = match[7];
  let offsetMinutes = 0;
  if (offset !== 'Z') {
    const hours = Number(offset.slice(1, 3)), minutes = Number(offset.slice(4, 6));
    if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0) || offset === '-00:00') invalid('INVALID_EXPLICIT_OFFSET');
    offsetMinutes = (offset[0] === '-' ? -1 : 1) * (hours * 60 + minutes);
  }
  const asOfMs = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second) - offsetMinutes * 60000;
  const time = b.time === null ? null : { hour: Number(b.time.slice(0, 2)), minute: Number(b.time.slice(3)), second: 0 };
  return { request: structuredClone(input), location: structuredClone(locations[0]), date: { year: date.year, month: date.month, day: date.day }, time, asOf: { instantUTC: new Date(asOfMs).toISOString(), instantMs: asOfMs, local, offsetMinutes, original: input.asOfLocal } };
}
