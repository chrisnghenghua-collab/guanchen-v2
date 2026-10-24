// GUANCHEN P7-3 (2026-10-24) - 大运 / 流年 detail: per step and per year an outline (大纲) and cautions (注意事项),
// plus months to watch for each 流年. Pure rules over verified facts: the step/year pillar's ten gods, its five elements
// judged against chart.fiveElements (喜用神, P7-2), and its 冲/刑/害/合 with the natal palaces. All wording is in
// copy/zh-CN.csv (pd.* rows). Conventions: a 大运 covers the 10 流年 starting in its start year; ages are 周岁 (year - birth year);
// 前五年看天干、后五年看地支; months follow the 节 (立春 starts 寅月), month stems by 五虎遁.
import { STEMS, BRANCHES, HIDDEN, tenGodOf, FAMILY_OF, branchRelations, stemRelations } from './facts.mjs';
import { JIAZI, shenshaOnBranch } from './pro-chart.mjs';
import { jieTermsForGregorianYear } from '../packages/step01-production-core/src/core/bazi/calendar/solarTerms.mjs';
import { formatInstantInAuthorityZone } from '../packages/step01-production-core/src/core/bazi/time/timezoneAuthority.mjs';

const STEM_EL = '木木火火土土金金水水';
const elOfStem = s => STEM_EL[STEMS.indexOf(s)];
const elOfBranch = b => elOfStem(HIDDEN[b][0]);
const POS = ['year', 'month', 'day', 'hour'];
const TONE = { GG: 'smooth', GN: 'fair', NG: 'fair', GB: 'mixed', BG: 'mixed', NN: 'steady', NB: 'slow', BN: 'slow', BB: 'guard' };
const YEAR_SHENSHA = ['天乙贵人', '文昌贵人', '禄神', '驿马', '桃花', '红鸾', '天喜', '羊刃', '劫煞', '灾煞'];
const PO = new Set(['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌'].map(s => [...s].sort().join('')));
const yearPillar = y => JIAZI[((y - 4) % 60 + 60) % 60];

function classify(ys) {
  const good = new Set([ys.yong.element, ...ys.xi.map(x => x.element)]), bad = new Set(ys.ji.map(x => x.element));
  return el => good.has(el) ? 'G' : bad.has(el) ? 'B' : 'N';
}
function hitKeys(gz, natal) {
  const [s, b] = gz, keys = [];
  for (const pos of POS) for (const r of branchRelations(b, natal[pos][1])) {
    if (['冲', '刑', '害'].includes(r)) keys.push(`pd.hit.${r}.${pos}`);
    else if (r === '合' && pos === 'day') keys.push('pd.hit.合.day');
  }
  if (stemRelations(s, natal.day[0]).includes('合')) keys.push('pd.hit.stemhe');
  return [...new Set(keys)];
}

