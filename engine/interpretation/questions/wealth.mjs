import { bandGroup, dmLine, familyTerm, structureLine, luckTerm, luckLine, familyMeaning, luckWeights, luckTheme, topOf, famLevel, LEVEL_ZH, answer } from '../lib.mjs';
import { FAMILY_OF } from '../facts.mjs';
import { pickMonths, monthName, monthTerm } from './career.mjs';

const wealthLevel = (f, g) => { const w = f.familyWeights['财']; return w === 0 ? 'none' : w < 1.5 ? 'weak' : w < 3 ? 'present' : (g === 'weak' ? 'heavy_weak' : 'strong'); };
const W_TERM = { none: '原局几乎不见财星', weak: '财星偏弱', present: '财星适中', strong: '财星明显', heavy_weak: '财星明显，日主偏弱' };
const wealthLine = (f, t, g) => { const wl = wealthLevel(f, g); return { term: W_TERM[wl], plain: t(`WEALTH_INVESTMENT_STYLE.wealth.${wl}`) }; };

// ---- 投资风格 ----
export function wealthInvestmentStyle(f, t) {
  const q = 'WEALTH_INVESTMENT_STYLE', g = bandGroup(f.strengthBand);
  let variant = f.dominantFamily;
  if (variant === '财') variant = g === 'weak' ? '财_weak' : '财_strong';
  const basis = [dmLine(f, t), { term: familyTerm(f), plain: t(`${q}.family.${f.dominantFamily}`) }, wealthLine(f, t, g)];
  if (f.structure.reviewOpen) basis.push(structureLine(f, t));
  basis.push(luckLine(f, t));
  const luckFam = FAMILY_OF[f.annual.stemGod] === FAMILY_OF[f.annual.branchGod] ? FAMILY_OF[f.annual.stemGod] : luckTheme(f);
  return answer(q, variant, t(`${q}.conclusion.${variant}`), basis, [t(`${q}.advice.${variant}.1`), t(`${q}.advice.${variant}.2`), t(`${q}.luck.${luckFam}`)], t(`${q}.reminder`));
}

// ---- 财运现状（以今年为主） ----
const ANNUAL_HEAVY = { ds: 0.8, db: 0.8, as: 1.2, ab: 1.2 };
export function wealthCurrentState(f, t) {
  const q = 'WEALTH_CURRENT_STATE', g = bandGroup(f.strengthBand), theme = luckTheme(f, ANNUAL_HEAVY);
  const basis = [{ term: luckTerm(f), plain: t(`${q}.luck.${theme}`) }, wealthLine(f, t, g), dmLine(f, t)];
  if (f.structure.reviewOpen) basis.push(structureLine(f, t));
  return answer(q, `${theme}/${g}`, t(`${q}.conclusion.${theme}`) + t(`${q}.capacity.${theme}.${g}`), basis, [t(`${q}.advice.${theme}.1`), t(`${q}.advice.${theme}.2`)], t(`${q}.reminder`));
}

// ---- 收入成长（原局赚钱路线 + 时机） ----
export function wealthIncomeGrowth(f, t) {
  const q = 'WEALTH_INCOME_GROWTH', g = bandGroup(f.strengthBand), theme = luckTheme(f);
  const ss = famLevel(f, '食伤'), cai = famLevel(f, '财'), ok = l => ['present', 'strong'].includes(l);
  let route;
  if (ok(ss) && ok(cai) && g !== 'weak') route = 'SKILL';
  else if (f.dominantFamily === '官杀') route = 'POSITION';
  else if (f.dominantFamily === '印') route = 'CREDENTIAL';
  else if (f.dominantFamily === '比劫') route = 'NETWORK';
  else if (f.dominantFamily === '财') route = g === 'weak' ? 'CAPACITY' : 'DEAL';
  else route = 'CREATIVE';
  const basis = [{ term: `${familyTerm(f)}；食伤${LEVEL_ZH[ss]}、财星${LEVEL_ZH[cai]}`, plain: t(`${q}.route.${route}`) }, { term: luckTerm(f), plain: t(`${q}.luck.${theme}`) }, dmLine(f, t)];
  if (f.structure.reviewOpen) basis.push(structureLine(f, t));
  return answer(q, `${route}/${theme}`, t(`${q}.conclusion.${route}`) + t(`${q}.timing.${theme}`), basis, [t(`${q}.advice.${route}.1`), t(`${q}.advice.${route}.2`), t(`${q}.timing_advice.${theme}`)], t('WEALTH_CURRENT_STATE.reminder'));
}

