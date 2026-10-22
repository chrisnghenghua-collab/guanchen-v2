// GUANCHEN interpretation v2 - ChartFacts.
// Turns the verified calculation result (core pillars/luck + strength/structure analysis + current timing)
// into a plain, inspectable set of chart facts that the copy generator can quote.
// Self-contained traditional tables; no hidden scoring. Created P3-1, 2026-10-22.

export const STEMS = '甲乙丙丁戊己庚辛壬癸';
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const STEM_EL = '木木火火土土金金水水';
const BRANCH_EL = '水土木木土火火土金金土水';
const EL_ORDER = '木火土金水';
export const ELEMENT_NAME = { 木: '木', 火: '火', 土: '土', 金: '金', 水: '水' };
// 藏干: [本气, 中气, 余气]
export const HIDDEN = { 子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'], 辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'],
  午: ['丁', '己'], 未: ['己', '丁', '乙'], 申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲'] };
const HIDDEN_W = [1.0, 0.5, 0.3];
const MONTH_FACTOR = 1.5;
const yinYang = stem => STEMS.indexOf(stem) % 2 === 0 ? '阳' : '阴';
const produces = (a, b) => EL_ORDER[(EL_ORDER.indexOf(a) + 1) % 5] === b;
const controls = (a, b) => EL_ORDER[(EL_ORDER.indexOf(a) + 2) % 5] === b;

export const TEN_GODS = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'];
export const FAMILY_OF = { 比肩: '比劫', 劫财: '比劫', 食神: '食伤', 伤官: '食伤', 偏财: '财', 正财: '财', 七杀: '官杀', 正官: '官杀', 偏印: '印', 正印: '印' };
export const FAMILIES = ['比劫', '食伤', '财', '官杀', '印'];
export function tenGodOf(dayStem, other) {
  const a = STEM_EL[STEMS.indexOf(dayStem)], b = STEM_EL[STEMS.indexOf(other)];
  const same = yinYang(dayStem) === yinYang(other);
  if (a === b) return same ? '比肩' : '劫财';
  if (produces(a, b)) return same ? '食神' : '伤官';
  if (controls(a, b)) return same ? '偏财' : '正财';
  if (controls(b, a)) return same ? '七杀' : '正官';
  if (produces(b, a)) return same ? '偏印' : '正印';
  throw new Error('TEN_GOD_UNRESOLVED');
}
// Engine (patternEngine.tenGod) English keys -> Chinese, used for cross-checks.
export const TEN_GOD_EN = { PEER: '比肩', ROB_WEALTH: '劫财', EATING_GOD: '食神', HURTING_OFFICER: '伤官', INDIRECT_WEALTH: '偏财', DIRECT_WEALTH: '正财', SEVEN_KILLINGS: '七杀', DIRECT_OFFICER: '正官', INDIRECT_RESOURCE: '偏印', DIRECT_RESOURCE: '正印' };

const pairKey = (a, b) => [a, b].sort().join('');
const SIX_CLASH = new Set(['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'].map(s => pairKey(s[0], s[1])));
const SIX_COMBINE = { [pairKey('子', '丑')]: '土', [pairKey('寅', '亥')]: '木', [pairKey('卯', '戌')]: '火', [pairKey('辰', '酉')]: '金', [pairKey('巳', '申')]: '水', [pairKey('午', '未')]: '火' };
const HARM = new Set(['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'].map(s => pairKey(s[0], s[1])));
const PUNISH_PAIR = new Set(['寅巳', '巳申', '寅申', '丑戌', '戌未', '丑未', '子卯'].map(s => pairKey(s[0], s[1])));
const SELF_PUNISH = new Set(['辰', '午', '酉', '亥']);
const TRINE = [['申', '子', '辰', '水'], ['亥', '卯', '未', '木'], ['寅', '午', '戌', '火'], ['巳', '酉', '丑', '金']];
const STEM_COMBINE = { [pairKey('甲', '己')]: '土', [pairKey('乙', '庚')]: '金', [pairKey('丙', '辛')]: '水', [pairKey('丁', '壬')]: '木', [pairKey('戊', '癸')]: '火' };
const STEM_CLASH = new Set(['甲庚', '乙辛', '丙壬', '丁癸'].map(s => pairKey(s[0], s[1])));

