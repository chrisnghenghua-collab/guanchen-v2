// GUANCHEN API v2 - reading service. Fresh contract (2026-10-22); does not use the GPT-era request schema or public payload layers.
// Pipeline: validate -> computeStep01 (verified calculation core) -> chart analysis -> timing root -> ChartFacts -> 20 v2 generators.
import fs from 'node:fs';
import { computeStep01 } from '../packages/step01-production-core/facade.mjs';
import { assertCivilDateTime } from '../packages/step01-production-core/src/core/bazi/calendar/gregorian.mjs';
import { formatInstantInAuthorityZone, authorityOffsetMinutesAtInstant } from '../packages/step01-production-core/src/core/bazi/time/timezoneAuthority.mjs';
import { composeChartAnalysis } from '../server/result-request/chart-analysis.mjs';
import { composeTimingRoot } from '../server/result-request/timing-root.mjs';
import { buildChartFacts, POSITION_ZH } from '../interpretation/facts.mjs';
import { loadCopy } from '../interpretation/copy.mjs';
import { GENERATORS, QUESTION_TEXT, NEEDS_ACTIVE_LUCK, JOB_CHANGE_CONTEXTS, NEW_OPPORTUNITY_CONTEXTS } from '../interpretation/questions.mjs';
import { dmLine, familyTerm, structureLine, LEVEL_ZH, level, label, FAM_DISPLAY } from '../interpretation/lib.mjs';

export const API_VERSION = '2.0.0';
const LOCATIONS = JSON.parse(fs.readFileSync(new URL('../packages/step01-production-core/data/locations.v2.json', import.meta.url), 'utf8')).records;
const copy = loadCopy();
const DOMAINS = [['CAREER', '事业'], ['WEALTH', '财运'], ['RELATIONSHIP', '感情与关系'], ['WELLBEING', '身心节奏']];
const CONTEXT_OPTIONS = { CAREER_JOB_CHANGE: JOB_CHANGE_CONTEXTS, CAREER_NEW_OPPORTUNITY: NEW_OPPORTUNITY_CONTEXTS };
const MIN_YEAR = 1900, MAX_YEAR = 2100;

export class ReadingError extends Error {
  constructor(code, field = null) { super(code); this.code = code; this.field = field; }
}
const fail = (code, field) => { throw new ReadingError(code, field); };
const plainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const onlyKeys = (v, allowed) => Object.keys(v).every(k => allowed.includes(k));
const pad = n => String(n).padStart(2, '0');

function resolveLocation(value) {
  if (typeof value !== 'string' || !value.trim()) fail('LOCATION_REQUIRED', 'birth.location');
  const v = value.trim();
  const hits = LOCATIONS.filter(r => r.id === v || r.city === v || r.aliases.includes(v));
  if (hits.length !== 1) fail('LOCATION_NOT_SUPPORTED', 'birth.location');
  return hits[0];
}
function localIso(instantMs, zone) {
  const c = formatInstantInAuthorityZone(instantMs, zone), off = authorityOffsetMinutesAtInstant(instantMs, zone);
  if (!Number.isInteger(off)) fail('ASOF_OFFSET_UNSUPPORTED', 'asOf');
  const sign = off < 0 ? '-' : '+', m = Math.abs(off);
  return { local: c, offsetMinutes: off, original: `${c.year}-${pad(c.month)}-${pad(c.day)}T${pad(c.hour)}:${pad(c.minute)}:${pad(c.second)}${sign}${pad(Math.floor(m / 60))}:${pad(m % 60)}` };
}

