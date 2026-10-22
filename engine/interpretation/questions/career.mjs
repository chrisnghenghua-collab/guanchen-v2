import { bandGroup, uniq, FAM_DISPLAY, dmLine, familyTerm, structureLine, luckTerm, luckLine, familyMeaning, luckWeights, luckTheme, topOf, inLuck, palaceHits, famLevel, LEVEL_ZH, gods, answer, POSITION_ZH } from '../lib.mjs';

// ---- 事业现状 ----
export function careerCurrentState(f, t) {
  const q = 'CAREER_CURRENT_STATE', g = bandGroup(f.strengthBand), theme = luckTheme(f);
  const bg = f.dayun && !f.dayun.families.includes(theme) ? t(`${q}.luck.background`, { dayunMeaning: familyMeaning(t, f.dayun.families) }) : '';
  const basis = [{ term: luckTerm(f), plain: t(`${q}.luck.${theme}`) + bg }, dmLine(f, t), { term: familyTerm(f), plain: t(`${q}.family.${f.dominantFamily}`) }];
  const monthHits = palaceHits(f, 'month');
  if (monthHits[0]) { const h = monthHits[0]; basis.push({ term: `${h.who}${h.chars[0]}${h.type}月支${h.chars[1]}`, plain: t(`${q}.month.${h.type}`, { who: h.who }) }); }
  if (f.structure.reviewOpen) basis.push(structureLine(f, t));
  const advice = [t(`${q}.advice.${theme}.1`), t(`${q}.advice.${theme}.2`)];
  if (monthHits.some(h => h.type === '冲')) advice.push(t(`${q}.advice.month_clash`));
  else if (theme === '官杀' && g === 'weak') advice.push(t(`${q}.advice.weak_pressure`));
  return answer(q, `${theme}/${g}`, t(`${q}.conclusion.${theme}`) + t(`${q}.capacity.${g}`), basis, advice, t(`${q}.reminder`));
}

// ---- 换工作（中立：结论讲这段时间的节奏，现况只影响建议） ----
export const JOB_CHANGE_CONTEXTS = ['NONE', 'STABLE_CONSIDERING', 'SEARCHING', 'INTERVIEWING', 'OFFER_RECEIVED', 'WANT_TO_LEAVE', 'RESTRUCTURING', 'RESIGNATION_DECIDED'];
export function careerJobChange(f, t, ctx = 'NONE') {
  const q = 'CAREER_JOB_CHANGE', g = bandGroup(f.strengthBand), theme = luckTheme(f);
  const hits = palaceHits(f, 'month', ['冲', '刑']);
  const variant = hits.length ? 'CHANGE_ACTIVE' : theme;
  const basis = [{ term: luckTerm(f), plain: t(`CAREER_CURRENT_STATE.luck.${theme}`) }];
  if (hits[0]) { const h = hits[0]; basis.push({ term: `${h.who}${h.chars[0]}${h.type}月支${h.chars[1]}`, plain: t(`CAREER_CURRENT_STATE.month.${h.type}`, { who: h.who }) }); }
  basis.push(dmLine(f, t), { term: familyTerm(f), plain: t(`CAREER_CURRENT_STATE.family.${f.dominantFamily}`) });
  if (f.structure.reviewOpen) basis.push(structureLine(f, t));
  const advice = [t(`${q}.advice.${variant}`), t(`${q}.context.${JOB_CHANGE_CONTEXTS.includes(ctx) ? ctx : 'NONE'}`)];
  if (g === 'weak') advice.push(t(`${q}.advice.weak_buffer`));
  return answer(q, variant, t(`${q}.conclusion.${variant}`), basis, advice, t(`${q}.reminder`));
}

