import { bandGroup, uniq, FAM_DISPLAY, dmLine, familyTerm, structureLine, luckTerm, luckWeights, palaceHits, dayBranchRelations, famLevel, LEVEL_ZH, answer, POSITION_ZH } from '../lib.mjs';

function dayBranchLine(f, t, keyPrefix) {
  const rel = dayBranchRelations(f), top = rel[0];
  if (!top) return { line: { term: `日支${f.pillars.day[1]}：无明显冲合刑害`, plain: t(`${keyPrefix}.day.none`) }, top: null };
  const type = top.type === '自刑' ? '刑' : top.type;
  const same = uniq(rel.filter(r => r.type === top.type).map(r => POSITION_ZH[r.a === 'day' ? r.b : r.a] + '支'));
  return { line: { term: `日支${f.pillars.day[1]}：与${same.join('、')}${top.type}`, plain: t(`${keyPrefix}.day.${type}`, { pos: same.join('、') }) }, top };
}
function spouseLine(f, t) {
  const fam = f.spouseStarFamily, lv = famLevel(f, fam);
  return { term: `${f.gender === 'MALE' ? '男命以财星' : '女命以官杀'}为伴侣星：${LEVEL_ZH[lv]}`, plain: t(`relationship.spouse.${f.gender === 'MALE' ? 'male' : 'female'}.${lv}`) };
}

// ---- 沟通方式 ----
export function relationshipCommunication(f, t) {
  const q = 'RELATIONSHIP_COMMUNICATION', fam = f.dominantFamily;
  const { line, top } = dayBranchLine(f, t, q);
  const basis = [dmLine(f, t), { term: familyTerm(f), plain: t(`${q}.family.${fam}`) }, line];
  const advice = [t(`${q}.advice.${fam}.1`), t(`${q}.advice.${fam}.2`)];
  if (top?.type === '冲') advice.push(t(`${q}.advice.day_clash`)); else if (top && ['刑', '自刑', '害'].includes(top.type)) advice.push(t(`${q}.advice.day_friction`));
  return answer(q, fam, t(`${q}.conclusion.${fam}`), basis, advice, t(`${q}.reminder`));
}

// ---- 界线与空间 ----
export function relationshipBoundaries(f, t) {
  const q = 'RELATIONSHIP_BOUNDARIES', W = f.familyWeights, g = bandGroup(f.strengthBand);
  const rel = dayBranchRelations(f), friction = rel.find(r => r.type === '冲'), minor = rel.find(r => ['刑', '自刑', '害'].includes(r.type));
  const space = W['比劫'] + W['食伤'], rules = W['官杀'] * 1.4, merge = W['印'] * 1.3 + (g === 'weak' ? W['财'] * 0.6 : 0);
  const bucket = space >= rules && space >= merge ? 'AUTONOMY' : rules >= merge ? 'CLEAR_ROLES' : 'OVER_GIVE';
  let v;
  if (friction) v = 'FRICTION_SPACE';
  else if (rel.some(r => r.type === '合') && Math.max(space, rules, merge) < 5) v = 'FLEX';
  else v = bucket;
  const { line } = dayBranchLine(f, t, q);
  const lv = fam => LEVEL_ZH[famLevel(f, fam)];
  const basis = [line, { term: `比劫${lv('比劫')}、食伤${lv('食伤')}、官杀${lv('官杀')}、印星${lv('印')}`, plain: t(`${q}.natal.${v === 'FRICTION_SPACE' || v === 'FLEX' ? bucket : v}`) }, spouseLine(f, t), dmLine(f, t)];
  if (f.structure.reviewOpen) basis.push(structureLine(f, t));
  return answer(q, v, t(`${q}.conclusion.${v}`), basis, [t(`${q}.advice.${v}.1`), t(`${q}.advice.${v}.2`), minor && v !== 'FRICTION_SPACE' ? t(`${q}.advice.minor_friction`) : null], t('relationship.reminder'));
}

// ---- 付出与照顾 ----
export function relationshipSupportCare(f, t) {
  const q = 'RELATIONSHIP_SUPPORT_CARE', W = f.familyWeights, g = bandGroup(f.strengthBand);
  const give = f.dominantFamily === '比劫' && W['比劫'] > Math.max(W['食伤'], W['财'], W['官杀']) * 1.3 ? '比劫'
    : [['食伤', W['食伤']], ['财', W['财']], ['官杀', W['官杀']]].sort((a, b) => b[1] - a[1])[0][0];
  const receive = ['present', 'strong'].includes(famLevel(f, '印')) ? 'open' : 'closed';
  const basis = [{ term: `食伤${LEVEL_ZH[famLevel(f, '食伤')]}、财星${LEVEL_ZH[famLevel(f, '财')]}、官杀${LEVEL_ZH[famLevel(f, '官杀')]}${give === '比劫' ? '、比劫' + LEVEL_ZH[famLevel(f, '比劫')] : ''}`, plain: t(`${q}.give_basis.${give}`) },
    { term: `印星${LEVEL_ZH[famLevel(f, '印')]}`, plain: t(`${q}.receive_basis.${receive}`) }, dmLine(f, t)];
  const advice = [t(`${q}.advice.give.${give}`), t(`${q}.advice.receive.${receive}`)];
  if (g === 'weak') advice.push(t(`${q}.advice.weak`));
  return answer(q, `${give}/${receive}`, t(`${q}.conclusion.give.${give}`) + t(`${q}.conclusion.receive.${receive}`), basis, advice, t('relationship.reminder'));
}

// ---- 最近的关系议题 ----
export function relationshipCurrentAttention(f, t) {
  const q = 'RELATIONSHIP_CURRENT_ATTENTION', L = luckWeights(f), has = fam => (L[fam] ?? 0) >= 0.8;
  const dayHits = palaceHits(f, 'day', ['冲', '刑', '害', '合']);
  const shake = dayHits.find(h => ['冲', '刑'].includes(h.type)), bond = dayHits.find(h => h.type === '合');
  const spouse = f.spouseStarFamily;
  let v;
  if (shake) v = 'DAY_SHAKE';
  else if (has(spouse) && bond) v = 'BOND_UP';
  else if (has(spouse)) v = 'RELATION_TOPIC';
  else {
    const order = ['比劫', '食伤', '印', '官杀', '财'].filter(x => x !== spouse);
    const best = order.map(x => [x, L[x] ?? 0]).sort((a, b) => b[1] - a[1])[0][0];
    v = { 比劫: 'SOCIAL_SPLIT', 食伤: 'EXPRESS', 印: 'FAMILY', 官杀: 'PRESSURE_SPILL', 财: 'BUSY' }[best];
  }
  const basis = [{ term: luckTerm(f), plain: t(`${q}.luck.${v}`) }];
  const h = shake ?? bond ?? dayHits[0];
  if (h) basis.push({ term: `${h.who}${h.chars[0]}${h.type}日支${h.chars[1]}`, plain: t(`${q}.dayhit.${h.type}`, { who: h.who }) });
  basis.push(spouseLine(f, t), dmLine(f, t));
  return answer(q, v, t(`${q}.conclusion.${v}`), basis, [t(`${q}.advice.${v}.1`), t(`${q}.advice.${v}.2`)], t('relationship.reminder'));
}
