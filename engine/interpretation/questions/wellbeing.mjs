// Wellbeing: life rhythm and load only. No medical, diagnostic or symptom claims.
import { bandGroup, dmLine, luckTerm, luckWeights, topOf, palaceHits, famLevel, LEVEL_ZH, level, answer } from '../lib.mjs';
const EL = '木火土金水';
const produces = e => EL[(EL.indexOf(e) + 1) % 5], producedBy = e => EL[(EL.indexOf(e) + 4) % 5];
const elementTerm = f => { const ranked = Object.entries(f.elementWeights).sort((a, b) => b[1] - a[1]); return { top: ranked[0][0], low: ranked.at(-1)[0], term: `五行以${ranked[0][0]}最旺，${ranked.at(-1)[0]}最少` }; };

export function wellbeingDailyRhythm(f, t) {
  const q = 'WELLBEING_DAILY_RHYTHM', g = bandGroup(f.strengthBand), e = elementTerm(f);
  const basis = [{ term: e.term, plain: t(`${q}.top.${e.top}`) }, { term: `${e.low}偏少`, plain: t(`${q}.low.${e.low}`) }, dmLine(f, t)];
  return answer(q, `${e.top}/${g}`, t(`${q}.conclusion.${e.top}`) + t(`${q}.band.${g}`), basis, [t(`${q}.advice.${e.top}.1`), t(`${q}.advice.${e.top}.2`), t(`${q}.advice.band.${g}`)], t('wellbeing.reminder'));
}

export function wellbeingLoadPattern(f, t) {
  const q = 'WELLBEING_LOAD_PATTERN', g = bandGroup(f.strengthBand), W = f.familyWeights;
  const drains = [['OUTPUT', '食伤', W['食伤']], ['TASKS', '财', W['财']], ['PRESSURE', '官杀', W['官杀']]].sort((a, b) => b[2] - a[2]);
  const self = W['比劫'] + W['印'], other = W['食伤'] + W['财'] + W['官杀'];
  const v = g === 'strong' && self > other ? 'STAGNANT' : drains[0][0];
  const fam = v === 'STAGNANT' ? (W['比劫'] >= W['印'] ? '比劫' : '印') : drains[0][1];
  const basis = [{ term: v === 'STAGNANT' ? `比劫与印星合计多于食伤、财星、官杀` : `泄、耗、克之中以${{ 食伤: '食伤（泄）', 财: '财星（耗）', 官杀: '官杀（克）' }[fam]}最重：${LEVEL_ZH[famLevel(f, fam)]}`, plain: t(`${q}.natal.${v}`) }, dmLine(f, t)];
  const advice = [t(`${q}.advice.${v}.1`), t(`${q}.advice.${v}.2`)];
  if (g === 'weak') advice.push(t(`${q}.advice.weak`));
  return answer(q, v, t(`${q}.conclusion.${v}`) + (g === 'weak' && v !== 'STAGNANT' ? t(`${q}.weak_note`) : ''), basis, advice, t('wellbeing.reminder'));
}

export function wellbeingRecoveryOrientation(f, t) {
  const q = 'WELLBEING_RECOVERY_ORIENTATION', g = bandGroup(f.strengthBand), dm = f.dayMaster.element;
  const order = { LOW: 0, MODERATE: 1, HIGH: 2 };
  const mode = g === 'weak' ? 'SUPPORT' : g === 'strong' ? 'RELEASE' : ((order[f.supportLevel] ?? 1) < (order[f.opposingLevel] ?? 1) ? 'SUPPORT' : 'RELEASE');
  const el = mode === 'SUPPORT' ? producedBy(dm) : produces(dm);
  const elLevel = LEVEL_ZH[level(f.elementWeights[el])];
  const basis = [dmLine(f, t), { term: `${mode === 'SUPPORT' ? '以生扶日主的' : '以日主所生的'}${el}为调节方向（${mode === 'SUPPORT' ? '印星' : '食伤'}之五行）`, plain: t(`${q}.mode.${mode}`, { el }) }, { term: `${el}在原局中的份量：${elLevel}`, plain: t(`${q}.element.${mode}.${el}`) }];
  return answer(q, `${mode}/${el}`, t(`${q}.conclusion.${mode}`) + t(`${q}.activity.${mode}.${el}`), basis, [t(`${q}.advice.${mode}.${el}.1`), t(`${q}.advice.${mode}.${el}.2`), t(`${q}.advice.mode.${mode}`)], t('wellbeing.reminder'));
}

export function wellbeingCurrentAttention(f, t) {
  const q = 'WELLBEING_CURRENT_ATTENTION', g = bandGroup(f.strengthBand);
  const theme = topOf(luckWeights(f, { ds: 0.8, db: 0.8, as: 1.2, ab: 1.2 }));
  const hit = palaceHits(f, 'day', ['冲', '刑'])[0];
  const basis = [{ term: luckTerm(f), plain: t(`${q}.luck.${theme}`) }];
  if (hit) basis.push({ term: `${hit.who}${hit.chars[0]}${hit.type}日支${hit.chars[1]}`, plain: t(`${q}.dayhit`, { who: hit.who }) });
  basis.push(dmLine(f, t));
  const note = g === 'weak' && ['官杀', '财', '食伤'].includes(theme) ? t(`${q}.note.weak`) : g === 'strong' && ['比劫', '印'].includes(theme) ? t(`${q}.note.strong`) : '';
  return answer(q, `${theme}/${hit ? 'shake' : 'steady'}`, t(`${q}.conclusion.${theme}`) + (hit ? t(`${q}.conclusion.shake`) : '') + note, basis, [t(`${q}.advice.${theme}.1`), t(`${q}.advice.${theme}.2`), hit ? t(`${q}.advice.shake`) : null], t('wellbeing.reminder'));
}
