// P7-1 check: the professional chart tables against the independent calendar library tyme4ts, exhaustively.
// 纳音 and 旬空 for all 60 甲子; 十二长生 for all 10 stems × 12 branches; 藏干 for all 12 branches; 十神 for 10 × 10 stems.
// Plus 神煞 sanity checks on known textbook cases. Read-only.
import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const E = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'engine');
const imp = rel => import(pathToFileURL(path.join(E, rel)).href);
const T = await imp('node_modules/tyme4ts/dist/lib/index.mjs');
const PC = await imp('interpretation/pro-chart.mjs');
const { STEMS, BRANCHES, HIDDEN, tenGodOf } = await imp('interpretation/facts.mjs');
const problems = []; let checks = 0;
const eq = (what, a, b) => { checks++; if (a !== b) problems.push(`${what}: ours ${a} / tyme4ts ${b}`); };
for (const gz of PC.JIAZI) {
  const sc = T.SixtyCycle.fromName(gz);
  eq('纳音 ' + gz, PC.nayin(gz), sc.getSound().getName());
  eq('旬空 ' + gz, PC.xunkong(gz), sc.getExtraEarthBranches().map(b => b.getName()).join(''));
}
for (const s of STEMS) for (const b of BRANCHES) eq(`长生 ${s}${b}`, PC.stage(s, b), T.HeavenStem.fromName(s).getTerrain(T.EarthBranch.fromName(b)).getName());
for (const b of BRANCHES) {
  const theirs = T.EarthBranch.fromName(b).getHideHeavenStems().sort((x, y) => y.getType() - x.getType()).map(h => h.getHeavenStem().getName()).join('');
  eq('藏干 ' + b, HIDDEN[b].join(''), theirs);
}
for (const a of STEMS) for (const b of STEMS) eq(`十神 ${a}→${b}`, tenGodOf(a, b), T.HeavenStem.fromName(a).getTenStar(T.HeavenStem.fromName(b)).getName());
// 神煞: textbook cases (each line: pillars, gender, expected [pillar, name] present)
const cases = [
  [{ year: '庚午', month: '己卯', day: '戊寅', hour: '己未' }, 'MALE', [['hour', '天乙贵人'], ['day', '天赦'], ['day', '阴阳差错'], ['month', '桃花'], ['year', '羊刃'], ['hour', '金舆'], ['month', '月德合'], ['day', '天医']]],
  [{ year: '甲子', month: '丙寅', day: '庚辰', hour: '丙子' }, 'MALE', [['day', '魁罡'], ['day', '十恶大败'], ['year', '将星'], ['day', '华盖']]],
  [{ year: '乙亥', month: '丙戌', day: '乙巳', hour: '甲申' }, 'FEMALE', [['day', '孤鸾煞'], ['day', '十恶大败'], ['year', '天罗地网'], ['month', '天罗地网']]],
  [{ year: '丁酉', month: '壬寅', day: '己巳', hour: '癸酉' }, 'MALE', [['day', '金神'], ['hour', '金神'], ['year', '天德贵人'], ['month', '天德合']]]
];
for (const [p, g, want] of cases) {
  const ss = PC.shensha(p, g);
  for (const [pos, name] of want) { checks++; if (!ss[pos].includes(name)) problems.push(`神煞 ${Object.values(p).join(' ')}: ${pos} 缺 ${name}（实际 ${ss[pos].join('、') || '无'}）`); }
}
checks++; if (PC.SHENSHA_ORDER.length !== 36 || new Set(PC.SHENSHA_ORDER).size !== 36) problems.push('SHENSHA_COUNT ' + PC.SHENSHA_ORDER.length);
console.log(problems.length ? 'P7_PRO FAIL: ' + problems.slice(0, 15).join('; ') : `P7_PRO PASS (${checks} checks: nayin/xunkong 60, 12 stages 120, hidden stems 12, ten gods 100 all match tyme4ts; shensha textbook cases; 36 shensha)`);
process.exit(problems.length ? 1 : 0);
