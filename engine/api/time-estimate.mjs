// GUANCHEN API v2 - birth-time estimation (P4 V1, 2026-10-22).
// Probabilistic by design: narrows the candidate 时辰 inside the period the user remembers, ranks them by how well each
// candidate chart matches the user's answers, and returns relative likelihoods. It never claims the true birth time.
import { validateReadingRequest, createReadingFacts, corePillarsFor, ReadingError } from './reading-service.mjs';
import { dayBranchRelations, bandGroup, level } from '../interpretation/lib.mjs';
import { loadCopy } from '../interpretation/copy.mjs';
const copy = loadCopy();
const pad = n => String(n).padStart(2, '0');
const hm = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const fail = (code, field) => { throw new ReadingError(code, field); };

// Civil-time windows (minutes of the birth date). 半夜 covers both ends of the date.
export const PERIODS = {
  MIDNIGHT: [[0, 60], [1380, 1440]], EARLY_MORNING: [[60, 300]], DAWN: [[300, 420]], MORNING: [[420, 660]], NOON: [[660, 780]],
  AFTERNOON: [[780, 1020]], DUSK: [[1020, 1140]], EVENING: [[1140, 1380]], UNKNOWN: [[0, 1440]],
};
const BRANCH_HOUR = { 子: '23:00–01:00', 丑: '01:00–03:00', 寅: '03:00–05:00', 卯: '05:00–07:00', 辰: '07:00–09:00', 巳: '09:00–11:00', 午: '11:00–13:00', 未: '13:00–15:00', 申: '15:00–17:00', 酉: '17:00–19:00', 戌: '19:00–21:00', 亥: '21:00–23:00' };

// ---- questionnaire: each question reads one chart feature; options carry the feature value they correspond to ----
const lvl3 = w => { const l = level(w); return l === 'strong' ? 'high' : l === 'present' ? 'mid' : 'low'; };
const dayRel = f => { const r = dayBranchRelations(f)[0]; return !r ? 'none' : r.type === '冲' ? 'clash' : r.type === '合' ? 'combine' : 'friction'; };
const topElement = f => Object.entries(f.elementWeights).sort((a, b) => b[1] - a[1])[0][0];
export const QUESTIONS = [
  { id: 'Q_DECIDE', feature: f => f.dominantFamily, options: ['比劫', '食伤', '财', '官杀', '印'], kind: 'nominal' },
  { id: 'Q_PRESSURE', feature: f => bandGroup(f.strengthBand), options: ['strong', 'balanced', 'weak'], kind: 'ordinal' },
  { id: 'Q_RHYTHM', feature: topElement, options: ['木', '火', '土', '金', '水'], kind: 'nominal' },
  { id: 'Q_CLOSE', feature: dayRel, options: ['clash', 'combine', 'friction', 'none'], kind: 'nominal' },
  { id: 'Q_EXPRESS', feature: f => lvl3(f.familyWeights['食伤']), options: ['high', 'mid', 'low'], kind: 'ordinal' },
  { id: 'Q_MONEY', feature: f => lvl3(f.familyWeights['财']), options: ['high', 'mid', 'low'], kind: 'ordinal' },
  { id: 'Q_RULES', feature: f => lvl3(f.familyWeights['官杀']), options: ['high', 'mid', 'low'], kind: 'ordinal' },
  { id: 'Q_CARE', feature: f => lvl3(f.familyWeights['印']), options: ['high', 'mid', 'low'], kind: 'ordinal' },
];
// Likelihood of an answer given the candidate's feature value (a soft model: people describe themselves imperfectly).
function likelihood(q, answer, truth) {
  if (q.kind === 'nominal') { const k = q.options.length; return answer === truth ? 0.52 : 0.48 / (k - 1); }
  const order = q.options, d = Math.abs(order.indexOf(answer) - order.indexOf(truth));
  return d === 0 ? 0.6 : d === 1 ? 0.3 : 0.1;
}
export function questionnaire() {
  return QUESTIONS.map(q => ({ id: q.id, question: copy(`estimate.${q.id}.q`), options: [...q.options.map(o => ({ value: o, label: copy(`estimate.${q.id}.${o}`) })), { value: 'SKIP', label: copy('estimate.skip') }] }));
}

function windows(period, around) {
  if (period === 'AROUND') {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(around ?? ''); if (!m) fail('INVALID_AROUND', 'around');
    const c = +m[1] * 60 + +m[2]; return [[Math.max(0, c - 60), Math.min(1440, c + 61)]];
  }
  if (!PERIODS[period]) fail('INVALID_PERIOD', 'period');
  return PERIODS[period];
}