export function branchRelations(a, b) {
  const k = pairKey(a, b), out = [];
  if (a === b) { if (SELF_PUNISH.has(a)) out.push('自刑'); return out; }
  if (SIX_CLASH.has(k)) out.push('冲');
  if (SIX_COMBINE[k]) out.push('合');
  if (HARM.has(k)) out.push('害');
  if (PUNISH_PAIR.has(k)) out.push('刑');
  for (const [x, y, z, el] of TRINE) { const set = [x, y, z]; if (set.includes(a) && set.includes(b) && (a === y || b === y)) out.push('半合' + el); }
  return out;
}
export function stemRelations(a, b) { const k = pairKey(a, b), out = []; if (STEM_COMBINE[k]) out.push('合'); if (STEM_CLASH.has(k)) out.push('冲'); return out; }

export const POSITIONS = ['year', 'month', 'day', 'hour'];
export const POSITION_ZH = { year: '年', month: '月', day: '日', hour: '时' };
// What each palace usually stands for in readings.
export const PALACE = { year: '外在环境与早年', month: '工作环境与成长背景', day: '自己与亲密关系', hour: '计划、晚辈与后段人生' };
export const SEASON_ZH = { WANG: '旺', XIANG: '相', XIU: '休', QIU: '囚', SI: '死' };
export const BAND_ZH = { VERY_STRONG: '身极强', STRONG: '身强', BALANCED_STRONG: '偏强', BALANCED: '中和', BALANCED_WEAK: '偏弱', WEAK: '身弱', VERY_WEAK: '身极弱' };
export const STAGE_ZH = { FORMED: '成格', FORMED_WITH_FLAW: '成格有瑕', RESCUED: '有救应', REVIEW: '格局待确认', BROKEN: '破格' };
const STEM_IMAGE = { 甲: '大树之木', 乙: '花草之木', 丙: '太阳之火', 丁: '灯烛之火', 戊: '高山厚土', 己: '田园之土', 庚: '刀斧之金', 辛: '珠玉之金', 壬: '江河之水', 癸: '雨露之水' };

function profileOf(dayStem, pillars) {
  const weights = Object.fromEntries(TEN_GODS.map(g => [g, 0])), elements = Object.fromEntries([...EL_ORDER].map(e => [e, 0]));
  const visible = {}, hiddenMain = {};
  for (const pos of POSITIONS) {
    const [s, b] = pillars[pos];
    if (pos !== 'day') { const g = tenGodOf(dayStem, s); weights[g] += 1; visible[pos] = g; }
    elements[STEM_EL[STEMS.indexOf(s)]] += 1;
    HIDDEN[b].forEach((h, i) => { const w = HIDDEN_W[i] * (pos === 'month' ? MONTH_FACTOR : 1); weights[tenGodOf(dayStem, h)] += w; elements[STEM_EL[STEMS.indexOf(h)]] += w; });
    hiddenMain[pos] = tenGodOf(dayStem, HIDDEN[b][0]);
  }
  const families = Object.fromEntries(FAMILIES.map(f => [f, 0]));
  for (const [g, w] of Object.entries(weights)) families[FAMILY_OF[g]] += w;
  const round = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v * 10) / 10]));
  const ranked = Object.entries(families).sort((a, b) => b[1] - a[1]);
  return { tenGodWeights: round(weights), familyWeights: round(families), elementWeights: round(elements), visibleTenGods: visible, hiddenMainTenGods: hiddenMain,
    dominantFamily: ranked[0][0], secondFamily: ranked[1][0], weakestFamily: ranked.at(-1)[0], missingFamilies: ranked.filter(([, v]) => v === 0).map(([k]) => k) };
}

function natalRelations(pillars) {
  const out = [];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const p = POSITIONS[i], q = POSITIONS[j];
    for (const r of branchRelations(pillars[p][1], pillars[q][1])) out.push({ layer: 'branch', type: r, a: p, b: q, chars: pillars[p][1] + pillars[q][1] });
    for (const r of stemRelations(pillars[p][0], pillars[q][0])) out.push({ layer: 'stem', type: r, a: p, b: q, chars: pillars[p][0] + pillars[q][0] });
  }
  return out;
}

