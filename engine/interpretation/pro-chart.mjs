// GUANCHEN P7-1 (2026-10-23) - professional chart table: 藏干十神, 纳音, 星运, 自坐, 空亡, 36 神煞, 干支关系,
// and the ten gods of each 大运 / the 流年. Self-contained traditional tables (cross-checked against tyme4ts in
// tests/p7_pro_check.mjs). 神煞 list and lookup conventions approved by Chris 2026-10-23 (mainstream charting-app usage);
// every lookup is documented in docs/P7_SHENSHA.md.
import { STEMS, BRANCHES, HIDDEN, tenGodOf } from './facts.mjs';

const POS = [['year', '年柱'], ['month', '月柱'], ['day', '日柱'], ['hour', '时柱']];

// ---- 纳音 (60 甲子, in pairs) ----
const NAYIN_PAIRS = ['海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火', '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土', '霹雳火', '松柏木', '长流水',
  '沙中金', '山下火', '平地木', '壁上土', '金箔金', '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
export const JIAZI = Array.from({ length: 60 }, (_, i) => STEMS[i % 10] + BRANCHES[i % 12]);
export const nayin = gz => NAYIN_PAIRS[Math.floor(JIAZI.indexOf(gz) / 2)];
const NAYIN_EL = n => n.slice(-1);   // 纳音五行 = last character

// ---- 十二长生 ----
const STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const CHANGSHENG = { 甲: '亥', 丙: '寅', 戊: '寅', 庚: '巳', 壬: '申', 乙: '午', 丁: '酉', 己: '酉', 辛: '子', 癸: '卯' };
export function stage(stem, branch) {
  const start = BRANCHES.indexOf(CHANGSHENG[stem]), b = BRANCHES.indexOf(branch);
  const yang = STEMS.indexOf(stem) % 2 === 0;
  return STAGES[((yang ? b - start : start - b) % 12 + 12) % 12];
}

// ---- 旬空 ----
export function xunkong(gz) {
  const i = JIAZI.indexOf(gz), hb = BRANCHES.indexOf(JIAZI[i - (i % 10)][1]);   // branch under the 甲 of this 旬
  return BRANCHES[(hb + 10) % 12] + BRANCHES[(hb + 11) % 12];
}

// ---- 36 神煞 ----
const SAN_HE = b => ({ 寅: '寅午戌', 午: '寅午戌', 戌: '寅午戌', 申: '申子辰', 子: '申子辰', 辰: '申子辰', 巳: '巳酉丑', 酉: '巳酉丑', 丑: '巳酉丑', 亥: '亥卯未', 卯: '亥卯未', 未: '亥卯未' })[b];
const FROM_SANHE = table => b => table[SAN_HE(b)];
const STEM_TO_BRANCH = {   // looked up from 年干 and 日干
  天乙贵人: { 甲: '丑未', 戊: '丑未', 庚: '丑未', 乙: '子申', 己: '子申', 丙: '亥酉', 丁: '亥酉', 壬: '卯巳', 癸: '卯巳', 辛: '寅午' },
  太极贵人: { 甲: '子午', 乙: '子午', 丙: '卯酉', 丁: '卯酉', 戊: '辰戌丑未', 己: '辰戌丑未', 庚: '寅亥', 辛: '寅亥', 壬: '巳申', 癸: '巳申' },
  福星贵人: { 甲: '寅子', 丙: '寅子', 乙: '卯丑', 癸: '卯丑', 戊: '申', 己: '未', 丁: '亥', 庚: '午', 辛: '巳', 壬: '辰' },
  文昌贵人: { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' },
  国印贵人: { 甲: '戌', 乙: '亥', 丙: '丑', 丁: '寅', 戊: '丑', 己: '寅', 庚: '辰', 辛: '巳', 壬: '未', 癸: '申' },
  天厨贵人: { 甲: '巳', 乙: '午', 丙: '巳', 丁: '午', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' }
};
const DAY_STEM_TO_BRANCH = {   // looked up from 日干
  禄神: { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' },
  羊刃: { 甲: '卯', 乙: '辰', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑' },
  金舆: { 甲: '辰', 乙: '巳', 丙: '未', 丁: '申', 戊: '未', 己: '申', 庚: '戌', 辛: '亥', 壬: '丑', 癸: '寅' },
  红艳煞: { 甲: '午', 乙: '午', 丙: '寅', 丁: '未', 戊: '辰', 己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申' }
};
const BRANCH_RULES = {   // looked up from 年支 and 日支 (三合 groups)
  将星: FROM_SANHE({ 寅午戌: '午', 申子辰: '子', 巳酉丑: '酉', 亥卯未: '卯' }),
  驿马: FROM_SANHE({ 寅午戌: '申', 申子辰: '寅', 巳酉丑: '亥', 亥卯未: '巳' }),
  华盖: FROM_SANHE({ 寅午戌: '戌', 申子辰: '辰', 巳酉丑: '丑', 亥卯未: '未' }),
  桃花: FROM_SANHE({ 寅午戌: '卯', 申子辰: '酉', 巳酉丑: '午', 亥卯未: '子' }),
  劫煞: FROM_SANHE({ 寅午戌: '亥', 申子辰: '巳', 巳酉丑: '寅', 亥卯未: '申' }),
  灾煞: FROM_SANHE({ 寅午戌: '子', 申子辰: '午', 巳酉丑: '卯', 亥卯未: '酉' }),
  亡神: FROM_SANHE({ 寅午戌: '巳', 申子辰: '亥', 巳酉丑: '申', 亥卯未: '寅' })
};
const YEAR_BRANCH_RULES = {   // looked up from 年支 only
  红鸾: b => '卯寅丑子亥戌酉申未午巳辰'[BRANCHES.indexOf(b)],
  天喜: b => '酉申未午巳辰卯寅丑子亥戌'[BRANCHES.indexOf(b)],
  孤辰: b => ({ 亥: '寅', 子: '寅', 丑: '寅', 寅: '巳', 卯: '巳', 辰: '巳', 巳: '申', 午: '申', 未: '申', 申: '亥', 酉: '亥', 戌: '亥' })[b],
  寡宿: b => ({ 亥: '戌', 子: '戌', 丑: '戌', 寅: '丑', 卯: '丑', 辰: '丑', 巳: '辰', 午: '辰', 未: '辰', 申: '未', 酉: '未', 戌: '未' })[b]
};
const TIANDE = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' };
const TIANDE_HE = { 寅: '壬', 卯: '巳', 辰: '丁', 巳: '丙', 午: '寅', 未: '己', 申: '戊', 酉: '亥', 戌: '辛', 亥: '庚', 子: '申', 丑: '乙' };
const YUEDE = b => ({ 寅午戌: '丙', 申子辰: '壬', 亥卯未: '甲', 巳酉丑: '庚' })[SAN_HE(b)];
const YUEDE_HE = b => ({ 寅午戌: '辛', 申子辰: '丁', 亥卯未: '己', 巳酉丑: '乙' })[SAN_HE(b)];
const NAYIN_XUETANG = { 金: '巳', 木: '亥', 水: '申', 土: '申', 火: '寅' };   // 学堂 = 纳音五行的长生位
const NAYIN_CIGUAN = { 金: '申', 木: '寅', 水: '亥', 土: '亥', 火: '巳' };    // 词馆 = 纳音五行的临官位
const DAY_PILLAR_SETS = {
  魁罡: ['庚辰', '庚戌', '壬辰', '戊戌'],
  孤鸾煞: ['乙巳', '丁巳', '辛亥', '戊申', '甲寅', '壬子', '丙午', '戊午'],
  阴阳差错: ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'],
  十恶大败: ['甲辰', '乙巳', '壬申', '丙申', '丁亥', '庚辰', '戊戌', '癸亥', '辛巳', '己丑']
};
const JINSHEN = ['乙丑', '己巳', '癸酉'];   // 金神: 日柱或时柱
const TIANSHE = { 寅: '戊寅', 卯: '戊寅', 辰: '戊寅', 巳: '甲午', 午: '甲午', 未: '甲午', 申: '戊申', 酉: '戊申', 戌: '戊申', 亥: '甲子', 子: '甲子', 丑: '甲子' };
// 元辰: 阳男阴女 = the branch after the year's clash; 阴男阳女 = the branch before it
function yuanchen(yearBranch, gender, yearStem) {
  const yangYear = STEMS.indexOf(yearStem) % 2 === 0, forward = (gender === 'MALE') === yangYear;
  const clash = (BRANCHES.indexOf(yearBranch) + 6) % 12;
  return BRANCHES[(clash + (forward ? 1 : 11)) % 12];
}
export const SHENSHA_ORDER = ['天乙贵人', '太极贵人', '天德贵人', '月德贵人', '天德合', '月德合', '福星贵人', '文昌贵人', '国印贵人', '天厨贵人', '学堂', '词馆', '天医',
  '禄神', '羊刃', '金舆', '将星', '驿马', '华盖', '桃花', '红艳煞', '魁罡', '红鸾', '天喜', '孤辰', '寡宿', '孤鸾煞',
  '劫煞', '灾煞', '亡神', '元辰', '天罗地网', '阴阳差错', '十恶大败', '金神', '天赦'];

// P7-4: display groups (same four groups as docs/P7_SHENSHA.md)
export const SHENSHA_GROUP = Object.fromEntries(SHENSHA_ORDER.map((n, i) => [n, i < 13 ? '贵人' : i < 22 ? '禄刃性情' : i < 27 ? '婚恋六亲' : '需留意']));

export function shensha(pillars, gender) {
  const P = POS.map(([k]) => ({ k, s: pillars[k][0], b: pillars[k][1], gz: pillars[k] }));
  const [Y, M, D, H] = P;
  const out = { year: new Set(), month: new Set(), day: new Set(), hour: new Set() };
  const markBranches = (name, branches) => { if (branches) for (const p of P) if (branches.includes(p.b)) out[p.k].add(name); };
  const markStems = (name, stem) => { if (stem) for (const p of P) if (p.s === stem) out[p.k].add(name); };
  for (const [name, map] of Object.entries(STEM_TO_BRANCH)) { markBranches(name, map[Y.s]); markBranches(name, map[D.s]); }
  for (const [name, map] of Object.entries(DAY_STEM_TO_BRANCH)) markBranches(name, map[D.s]);
  for (const [name, f] of Object.entries(BRANCH_RULES)) { markBranches(name, f(Y.b)); markBranches(name, f(D.b)); }
  for (const [name, f] of Object.entries(YEAR_BRANCH_RULES)) markBranches(name, f(Y.b));
  for (const [name, v] of [['天德贵人', TIANDE[M.b]], ['天德合', TIANDE_HE[M.b]]]) (STEMS.includes(v) ? markStems : markBranches)(name, v);
  markStems('月德贵人', YUEDE(M.b)); markStems('月德合', YUEDE_HE(M.b));
  markBranches('天医', BRANCHES[(BRANCHES.indexOf(M.b) + 11) % 12]);
  for (const base of [Y, D]) { const el = NAYIN_EL(nayin(base.gz)); markBranches('学堂', NAYIN_XUETANG[el]); markBranches('词馆', NAYIN_CIGUAN[el]); }
  markBranches('元辰', yuanchen(Y.b, gender, Y.s));
  const has = b => P.some(p => p.b === b);
  if (has('戌') && has('亥')) markBranches('天罗地网', '戌亥');
  if (has('辰') && has('巳')) markBranches('天罗地网', '辰巳');
  for (const [name, set] of Object.entries(DAY_PILLAR_SETS)) if (set.includes(D.gz)) out.day.add(name);
  for (const p of [D, H]) if (JINSHEN.includes(p.gz)) out[p.k].add('金神');
  if (TIANSHE[M.b] === D.gz) out.day.add('天赦');
  return Object.fromEntries(Object.entries(out).map(([k, set]) => [k, SHENSHA_ORDER.filter(n => set.has(n))]));
}

/** P7-3: which branch-based 神煞 (looked up from 年干/日干/年支/日支) fall on a given branch, e.g. a 流年 branch. */
export function shenshaOnBranch(pillars, branch) {
  const Y = { s: pillars.year[0], b: pillars.year[1] }, D = { s: pillars.day[0], b: pillars.day[1] }, out = new Set();
  for (const [n, m] of Object.entries(STEM_TO_BRANCH)) if ((m[Y.s] ?? '').includes(branch) || (m[D.s] ?? '').includes(branch)) out.add(n);
  for (const [n, m] of Object.entries(DAY_STEM_TO_BRANCH)) if ((m[D.s] ?? '').includes(branch)) out.add(n);
  for (const [n, f] of Object.entries(BRANCH_RULES)) if (f(Y.b) === branch || f(D.b) === branch) out.add(n);
  for (const [n, f] of Object.entries(YEAR_BRANCH_RULES)) if (f(Y.b) === branch) out.add(n);
  return SHENSHA_ORDER.filter(n => out.has(n));
}

const REL_POS = { year: '年', month: '月', day: '日', hour: '时' };
export function relationLines(natalRelations) {
  return natalRelations.map(r => { const l = r.layer === 'stem' ? '干' : '支'; return `${r.chars}${r.type}（${REL_POS[r.a]}${l}·${REL_POS[r.b]}${l}）`; });
}

/** The professional chart section of the API response (chart.pro). */
export function buildProChart({ pillars, gender, dayun, annual, natalRelations }) {
  const dm = pillars.day[0];
  const ss = shensha(pillars, gender);
  const dayKong = xunkong(pillars.day);
  const rows = POS.map(([k, label]) => {
    const [s, b] = pillars[k];
    return {
      key: k, label, stem: s, branch: b,
      stemGod: k === 'day' ? '日主' : tenGodOf(dm, s),
      hidden: HIDDEN[b].map(h => ({ stem: h, god: tenGodOf(dm, h) })),
      nayin: nayin(pillars[k]), starLuck: stage(dm, b), selfSeat: stage(s, b), xunkong: xunkong(pillars[k]),
      kong: k !== 'day' && dayKong.includes(b), shensha: ss[k]
    };
  });
  const godsOf = gz => ({ pillar: gz, stemGod: tenGodOf(dm, gz[0]), branchGod: tenGodOf(dm, HIDDEN[gz[1]][0]) });
  return { pillars: rows, dayKong, relations: relationLines(natalRelations || []), dayun: dayun.map(godsOf), annual: annual ? godsOf(annual) : null };
}
