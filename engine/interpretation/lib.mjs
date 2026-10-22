// Shared helpers for v2 question generators.
import { FAMILY_OF, POSITION_ZH } from './facts.mjs';
export const bandGroup = b => (['VERY_STRONG', 'STRONG', 'BALANCED_STRONG'].includes(b) ? 'strong' : ['VERY_WEAK', 'WEAK', 'BALANCED_WEAK'].includes(b) ? 'weak' : 'balanced');
export const uniq = xs => [...new Set(xs.filter(Boolean))];
export const FAM_DISPLAY = { 比劫: '比劫', 食伤: '食伤', 财: '财星', 官杀: '官杀', 印: '印星' };
const SEASON_NOTE = { 旺: '旺，当令', 相: '相，得生', 休: '休，不当令', 囚: '囚，不当令', 死: '死，不当令' };
export const label = s => (s && !s.endsWith('格') ? s + '格' : s);
export const gods = (a, b) => (a === b ? a : `${a}、${b}`);
export const LEVEL_ZH = { none: '几乎没有', weak: '偏弱', present: '适中', strong: '明显' };
export const level = w => (w === 0 ? 'none' : w < 1.5 ? 'weak' : w < 3 ? 'present' : 'strong');
export const famLevel = (f, fam) => level(f.familyWeights[fam]);
export { POSITION_ZH };

export function dmLine(f, t) {
  return { term: `${f.dayMaster.stem}${f.dayMaster.element}日主，生于${f.monthBranch}月（${SEASON_NOTE[f.season] ?? f.season}），${f.strengthZh}`,
    plain: t(`dm.image.${f.dayMaster.stem}`) + t(`dm.band.${bandGroup(f.strengthBand)}`) };
}
export function familyTerm(f) {
  const list = Object.entries(f.tenGodWeights).filter(([g, w]) => FAMILY_OF[g] === f.dominantFamily && w >= 0.5).sort((a, b) => b[1] - a[1]).map(([g]) => g);
  return `十神以${FAM_DISPLAY[f.dominantFamily]}最多（${list.join('、')}），其次是${FAM_DISPLAY[f.secondFamily]}`;
}
export function structureLine(f, t) { return { term: `格局：${label(f.structure.label)}（${f.structure.stageZh}）`, plain: t(`stage.${f.structure.stage}`) }; }
export function luckTerm(f) {
  const a = f.annual; const ann = `今年流年${a.pillar}（${gods(a.stemGod, a.branchGod)}）`;
  return f.dayun ? `目前走${f.dayun.pillar}大运（${gods(f.dayun.stemGod, f.dayun.branchGod)}），${ann}` : `尚未起大运，${ann}`;
}
export function luckLine(f, t) {
  const meaning = fams => uniq(fams).map(x => t(`family.meaning.${x}`)).join('；');
  return { term: luckTerm(f), plain: f.dayun ? t('luck.plain', { dayunMeaning: meaning(f.dayun.families), annualMeaning: meaning(f.annual.families) }) : t('luck.plain.preluck', { annualMeaning: meaning(f.annual.families) }) };
}
export const familyMeaning = (t, fams) => uniq(fams).map(x => t(`family.meaning.${x}`)).join('；');
/** Weighted luck family weights. Default: dayun branch 1.2 > dayun stem 1.0 > annual branch 1.0 > annual stem 0.8. */
export function luckWeights(f, w = { ds: 1.0, db: 1.2, as: 0.8, ab: 1.0 }) {
  const out = {}; const add = (g, x) => { const fam = FAMILY_OF[g]; out[fam] = (out[fam] ?? 0) + x; };
  if (f.dayun) { add(f.dayun.stemGod, w.ds); add(f.dayun.branchGod, w.db); }
  add(f.annual.stemGod, w.as); add(f.annual.branchGod, w.ab);
  return out;
}
export const topOf = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0][0];
export const luckTheme = (f, w) => topOf(luckWeights(f, w));
export const inLuck = (f, fam, min = 0.8) => (luckWeights(f)[fam] ?? 0) >= min;
/** Luck hits on a natal palace (branch relations), ordered by severity. */
export function palaceHits(f, palace, types = ['冲', '刑', '害', '合']) {
  const hits = [...(f.dayun?.hits ?? []).map(h => ({ ...h, who: '大运' })), ...f.annual.hits.map(h => ({ ...h, who: '流年' }))]
    .filter(h => h.target === palace && h.layer === 'branch' && types.includes(h.type));
  return hits.sort((a, b) => types.indexOf(a.type) - types.indexOf(b.type));
}
/** Natal relations touching the day branch, ordered by severity. */
export function dayBranchRelations(f) {
  const order = ['冲', '刑', '自刑', '害', '合'];
  return f.natalRelations.filter(r => r.layer === 'branch' && (r.a === 'day' || r.b === 'day') && order.includes(r.type)).sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
}
export const answer = (questionId, variant, conclusion, basis, advice, reminder) => ({ questionId, variant, conclusion, basis: basis.filter(Boolean).slice(0, 5), advice: uniq(advice).slice(0, 3), reminder });