function luckLayer(dayStem, pillar, pillars) {
  if (!pillar) return null;
  const [s, b] = pillar;
  const hits = [];
  for (const pos of POSITIONS) {
    for (const r of branchRelations(b, pillars[pos][1])) hits.push({ layer: 'branch', type: r, target: pos, chars: b + pillars[pos][1] });
    for (const r of stemRelations(s, pillars[pos][0])) hits.push({ layer: 'stem', type: r, target: pos, chars: s + pillars[pos][0] });
  }
  const stemGod = tenGodOf(dayStem, s), branchGod = tenGodOf(dayStem, HIDDEN[b][0]);
  return { pillar, stemGod, branchGod, families: [...new Set([FAMILY_OF[stemGod], FAMILY_OF[branchGod]])], element: { stem: STEM_EL[STEMS.indexOf(s)], branch: BRANCH_EL[BRANCHES.indexOf(b)] }, hits };
}

// Upcoming solar (jie) months from asOf: the current month, then one row per future 节.
// Month pillars advance by one jiazi step at every 节, starting from the engine's verified asOf month pillar.
const JIAZI = Array.from({ length: 60 }, (_, i) => STEMS[i % 10] + BRANCHES[i % 12]);
function upcomingMonths(dayStem, core, timingRoot, normalized, pillars, count) {
  const start = JIAZI.indexOf(core.timing.month.name);
  if (start < 0) return [];
  const off = normalized.asOf.offsetMinutes * 60000;
  const label = ms => { const d = new Date(ms + off); return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`; };
  const rows = [{ pillar: core.timing.month.name, from: '现在', jie: null, startMs: normalized.asOf.instantMs }];
  for (const [k, j] of (timingRoot.jieBoundaries ?? []).entries()) { if (rows.length >= count) break; const ms = Date.parse(j.instant); rows.push({ pillar: JIAZI[(start + k + 1) % 60], from: `${label(ms)}起`, jie: j.name, startMs: ms }); }
  return rows.map(r => { const l = luckLayer(dayStem, r.pillar, pillars); return { ...r, stemGod: l.stemGod, branchGod: l.branchGod, families: l.families, hits: l.hits }; });
}

/** inputs = composeProductionInputs(request) for a KNOWN chart */
export function buildChartFacts(inputs) {
  const { core, analysis, timingRoot, normalized } = inputs;
  const pillars = core.pillars, dayStem = pillars.day[0];
  const st = analysis.strength, res = analysis.resolution;
  const prof = profileOf(dayStem, pillars);
  const dayun = timingRoot.timing.dayun ?? null;
  return {
    gender: normalized.request.birth.gender,
    pillars,
    dayMaster: { stem: dayStem, element: STEM_EL[STEMS.indexOf(dayStem)], yinYang: yinYang(dayStem), image: STEM_IMAGE[dayStem] },
    monthBranch: pillars.month[1],
    season: SEASON_ZH[st.seasonState] ?? st.seasonState,
    seasonKey: st.seasonState,
    rootLevel: st.rootLevel, supportLevel: st.supportLevel, opposingLevel: st.opposingLevel,
    strengthBand: res.strengthBand, strengthZh: BAND_ZH[res.strengthBand] ?? res.strengthBand,
    structure: { key: res.baseStructure?.key ?? null, label: res.baseStructure?.label ?? null, stage: res.stage, stageZh: STAGE_ZH[res.stage] ?? res.stage, reviewOpen: res.stage === 'REVIEW' },
    ...prof,
    spouseStarFamily: normalized.request.birth.gender === 'MALE' ? '财' : '官杀',
    natalRelations: natalRelations(pillars),
    luckStatus: timingRoot.status,
    dayun: dayun ? luckLayer(dayStem, dayun, pillars) : null,
    annual: luckLayer(dayStem, timingRoot.timing.year, pillars),
    // 岁运关系: annual pillar vs current dayun pillar
    annualVsDayun: dayun ? [...branchRelations(timingRoot.timing.year[1], dayun[1]).map(type => ({ layer: 'branch', type, chars: timingRoot.timing.year[1] + dayun[1] })),
      ...stemRelations(timingRoot.timing.year[0], dayun[0]).map(type => ({ layer: 'stem', type, chars: timingRoot.timing.year[0] + dayun[0] }))] : [],
    asOf: normalized.asOf.original,
    months: timingRoot.status === 'ACTIVE' ? upcomingMonths(dayStem, core, timingRoot, normalized, pillars, 13) : [],
    nextAnnual: luckLayer(dayStem, JIAZI[(JIAZI.indexOf(timingRoot.timing.year) + 1) % 60], pillars),
  };
}