// ---- 现金流（漏财结构 + 时机） ----
export function wealthCashflow(f, t) {
  const q = 'WEALTH_CASHFLOW', g = bandGroup(f.strengthBand), theme = luckTheme(f, ANNUAL_HEAVY);
  const lv = fam => famLevel(f, fam), W = f.familyWeights;
  let type;
  if (lv('财') === 'none' || (lv('财') === 'weak' && W['财'] < 1)) type = 'THIN_INFLOW';
  else if (lv('比劫') === 'strong' && W['比劫'] >= W['财']) type = 'PEER_DRAIN';
  else if (lv('食伤') === 'strong' && W['食伤'] >= W['印']) type = 'INTEREST_SPEND';
  else if (lv('官杀') === 'strong') type = 'OBLIGATION';
  else if (lv('印') === 'strong') type = 'RETAIN_OK';
  else type = 'BALANCED';
  const basis = [{ term: `比劫${LEVEL_ZH[lv('比劫')]}、食伤${LEVEL_ZH[lv('食伤')]}、财星${LEVEL_ZH[lv('财')]}、官杀${LEVEL_ZH[lv('官杀')]}、印星${LEVEL_ZH[lv('印')]}`, plain: t(`${q}.natal.${type}`) },
    { term: luckTerm(f), plain: t(`${q}.luck.${theme}`) }, dmLine(f, t)];
  if (f.structure.reviewOpen) basis.push(structureLine(f, t));
  return answer(q, `${type}/${theme}`, t(`${q}.conclusion.${type}`) + t(`${q}.timing.${theme}`), basis, [t(`${q}.advice.${type}.1`), t(`${q}.advice.${type}.2`), t(`${q}.timing_advice.${theme}`)], t('WEALTH_CURRENT_STATE.reminder'));
}

// ---- 财富机会（以十年大运为主） ----
// Dayun only when it exists (copy says “这步大运”); before luck starts, fall back to the annual pillar.
const DAYUN_ONLY = { ds: 1.0, db: 1.2, as: 0, ab: 0 };
export function wealthOpportunity(f, t) {
  const q = 'WEALTH_OPPORTUNITY', g = bandGroup(f.strengthBand), theme = luckTheme(f, f.dayun ? DAYUN_ONLY : undefined);
  const basis = [{ term: luckTerm(f), plain: t(`${q}.luck.${theme}`) }, wealthLine(f, t, g), dmLine(f, t)];
  if (f.structure.reviewOpen) basis.push(structureLine(f, t));
  return answer(q, `${theme}/${g}`, t(`${q}.conclusion.${theme}`) + t(`${q}.capacity.${g}`), basis, [t(`${q}.advice.${theme}.1`), t(`${q}.advice.${theme}.2`), t(`${q}.capacity_advice.${g}`)], t('WEALTH_CURRENT_STATE.reminder'));
}

// ---- 未来 12 个月 ----
const WEALTH_SCORE = { strong: { 财: 2, 食伤: 1.5, 官杀: 0.5, 印: 0, 比劫: -1 }, balanced: { 财: 1.5, 食伤: 1.2, 印: 0.5, 官杀: 0.3, 比劫: -0.8 }, weak: { 印: 1.2, 比劫: 1.0, 财: 0.5, 食伤: -0.5, 官杀: -0.8 } };
export function wealthNext12m(f, t) {
  const q = 'WEALTH_NEXT_12M', g = bandGroup(f.strengthBand), theme = luckTheme(f);
  const rows = f.months.slice(0, 12);
  const { peakList, cautionRow } = pickMonths(f, rows, WEALTH_SCORE, (m, gg) => (gg !== 'weak' && m.families.includes('比劫') ? 2 : 0), 2);
  const famOf = m => m.families[0];
  const yearTurn = rows.find(m => m.jie === '立春');
  const basis = [luckLine(f, t)];
  for (const p of peakList) basis.push({ term: monthTerm(p), plain: t(`${q}.month.${g}.${famOf(p)}`) });
  if (cautionRow) basis.push({ term: monthTerm(cautionRow), plain: cautionRow.hit ? t(`${q}.caution.${cautionRow.hit.type === '自刑' ? '刑' : cautionRow.hit.type}`) : t(`${q}.caution.peer`) });
  if (yearTurn) basis.push({ term: `${yearTurn.from.replace('起', '')}立春，进入${f.nextAnnual.pillar}流年（${f.nextAnnual.stemGod === f.nextAnnual.branchGod ? f.nextAnnual.stemGod : f.nextAnnual.stemGod + '、' + f.nextAnnual.branchGod}）`, plain: t(`${q}.yearturn`) });
  basis.push(dmLine(f, t));
  const conclusion = t(`${q}.conclusion`, { theme: t(`${q}.theme.${theme}`), peak1: monthName(peakList[0]), peak2: monthName(peakList[1]) }) + (cautionRow ? t(`${q}.conclusion.caution`, { month: monthName(cautionRow) }) : t(`${q}.conclusion.nocaution`));
  const advice = [t(`${q}.advice.peak.${g}`, { month: monthName(peakList[0]) }), cautionRow ? t(`${q}.advice.caution`, { month: monthName(cautionRow) }) : null, t(`${q}.advice.theme.${theme}`)];
  return answer(q, `${theme}/${cautionRow ? 'caution' : 'smooth'}/${g}`, conclusion, basis, advice, t('WEALTH_CURRENT_STATE.reminder'));
}
