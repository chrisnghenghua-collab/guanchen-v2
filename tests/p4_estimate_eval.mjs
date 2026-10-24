// P4 evaluation (questionnaire V2): simulated respondents who, with probability `honesty`, pick an option whose binding
// lists their TRUE hour branch (otherwise a random option). Measures how often the TRUE 时辰 lands in the top 2, versus chance.
// NOTE: this only measures the model under that assumption; real-world accuracy needs real users who know their time.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), E = path.join(ROOT, 'engine');
const T = await import(pathToFileURL(path.join(E, 'api/time-estimate.mjs')).href);
const LOC = JSON.parse(fs.readFileSync(path.join(E, 'packages/step01-production-core/data/locations.v2.json'), 'utf8')).records;
const N = Number(process.argv[2] ?? 120);
let seed = 777; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648; const pick = a => a[Math.floor(rnd() * a.length)]; const pad = x => String(x).padStart(2, '0');
const PERIOD_OF = m => Object.entries(T.PERIODS).find(([k, w]) => k !== 'UNKNOWN' && w.some(([a, b]) => m >= a && m < b))[0];
const res = {};
for (let i = 0; i < N; i++) {
  const date = `${1950 + Math.floor(rnd() * 70)}-${pad(1 + Math.floor(rnd() * 12))}-${pad(1 + Math.floor(rnd() * 28))}`, gender = pick(['MALE', 'FEMALE']), location = pick(LOC).city;
  const trueMin = Math.floor(rnd() * 288) * 5, birth = { date, gender, location };
  for (const scenario of ['PERIOD', 'UNKNOWN']) {
    const period = scenario === 'PERIOD' ? PERIOD_OF(trueMin) : 'UNKNOWN';
    let cands; try { cands = T.candidatesFor(birth, period, null, { asOf: '2026-10-22T12:00:00+08:00' }); } catch { continue; }
    const truth = cands.find(c => c.minutes.includes(trueMin)); if (!truth || cands.length < 2) continue;
    for (const honesty of [1.0, 0.8, 0.6]) {
      // adaptive session: ask the suggested questions in order, answer each from the true chart (with noise)
      const answers = {}; let r = T.estimateBirthTime({ version: 2, birth, period, answers, asOf: '2026-10-22T12:00:00+08:00' });
      while (r.questions.length) { const qd = r.questions[0], q = T.QUESTIONS.find(x => x.id === qd.id); const fit = q.options.filter(o => q.bind[o].includes(truth.branch)); answers[q.id] = fit.length && rnd() < honesty ? pick(fit) : pick(q.options); r = T.estimateBirthTime({ version: 2, birth, period, answers, asOf: '2026-10-22T12:00:00+08:00' }); }
      const rank = r.candidates.findIndex(c => c.label.includes(truth.pillars.hour) && c.dayPillar === truth.pillars.day) + 1;
      const k = `${scenario}/${honesty}`; const s = (res[k] ??= { n: 0, top1: 0, top2: 0, chance2: 0, asked: 0, cands: 0 });
      s.n++; if (rank === 1) s.top1++; if (rank && rank <= 2) s.top2++; s.chance2 += Math.min(1, 2 / r.candidateCount); s.asked += Object.keys(answers).length; s.cands += r.candidateCount;
    }
  }
}
console.log('scenario/honesty      n   top-1   top-2   chance(top-2)  avg questions  avg candidates');
for (const [k, s] of Object.entries(res)) console.log(k.padEnd(18), String(s.n).padStart(4), (Math.round(s.top1 / s.n * 100) + '%').padStart(7), (Math.round(s.top2 / s.n * 100) + '%').padStart(7), (Math.round(s.chance2 / s.n * 100) + '%').padStart(12), (s.asked / s.n).toFixed(1).padStart(14), (s.cands / s.n).toFixed(1).padStart(14));
// Gate (model sanity only, not real-world accuracy): with a known period and mostly honest answers the true 时辰 must
// land in the top 2 at least 90% of the time, with a known period and with a fully unknown time.
const g = (k, min) => { const s = res[k]; return s && s.top2 / s.n >= min ? null : `${k} top-2 below ${min * 100}%`; };
const fails = [g('PERIOD/0.8', 0.9), g('UNKNOWN/0.8', 0.9)].filter(Boolean);
console.log(fails.length ? 'P4_ESTIMATE FAIL: ' + fails.join('; ') : 'P4_ESTIMATE PASS (model check; real-world accuracy not yet verified)');
process.exit(fails.length ? 1 : 0);