/** Candidate 时辰 inside the remembered period, each with its facts, prior weight (= minutes covered) and a representative civil time. */
const CACHE = new Map(); // small per-instance memo: the same person usually calls several times while answering
export function candidatesFor(birth, period, around, options = {}) {
  const ck = JSON.stringify([birth, period, around ?? null, options.asOf ?? null, options.asOf ? 0 : Math.floor((options.now ?? Date.now()) / 3600000)]);
  if (CACHE.has(ck)) return CACHE.get(ck);
  const req = validateReadingRequest({ version: 2, birth: { ...birth, time: null }, ...(options.asOf ? { asOf: options.asOf } : {}) }, options);
  const slots = new Map();
  // 1) cheap pass: pillars for every 5 minutes -> group into (day pillar, hour pillar) slots
  for (const [a, b] of windows(period, around)) for (let m = a; m < b; m += 5) {
    const p = corePillarsFor(req, { hour: Math.floor(m / 60), minute: m % 60, second: 0 });
    if (!p) continue;
    const key = p.day + p.hour; const s = slots.get(key) ?? { key, minutes: [], pillars: p }; s.minutes.push(m); slots.set(key, s);
  }
  // 2) full analysis once per slot, at its middle minute
  const out = [];
  for (const s of slots.values()) {
    const mid = s.minutes[Math.floor(s.minutes.length / 2)];
    let r; try { r = createReadingFacts({ version: 2, birth: { ...birth, time: hm(mid) }, ...(options.asOf ? { asOf: options.asOf } : {}) }, options); } catch (e) { if (e instanceof ReadingError) continue; throw e; }
    out.push({ ...s, facts: r.facts, civilTime: hm(mid), civilFrom: hm(s.minutes[0]), civilTo: hm(s.minutes.at(-1) + 5) });
  }
  if (CACHE.size > 200) CACHE.clear();
  CACHE.set(ck, out);
  return out;
}

export function estimateBirthTime(body, options = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('INVALID_BODY');
  if (!Object.keys(body).every(k => ['version', 'birth', 'period', 'around', 'answers', 'asOf'].includes(k))) fail('UNKNOWN_FIELD');
  if (body.version !== 2) fail('UNSUPPORTED_VERSION', 'version');
  const { date, gender, location } = body.birth ?? {};
  validateReadingRequest({ version: 2, birth: { date, time: null, gender, location } }, options); // same validation as a reading
  const cands = candidatesFor({ date, gender, location }, body.period, body.around, { ...options, asOf: body.asOf });
  if (!cands.length) fail('NO_CANDIDATES', 'period');
  const answers = body.answers ?? {};
  if (typeof answers !== 'object' || Array.isArray(answers) || !Object.keys(answers).every(k => QUESTIONS.some(q => q.id === k))) fail('INVALID_ANSWERS', 'answers');
  for (const [k, v] of Object.entries(answers)) { const q = QUESTIONS.find(x => x.id === k); if (v !== 'SKIP' && !q.options.includes(v)) fail('INVALID_ANSWERS', `answers.${k}`); }
  const scored = cands.map(c => {
    let w = c.minutes.length; // prior: how much of the remembered period this 时辰 covers
    for (const q of QUESTIONS) { const a = answers[q.id]; if (a && a !== 'SKIP') w *= likelihood(q, a, q.feature(c.facts)); }
    return { c, w };
  });
  const total = scored.reduce((s, x) => s + x.w, 0);
  const ranked = scored.map(x => ({ ...x, p: x.w / total })).sort((a, b) => b.p - a.p);
  const answered = Object.values(answers).filter(v => v !== 'SKIP').length;
  // Only questions whose answer would differ between the remaining candidates are useful; order by how evenly they split
  // the current probability mass (entropy). Answered questions are not asked again.
  const useful = QUESTIONS.filter(q => !(q.id in answers)).map(q => {
    const mass = {}; for (const x of ranked) { const v = q.feature(x.c.facts); mass[v] = (mass[v] ?? 0) + x.p; }
    const h = -Object.values(mass).reduce((s, m) => s + (m > 0 ? m * Math.log2(m) : 0), 0);
    return { q, h, groups: Object.keys(mass).length };
  }).filter(x => x.groups > 1).sort((a, b) => b.h - a.h);
  const ask = useful.map(({ q }) => ({ id: q.id, question: copy(`estimate.${q.id}.q`), options: [...q.options.map(o => ({ value: o, label: copy(`estimate.${q.id}.${o}`) })), { value: 'SKIP', label: copy('estimate.skip') }] }));
  return {
    apiVersion: '2.0.0', period: body.period, answered, candidateCount: ranked.length, questions: ask,
    ...(ask.length === 0 && answered === 0 && ranked.length > 1 ? { cannotNarrow: copy('estimate.cannot_narrow') } : {}),
    candidates: ranked.map((x, i) => ({ rank: i + 1, label: `${x.c.pillars.hour[1]}时（${x.c.pillars.hour}）`, solarHour: BRANCH_HOUR[x.c.pillars.hour[1]], civilRange: `${x.c.civilFrom}–${x.c.civilTo}`,
      fillTime: x.c.civilTime, percent: Math.round(x.p * 1000) / 10, dayPillar: x.c.pillars.day, recommended: i < 2 })),
    reminder: copy('estimate.reminder'), note: answered === 0 ? copy('estimate.no_answers') : copy('estimate.circular_note'),
  };
}
