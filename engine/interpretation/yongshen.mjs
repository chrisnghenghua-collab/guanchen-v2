// GUANCHEN P7-2 (2026-10-23) - 五行旺衰 and 喜用神. Method approved by Chris: 扶抑为主、调候为辅.
// Pure rules over the verified chart facts (strength band, dominant ten-god family, element weights, month branch).
// Near-balanced and strongly one-sided charts are flagged as uncertain instead of being given a confident answer.
const EL = '木火土金水';
const at = (e, k) => EL[(EL.indexOf(e) + k) % 5];
const BRANCH_EL = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
const LV = { LOW: 0, MODERATE: 1, HIGH: 2 };
const FAM_NAME = { 比劫: '比劫', 食伤: '食伤', 财: '财星', 官杀: '官杀', 印: '印星' };

export function wangShuai(monthBranch) {
  const m = BRANCH_EL[monthBranch];
  return { 旺: m, 相: at(m, 1), 休: at(m, 4), 囚: at(m, 3), 死: at(m, 2) };
}
const familyElement = (dm, fam) => ({ 比劫: dm, 食伤: at(dm, 1), 财: at(dm, 2), 官杀: at(dm, 3), 印: at(dm, 4) })[fam];

export function yongShen(f, t) {
  const dm = f.dayMaster.element, band = f.strengthBand, dom = f.dominantFamily, w = f.familyWeights;
  // lean for near-balanced charts
  let group = ['VERY_STRONG', 'STRONG', 'BALANCED_STRONG'].includes(band) ? 'strong' : ['VERY_WEAK', 'WEAK', 'BALANCED_WEAK'].includes(band) ? 'weak'
    : (LV[f.supportLevel] ?? 1) >= (LV[f.opposingLevel] ?? 1) ? 'strong' : 'weak';
  // flagged as uncertain only when 中和 is a true tie (support = opposing) or the chart is strongly one-sided
  const balanced = band === 'BALANCED' && (LV[f.supportLevel] ?? 1) === (LV[f.opposingLevel] ?? 1), extreme = band.startsWith('VERY_');
  let yong, xi, ji, key;
  if (group === 'strong') {
    if (dom === '印') { yong = '财'; xi = ['食伤']; ji = ['印', '比劫']; key = 'strong_印'; }
    else if (dom === '比劫') { yong = w['官杀'] > 0 ? '官杀' : '食伤'; xi = [yong === '官杀' ? '食伤' : '财']; ji = ['比劫', '印']; key = `strong_比劫_${yong}`; }
    else { yong = '食伤'; xi = ['财']; ji = ['印', '比劫']; key = 'strong_other'; }
  } else {
    if (dom === '官杀') { yong = '印'; xi = ['比劫']; ji = ['财', '官杀']; key = 'weak_官杀'; }
    else if (dom === '食伤') { yong = '印'; xi = ['比劫']; ji = ['食伤', '财']; key = 'weak_食伤'; }
    else if (dom === '财') { yong = '比劫'; xi = ['印']; ji = ['财', '食伤']; key = 'weak_财'; }
    else { yong = '印'; xi = ['比劫']; ji = ['官杀', '财']; key = 'weak_other'; }
  }
  const pack = fam => ({ element: familyElement(dm, fam), family: FAM_NAME[fam] });
  const out = { method: '扶抑为主，调候为辅', wangShuai: wangShuai(f.monthBranch), yong: pack(yong), xi: xi.map(pack), ji: ji.map(pack), uncertain: balanced || extreme, notes: [] };
  const show = p => `${p.element}（${p.family}）`;
  out.notes.push(t(`ys.reason.${key}`, { yong: show(out.yong), xi: out.xi.map(show).join('、') }));
  if ((f.elementWeights[out.yong.element] ?? 0) === 0) out.notes.push(t('ys.absent', { el: out.yong.element }));
  // 调候
  const season = '亥子丑'.includes(f.monthBranch) ? 'winter' : '巳午未'.includes(f.monthBranch) ? 'summer' : null;
  if (season) {
    const need = season === 'winter' ? '火' : '水';
    const rel = out.yong.element === need || out.xi.some(x => x.element === need) ? 'agree' : out.ji.some(x => x.element === need) ? 'conflict' : 'added';
    out.tiaohou = { need, relation: rel };
    out.notes.push(t(`ys.th.${season}`) + t(`ys.th.${rel}`, { el: need }));
  }
  if (extreme) out.notes.push(t('ys.extreme'));
  else if (balanced) out.notes.push(t('ys.balanced', { lean: t(`ys.lean.${group}`) }));
  return out;
}