export function buildPeriods({ pillars, gender, ys, luck, birthYear, zone, currentDayun, currentAnnual, asOfYear, t }) {
  const dm = pillars.day[0], cls = classify(ys);
  const gods = gz => ({ stemGod: tenGodOf(dm, gz[0]), branchGod: tenGodOf(dm, HIDDEN[gz[1]][0]) });
  const theme = (god, c, age) => age < 18 ? t(`pd.youth.${FAMILY_OF[god]}`) : t(`pd.theme.${FAMILY_OF[god]}.${c}`);
  const loveLine = (g, age) => {
    if (age < 18 || age > 60) return [];
    const fams = [FAMILY_OF[g.stemGod], FAMILY_OF[g.branchGod]];
    if (gender === 'MALE' && fams.includes('财')) return [t('pd.love.财')];
    if (gender === 'FEMALE' && fams.includes('官杀')) return [t('pd.love.官杀')];
    return [];
  };
  const ta = (key, age, vars) => (age < 18 && t.has(key + '.youth') ? t(key + '.youth', vars) : t(key, vars));   // under-18 wording where it exists
  const day = ms => { const c = formatInstantInAuthorityZone(ms, zone); return `${c.month}月${c.day}日`; };

  function months(y, age) {
    const jie = jieTermsForGregorianYear(y), nx = jieTermsForGregorianYear(y + 1);
    const starts = [...jie.slice(1).map(j => j.instantMs), nx[0].instantMs, nx[1].instantMs];   // 立春..大雪, 小寒, next 立春
    const s0 = ((STEMS.indexOf(yearPillar(y)[0]) % 5) * 2 + 2) % 10;                           // 五虎遁: stem of 寅月
    const watch = [], good = [];
    for (let k = 0; k < 12; k++) {
      const gz = STEMS[(s0 + k) % 10] + BRANCHES[(2 + k) % 12], [s, b] = gz;
      const line = reason => t('pd.month.line', { branch: b, from: day(starts[k]), to: day(starts[k + 1] - 86400000), reason });
      const c = cls(elOfStem(s)) + cls(elOfBranch(b));
      const clashDay = branchRelations(b, pillars.day[1]).includes('冲'), clashMonth = branchRelations(b, pillars.month[1]).includes('冲');
      if (clashDay) watch.push(line(ta('pd.month.clash_day', age)));
      else if (clashMonth) watch.push(line(ta('pd.month.clash_month', age)));
      else if (c === 'BB') watch.push(line(t('pd.month.ji')));
      else if (c.includes('G') && !c.includes('B')) good.push(line(t('pd.month.good')));
    }
    return { watch: watch.slice(0, 3), good: good.slice(0, 3) };
  }

  function yearDetail(y, dy) {
    const gz = yearPillar(y), [s, b] = gz, g = gods(gz), age = y - birthYear;
    const tone = TONE[cls(elOfStem(s)) + cls(elOfBranch(b))];
    const outline = [t(`pd.tone.${tone}`, { span: t('pd.span.year') }), t('pd.year.main', { god: g.stemGod }) + theme(g.stemGod, cls(elOfStem(s)), age)];
    if (FAMILY_OF[g.branchGod] !== FAMILY_OF[g.stemGod]) outline.push(t('pd.year.also', { god: g.branchGod }) + theme(g.branchGod, cls(elOfBranch(b)), age));
    outline.push(...loveLine(g, age));
    const cautions = [];
    const bc = branchRelations(b, dy[1]).includes('冲');
    if (bc && stemRelations(s, dy[0]).includes('冲')) cautions.push(t('pd.sy.tkdc')); else if (bc) cautions.push(t('pd.sy.clash'));
    const nb = pillars.year[1], rel = branchRelations(b, nb);
    if (b === nb) cautions.push(t('pd.taisui.值'));
    for (const r of ['冲', '刑', '害']) if (b !== nb && rel.includes(r)) cautions.push(ta(`pd.taisui.${r}`, age));
    if (PO.has([b, nb].sort().join(''))) cautions.push(t('pd.taisui.破'));
    cautions.push(...hitKeys(gz, pillars).map(k => ta(k, age)));
    const ni = BRANCHES.indexOf(nb);
    if (b === BRANCHES[(ni + 2) % 12]) cautions.push(t('pd.sangmen'));
    if (b === BRANCHES[(ni + 10) % 12]) cautions.push(t('pd.diaoke'));
    const tags = shenshaOnBranch(pillars, b).filter(n => YEAR_SHENSHA.includes(n)).map(name => ({ name, note: t(`pd.ss.${name}`) }));
    return { year: y, age, pillar: gz, ...g, tone, label: t(`pd.label.${tone}`), current: gz === currentAnnual && Math.abs(y - asOfYear) <= 1,
      outline, cautions: cautions.length ? [...new Set(cautions)].slice(0, 5) : [t('pd.none')], tags, months: months(y, age) };
  }

  return luck.filter(d => +d.startDate.slice(0, 4) - birthYear < 100 && +d.startDate.slice(0, 4) <= 2099).map(({ pillar: gz, startDate, startAge }) => {
    const [s, b] = gz, g = gods(gz), startYear = +startDate.slice(0, 4), a1 = startYear - birthYear;
    const cs = cls(elOfStem(s)), cb = cls(elOfBranch(b)), tone = TONE[cs + cb];
    const outline = [t(`pd.tone.${tone}`, { span: t('pd.span.dayun') })];
    if (FAMILY_OF[g.stemGod] === FAMILY_OF[g.branchGod] && cs === cb && (a1 >= 18) === (a1 + 5 >= 18)) outline.push(t('pd.half.same', { god: g.stemGod === g.branchGod ? g.stemGod : g.stemGod + '、' + g.branchGod }) + theme(g.stemGod, cs, a1));
    else outline.push(t('pd.half.first', { gz: s, god: g.stemGod }) + theme(g.stemGod, cs, a1), t('pd.half.second', { gz: b, god: g.branchGod }) + theme(g.branchGod, cb, a1 + 5));
    outline.push(...loveLine(g, a1 + 5));
    const hk = hitKeys(gz, pillars);
    const years = [];
    for (let y = startYear; y < startYear + 10 && y <= 2099; y++) years.push(yearDetail(y, gz));
    return { pillar: gz, startYear, endYear: startYear + 9, startAge, ageFrom: a1, ageTo: a1 + 9, ...g, tone, label: t(`pd.label.${tone}`), current: gz === currentDayun,
      outline, cautions: hk.length ? hk.map(k => ta(k, a1)) : [t('pd.none')], years };
  });
}