/** Validates a v2 request. `now` is injectable for tests; production uses the server clock. */
export function validateReadingRequest(body, { now = Date.now() } = {}) {
  if (!plainObject(body)) fail('INVALID_BODY');
  if (!onlyKeys(body, ['version', 'birth', 'context', 'asOf', 'estimate'])) fail('UNKNOWN_FIELD');
  if (body.version !== 2) fail('UNSUPPORTED_VERSION', 'version');
  const b = body.birth;
  if (!plainObject(b) || !onlyKeys(b, ['date', 'time', 'gender', 'location'])) fail('INVALID_BIRTH', 'birth');
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b.date ?? '');
  if (!dm) fail('INVALID_DATE', 'birth.date');
  const date = { year: +dm[1], month: +dm[2], day: +dm[3] };
  try { assertCivilDateTime({ ...date, hour: 0, minute: 0, second: 0 }); } catch { fail('INVALID_DATE', 'birth.date'); }
  if (date.year < MIN_YEAR || date.year > MAX_YEAR) fail('DATE_OUT_OF_RANGE', 'birth.date');
  let time = null;
  if (b.time !== null && b.time !== undefined) {
    const tm = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(b.time);
    if (!tm) fail('INVALID_TIME', 'birth.time');
    time = { hour: +tm[1], minute: +tm[2], second: 0 };
  }
  if (!['MALE', 'FEMALE'].includes(b.gender)) fail('GENDER_REQUIRED', 'birth.gender');
  const location = resolveLocation(b.location);
  const context = {};
  if (body.context !== undefined) {
    if (!plainObject(body.context) || !onlyKeys(body.context, Object.keys(CONTEXT_OPTIONS))) fail('INVALID_CONTEXT', 'context');
    for (const [k, v] of Object.entries(body.context)) { if (!CONTEXT_OPTIONS[k].includes(v)) fail('INVALID_CONTEXT', `context.${k}`); context[k] = v; }
  }
  let asOfMs = now;
  if (body.asOf !== undefined) {
    if (typeof body.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(body.asOf) || !Number.isFinite(Date.parse(body.asOf))) fail('INVALID_ASOF', 'asOf');
    asOfMs = Date.parse(body.asOf);
  }
  const asOfMsWhole = Math.floor(asOfMs / 1000) * 1000;
  const asOf = { instantMs: asOfMsWhole, instantUTC: new Date(asOfMsWhole).toISOString(), ...localIso(asOfMsWhole, location.timezone) };
  // estimate: present when the time was picked from /api/v2/time-estimate (shown back to the user; never changes the calculation)
  let estimate = null;
  if (body.estimate !== undefined) {
    const e = body.estimate;
    if (!plainObject(e) || !onlyKeys(e, ['label', 'percent']) || typeof e.label !== 'string' || e.label.length > 20 || !/^[\u4e00-\u9fff（）]+$/.test(e.label) || typeof e.percent !== 'number' || !(e.percent >= 0 && e.percent <= 100) || time === null) fail('INVALID_ESTIMATE', 'estimate');
    estimate = { label: e.label, percent: Math.round(e.percent * 10) / 10 };
  }
  return { date, time, gender: b.gender, location, context, asOf, estimate };
}

const CORE_REJECT = { AMBIGUOUS_LOCAL_TIME: 'BIRTH_TIME_AMBIGUOUS', INVALID_LOCAL_TIME: 'BIRTH_TIME_NOT_EXIST', UNSUPPORTED_CALENDAR_RANGE: 'DATE_OUT_OF_RANGE', POST_SUPPORTED_DAYUN_RANGE: 'DATE_OUT_OF_RANGE' };
const fmtCivil = c => `${c.year}-${pad(c.month)}-${pad(c.day)} ${pad(c.hour)}:${pad(c.minute)}:${pad(Math.floor(c.second ?? 0))}`;
const fmtDate = c => `${c.year}-${pad(c.month)}-${pad(c.day)}`;

function chartSection(core, f) {
  const t = copy, L = core.luck;
  const startYearsExact = L.startAge.years + L.startAge.months / 12 + L.startAge.days / 365;
  return {
    pillars: { ...core.pillars },
    trueSolarTime: fmtCivil(core.trueSolarTime),
    dayMaster: { stem: f.dayMaster.stem, element: f.dayMaster.element, yinYang: f.dayMaster.yinYang, image: t(`dm.image.${f.dayMaster.stem}`) },
    season: f.season, strength: f.strengthZh,
    structure: { label: label(f.structure.label), stage: f.structure.stageZh, uncertain: f.structure.reviewOpen },
    tenGods: { stems: Object.fromEntries(Object.entries(f.visibleTenGods).map(([p, g]) => [POSITION_ZH[p], g])), branchMain: Object.fromEntries(Object.entries(f.hiddenMainTenGods).map(([p, g]) => [POSITION_ZH[p], g])) },
    families: Object.fromEntries(Object.entries(f.familyWeights).map(([k, w]) => [FAM_DISPLAY[k], LEVEL_ZH[level(w)]])),
    elements: { ...f.elementWeights },
    luck: {
      direction: L.direction === 'FORWARD' ? '顺行' : '逆行',
      startAge: { ...L.startAge },
      dayun: L.sequence.map((p, i) => ({ pillar: p.name ?? p, startDate: fmtDate(L.boundariesLocal[i]), startAge: Math.round((startYearsExact + i * 10) * 10) / 10 })),
      current: f.dayun ? f.dayun.pillar : null,
      annual: f.annual.pillar,
    },
    overview: [dmLine(f, t), { term: familyTerm(f), plain: t(`chart.family.${f.dominantFamily}`) }, structureLine(f, t)].map(x => ({ term: x.term, plain: x.plain })),
  };
}

