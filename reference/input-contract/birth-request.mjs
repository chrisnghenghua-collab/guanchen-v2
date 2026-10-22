import intervals from './birth-timezone-intervals.json' with { type: 'json' };
import locationRows from './birth-locations.json' with { type: 'json' };

// Complete offset intervals resolved by the pinned zone library at build time.
// This projection adds no transition or timezone rule of its own.
export const birthLocations = Object.freeze(locationRows.map(row => Object.freeze({ ...row })));
const locations = new Map(birthLocations.map(row => [row.id, row]));
// ASOF_INTERNAL_REFERENCE_AUTHORITY_V1: the only production clock read.
export const productionRequestClock = Object.freeze({ now: () => Date.now() });
const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const error = code => Object.assign(new Error(code), { code });

function pinnedOffsetWestMinutes(instantMs, zoneId) {
  const rows = intervals.zones[zoneId];
  if (!rows) throw error('UNKNOWN_CANONICAL_TIMEZONE');
  // First interval whose upper bound follows the instant. null means +Infinity.
  let low = 0, high = rows.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const end = rows[middle][0];
    if (end === null || instantMs < end) high = middle;
    else low = middle + 1;
  }
  return rows[low][1];
}

export function validateBirthData(birth = {}) {
  const errors = {};
  if (birth.calendar !== 'GREGORIAN') errors['birth.calendar'] = 'UNSUPPORTED_CALENDAR';
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth.date ?? '');
  // Ordinary Gregorian field validity only; no chart/calendar conversion.
  const year = Number(date?.[1]), month = Number(date?.[2]), day = Number(date?.[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!date || year < 101 || year > 9998 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) errors['birth.date'] = 'INVALID_BIRTH_DATE';
  if (!['KNOWN', 'PARTIAL', 'UNKNOWN'].includes(birth.timeKnowledge)) errors['birth.timeKnowledge'] = 'TIME_KNOWLEDGE_REQUIRED';
  if (!['MALE', 'FEMALE'].includes(birth.gender)) errors['birth.gender'] = 'GENDER_REQUIRED';
  if (!locations.has(birth.location)) errors['birth.location'] = 'CANONICAL_LOCATION_REQUIRED';
  if (birth.timeKnowledge === 'KNOWN' && !clockPattern.test(birth.time ?? '')) errors['birth.time'] = 'KNOWN_TIME_REQUIRED';
  if (birth.timeKnowledge === 'UNKNOWN' && birth.time !== null) errors['birth.time'] = 'UNKNOWN_TIME_MUST_REMAIN_NULL';
  if (birth.timeKnowledge === 'PARTIAL' && birth.time !== null && !clockPattern.test(birth.time ?? '')) errors['birth.time'] = 'INVALID_PARTIAL_TIME';
  return errors;
}

export function birthFieldMessage(code) {
  return ({ UNSUPPORTED_CALENDAR: '目前支持公历出生日期。', INVALID_BIRTH_DATE: '请填写有效的出生日期。',
    TIME_KNOWLEDGE_REQUIRED: '请选择出生时间的已知情况。', GENDER_REQUIRED: '请选择性别。',
    CANONICAL_LOCATION_REQUIRED: '请从列表选择出生地点。', KNOWN_TIME_REQUIRED: '请填写有效的出生时间。',
    UNKNOWN_TIME_MUST_REMAIN_NULL: '时间不详时请留空。', INVALID_PARTIAL_TIME: '请填写有效的时间，或留空。'
  })[code] ?? '请检查所填写的资料。';
}

export async function buildBirthRequest(birth, { requestClock = productionRequestClock } = {}) {
  const fieldErrors = validateBirthData(birth);
  if (Object.keys(fieldErrors).length) throw Object.assign(error('INVALID_BIRTH_DATA'), { fieldErrors });
  const instantMs = requestClock.now();
  if (!Number.isFinite(instantMs)) throw error('INVALID_REQUEST_CLOCK');
  const zone = locations.get(birth.location).timezone;
  if (intervals.packageVersion !== '0.6.3' || intervals.version !== '2026c') throw error('TIMEZONE_AUTHORITY_MISMATCH');
  const offsetWest = pinnedOffsetWestMinutes(instantMs, zone);
  const offsetEast = -offsetWest;
  if (!Number.isInteger(offsetEast) || Math.abs(offsetEast) > 14 * 60) throw error('UNSUPPORTED_REQUEST_CLOCK');
  // UTC accessors only; the browser/host local timezone never participates.
  const civil = new Date(instantMs + offsetEast * 60_000);
  if (!Number.isFinite(civil.getTime()) || civil.getUTCFullYear() < 101 || civil.getUTCFullYear() > 9998) throw error('UNSUPPORTED_REQUEST_CLOCK');
  const sign = offsetEast < 0 ? '-' : '+';
  const magnitude = Math.abs(offsetEast);
  const asOfLocal = `${civil.toISOString().slice(0, 19)}${sign}${String(Math.floor(magnitude / 60)).padStart(2, '0')}:${String(magnitude % 60).padStart(2, '0')}`;
  return { requestType: 'GUANCHEN_PRODUCT_RESULT_REQUEST', requestVersion: '1.0.0',
    birth: { calendar: birth.calendar, date: birth.date, timeKnowledge: birth.timeKnowledge,
      time: birth.time, gender: birth.gender, location: birth.location }, asOfLocal };
}