// ---- 新机会（中立：运势适合哪一类机会 + 原局适合的环境 + 机会类型的评估重点） ----
export const NEW_OPPORTUNITY_CONTEXTS = ['NONE', 'SAME_FIELD_UP', 'SWITCH_FIELD', 'SMALL_OR_STARTUP', 'PAY_UP_UNCLEAR', 'INTERNAL_MOVE', 'PARTNER_PROJECT'];
export function careerNewOpportunity(f, t, ctx = 'NONE') {
  const q = 'CAREER_NEW_OPPORTUNITY', g = bandGroup(f.strengthBand), theme = luckTheme(f);
  const basis = [{ term: luckTerm(f), plain: t(`CAREER_CURRENT_STATE.luck.${theme}`) }, dmLine(f, t), { term: familyTerm(f), plain: t(`${q}.fit.${f.dominantFamily}`) }];
  if (f.structure.reviewOpen) basis.push(structureLine(f, t));
  const advice = [t(`${q}.context.${NEW_OPPORTUNITY_CONTEXTS.includes(ctx) ? ctx : 'NONE'}`), t(`${q}.advice.${theme}`)];
  if (g === 'weak') advice.push(t('CAREER_JOB_CHANGE.advice.weak_buffer'));
  return answer(q, theme, t(`${q}.conclusion.${theme}`), basis, advice, t('CAREER_JOB_CHANGE.reminder'));
}

// ---- 升职 ----
export function careerPromotion(f, t) {
  const q = 'CAREER_PROMOTION', g = bandGroup(f.strengthBand);
  const L = luckWeights(f), has = fam => (L[fam] ?? 0) >= 0.8;
  const natalYin = famLevel(f, '印'), natalGuan = famLevel(f, '官杀'), natalCai = famLevel(f, '财');
  let v;
  if (has('官杀') && (has('印') || natalYin === 'strong')) v = 'FORMAL_UP';
  else if (has('官杀') && g === 'weak') v = 'HEAVY';
  else if (has('官杀') && (has('财') || natalCai === 'strong')) v = 'EARNED_UP';
  else if (has('官杀')) v = 'RESP_UP';
  else if (has('食伤') && ['present', 'strong'].includes(natalGuan)) v = 'FRICTION';
  else v = { 印: 'PREPARE', 财: 'RESULT_FIRST', 比劫: 'COMPETE', 食伤: 'SHOWCASE' }[topOf(L)] ?? 'PREPARE';
  const basis = [{ term: luckTerm(f), plain: t(`${q}.luck.${v}`) },
    { term: `原局官杀${LEVEL_ZH[natalGuan]}、印星${LEVEL_ZH[natalYin]}`, plain: t(`${q}.natal.${natalGuan === 'none' ? 'weak' : natalGuan}`) }, dmLine(f, t)];
  if (f.structure.reviewOpen) basis.push(structureLine(f, t));
  return answer(q, v, t(`${q}.conclusion.${v}`), basis, [t(`${q}.advice.${v}.1`), t(`${q}.advice.${v}.2`)], t('CAREER_CURRENT_STATE.reminder'));
}

// ---- 创业／独立发展 ----
export function careerEntrepreneurship(f, t) {
  const q = 'CAREER_ENTREPRENEURSHIP', g = bandGroup(f.strengthBand), theme = luckTheme(f);
  const ss = famLevel(f, '食伤'), cai = famLevel(f, '财'), ok = l => ['present', 'strong'].includes(l);
  let v;
  if (ok(ss) && ok(cai) && g !== 'weak') v = 'SKILL_TO_MONEY';
  else if (f.dominantFamily === '比劫') v = 'PARTNER_DRIVE';
  else if (f.dominantFamily === '财') v = g === 'weak' ? 'SIDE_FIRST' : 'TRADE';
  else if (f.dominantFamily === '官杀') v = 'ORG_FIT';
  else if (f.dominantFamily === '印') v = 'EXPERT_PATH';
  else v = 'CREATIVE';
  const basis = [dmLine(f, t), { term: `${familyTerm(f)}；食伤${LEVEL_ZH[ss]}、财星${LEVEL_ZH[cai]}`, plain: t(`${q}.natal.${v}`) }, { term: luckTerm(f), plain: t(`${q}.luck.${theme}`) }];
  if (f.structure.reviewOpen) basis.push(structureLine(f, t));
  return answer(q, `${v}/${theme}`, t(`${q}.conclusion.${v}`) + t(`${q}.timing.${theme}`), basis, [t(`${q}.advice.${v}.1`), t(`${q}.advice.${v}.2`), t(`${q}.timing_advice.${theme}`)], t('CAREER_CURRENT_STATE.reminder'));
}