/** Pillars only (cheap). Used to group candidate minutes into 时辰 before any analysis. Returns null for unusable times. */
export function corePillarsFor(req, time) {
  const core = computeStep01({ birth: { calendar: { type: 'SOLAR', date: req.date }, time, gender: req.gender, timeMode: 'TRUE_SOLAR_TIME' }, location: req.location.id, asOf: { instantUTC: req.asOf.instantUTC } });
  return core.status === 'OK' ? core.pillars : null;
}

/** Calculation + facts only (no copy rendering). Used by birth-time estimation. Throws ReadingError for unusable times. */
export function createReadingFacts(body, options = {}) {
  const req = validateReadingRequest(body, options);
  const core = computeStep01({ birth: { calendar: { type: 'SOLAR', date: req.date }, time: req.time, gender: req.gender, timeMode: 'TRUE_SOLAR_TIME' }, location: req.location.id, asOf: { instantUTC: req.asOf.instantUTC } });
  if (core.status !== 'OK') { const code = CORE_REJECT[core.code]; if (code) fail(code, 'birth.time'); throw new Error('CORE_' + core.status); }
  const normalized = { request: { birth: { gender: req.gender, timeKnowledge: 'KNOWN' } }, location: req.location, date: req.date, time: req.time, asOf: req.asOf };
  const analysis = composeChartAnalysis(core);
  const timingRoot = composeTimingRoot(core, normalized, analysis);
  return { req, core, facts: buildChartFacts({ core, analysis, timingRoot, normalized }) };
}

export function createReading(body, options = {}) {
  const req = validateReadingRequest(body, options);
  const t = copy;
  const base = { apiVersion: API_VERSION, input: { date: fmtDate(req.date), time: req.time ? `${pad(req.time.hour)}:${pad(req.time.minute)}` : null, gender: req.gender, location: { id: req.location.id, name: req.location.city, timezone: req.location.timezone }, asOf: req.asOf.original }, notice: t('global.notice') };
  if (!req.time) return { ...base, timeKnown: false, chart: null, domains: [], message: t('global.time_unknown') };
  const core = computeStep01({ birth: { calendar: { type: 'SOLAR', date: req.date }, time: req.time, gender: req.gender, timeMode: 'TRUE_SOLAR_TIME' }, location: req.location.id, asOf: { instantUTC: req.asOf.instantUTC } });
  if (core.status !== 'OK') {
    const code = CORE_REJECT[core.code];
    if (code) fail(code, code.startsWith('BIRTH_TIME') ? 'birth.time' : 'birth.date');
    throw new Error('CORE_' + core.status);
  }
  const normalized = { request: { birth: { gender: req.gender, timeKnowledge: 'KNOWN' } }, location: req.location, date: req.date, time: req.time, asOf: req.asOf };
  const analysis = composeChartAnalysis(core);
  const timingRoot = composeTimingRoot(core, normalized, analysis);
  const f = buildChartFacts({ core, analysis, timingRoot, normalized });
  const domains = DOMAINS.map(([domain, label]) => ({ domain, label, questions: Object.keys(GENERATORS).filter(id => id.startsWith(domain + '_')).map(id => {
    if (NEEDS_ACTIVE_LUCK.has(id) && f.luckStatus !== 'ACTIVE') return { id, question: QUESTION_TEXT[id], available: false, unavailableReason: t('global.pre_luck', { age: Math.round((core.luck.startAge.years + core.luck.startAge.months / 12) * 10) / 10 }) };
    const a = GENERATORS[id](f, t, req.context[id] ?? 'NONE');
    return { id, question: QUESTION_TEXT[id], available: true, conclusion: a.conclusion, basis: a.basis, advice: a.advice, reminder: a.reminder };
  }) }));
  return { ...base, timeKnown: true, ...(req.estimate ? { timeEstimated: { ...req.estimate, message: t('global.time_estimated', { label: req.estimate.label, percent: req.estimate.percent }) } } : {}), chart: chartSection(core, f), domains };
}