// ---- 未来半年 / shared month picker ----
const CAREER_SCORE = { strong: { 官杀: 2, 财: 1.5, 食伤: 1, 印: 0, 比劫: -0.5 }, balanced: { 官杀: 1, 财: 1.5, 食伤: 1.2, 印: 0.8, 比劫: 0.3 }, weak: { 印: 2, 比劫: 1, 官杀: -1, 财: -0.5, 食伤: -0.5 } };
const HIT_W = { 冲: 3, 刑: 2, 自刑: 1.5, 害: 1.5 };
export function pickMonths(f, rows, scoreTable, extraCaution = () => 0, peaks = 1) {
  const g = bandGroup(f.strengthBand);
  const scored = rows.map((m, i) => {
    const s = (scoreTable[g][[...m.families][0]] ?? 0) + (m.families[1] ? (scoreTable[g][m.families[1]] ?? 0) : (scoreTable[g][m.families[0]] ?? 0) * 0.5);
    const hit = m.hits.filter(h => h.layer === 'branch' && ['month', 'day'].includes(h.target) && HIT_W[h.type]).sort((a, b) => HIT_W[b.type] - HIT_W[a.type])[0] ?? null;
    return { ...m, i, score: s, caution: (hit ? HIT_W[hit.type] : 0) + extraCaution(m, g), hit };
  });
  // Peaks: prefer months with no clash/punish/harm on month or day branch; then no clash/punish; then anything. Shown in date order.
  const clean = scored.filter(m => !m.hit), noHard = scored.filter(m => !(m.hit && ['冲', '刑', '自刑'].includes(m.hit.type)));
  const pool = clean.length >= peaks ? clean : noHard.length >= peaks ? noHard : scored;
  const peakList = [...pool].sort((a, b) => (b.score - b.caution * 0.5) - (a.score - a.caution * 0.5) || a.i - b.i).slice(0, peaks).sort((a, b) => a.i - b.i);
  const cautionRow = [...scored].filter(m => m.caution > 0 && !peakList.some(p => p.i === m.i)).sort((a, b) => b.caution - a.caution || a.i - b.i)[0] ?? null;
  return { peakList, cautionRow };
}
export const monthName = m => (m.from === '现在' ? `本月（${m.pillar}月）` : `${m.from}的${m.pillar}月`);
export const monthTerm = m => `${m.from === '现在' ? '本月' : m.from} ${m.pillar}月（${gods(m.stemGod, m.branchGod)}）${m.hit ? `，${m.hit.chars[0]}${m.hit.type}${POSITION_ZH[m.hit.target]}支${m.hit.chars[1]}` : ''}`;
export function careerNext6m(f, t) {
  const q = 'CAREER_NEXT_6M', g = bandGroup(f.strengthBand), theme = luckTheme(f);
  const { peakList: [peak], cautionRow } = pickMonths(f, f.months.slice(0, 6), CAREER_SCORE, (m, gg) => (gg === 'weak' && m.families.includes('官杀') ? 1 : 0));
  const pf = topOf(Object.fromEntries(peak.families.map((x, k) => [x, 2 - k])));
  const basis = [luckLine(f, t), { term: monthTerm(peak), plain: t(`${q}.month.${pf}`) }];
  if (cautionRow) basis.push({ term: monthTerm(cautionRow), plain: cautionRow.hit ? t(`${q}.caution.${cautionRow.hit.type === '自刑' ? '刑' : cautionRow.hit.type}.${cautionRow.hit.target}`) : t(`${q}.caution.pressure`) });
  basis.push(dmLine(f, t));
  if (f.structure.reviewOpen) basis.push(structureLine(f, t));
  const conclusion = t(`${q}.conclusion`, { theme: t(`${q}.theme.${theme}`), peak: monthName(peak) }) + (cautionRow ? t(`${q}.conclusion.caution`, { month: monthName(cautionRow) }) : t(`${q}.conclusion.nocaution`));
  const advice = [t(`${q}.advice.peak.${pf}`, { month: monthName(peak) }), cautionRow ? t(`${q}.advice.caution`, { month: monthName(cautionRow) }) : null, t(`${q}.advice.theme.${theme}`)];
  return answer(q, `${theme}/${cautionRow ? 'caution' : 'smooth'}/${g}`, conclusion, basis, advice, t('CAREER_CURRENT_STATE.reminder'));
}
