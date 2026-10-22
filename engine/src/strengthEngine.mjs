import { resolveRelationTransformations } from './relationTransformationEngine.mjs';
export const VERSION = 'GUANCHENG_INTERPRETATION_STRENGTH_PROTO_V4_D7_R1';

const STEM_ELEMENT = {
  甲: 'WOOD', 乙: 'WOOD', 丙: 'FIRE', 丁: 'FIRE', 戊: 'EARTH',
  己: 'EARTH', 庚: 'METAL', 辛: 'METAL', 壬: 'WATER', 癸: 'WATER'
};

const BRANCH_HIDDEN = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '戊', '庚'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲']
};

const BRANCH_MAIN_ELEMENT = Object.fromEntries(
  Object.entries(BRANCH_HIDDEN).map(([b, hs]) => [b, STEM_ELEMENT[hs[0]]])
);

const GENERATES = { WOOD: 'FIRE', FIRE: 'EARTH', EARTH: 'METAL', METAL: 'WATER', WATER: 'WOOD' };
const CONTROLS = { WOOD: 'EARTH', FIRE: 'METAL', EARTH: 'WATER', METAL: 'WOOD', WATER: 'FIRE' };
const GENERATED_BY = Object.fromEntries(Object.entries(GENERATES).map(([a,b]) => [b,a]));
const CONTROLLED_BY = Object.fromEntries(Object.entries(CONTROLS).map(([a,b]) => [b,a]));

const LEVEL = { LOW: 0, MODERATE: 1, HIGH: 2 };
const BAND_ORDER = {
  VERY_WEAK: 0,
  WEAK: 1,
  BALANCED_WEAK: 2,
  BALANCED: 3,
  BALANCED_STRONG: 4,
  STRONG: 5,
  VERY_STRONG: 6
};

const BRANCH_CLASHES = [
  ['子','午'], ['丑','未'], ['寅','申'], ['卯','酉'], ['辰','戌'], ['巳','亥']
];

const BRANCH_COMBINATIONS = [
  ['子','丑'], ['寅','亥'], ['卯','戌'], ['辰','酉'], ['巳','申'], ['午','未']
];

const BRANCH_HARMS = [
  ['子','未'], ['丑','午'], ['寅','巳'], ['卯','辰'], ['申','亥'], ['酉','戌']
];

const BRANCH_BREAKS = [
  ['子','酉'], ['丑','辰'], ['寅','亥'], ['卯','午'], ['巳','申'], ['未','戌']
];

const MUTUAL_PUNISHMENTS = [
  ['子','卯']
];

const THREE_PUNISHMENT_GROUPS = [
  ['寅','巳','申'], ['丑','戌','未']
];

const SELF_PUNISHMENTS = new Set(['辰','午','酉','亥']);

const THREE_HARMONIES = [
  { branches: ['申','子','辰'], element: 'WATER' },
  { branches: ['亥','卯','未'], element: 'WOOD' },
  { branches: ['寅','午','戌'], element: 'FIRE' },
  { branches: ['巳','酉','丑'], element: 'METAL' }
];

const THREE_MEETINGS = [
  { branches: ['亥','子','丑'], element: 'WATER' },
  { branches: ['寅','卯','辰'], element: 'WOOD' },
  { branches: ['巳','午','未'], element: 'FIRE' },
  { branches: ['申','酉','戌'], element: 'METAL' }
];

const STEM_COMBINATIONS = [
  { stems: ['甲','己'], candidateElement: 'EARTH' },
  { stems: ['乙','庚'], candidateElement: 'METAL' },
  { stems: ['丙','辛'], candidateElement: 'WATER' },
  { stems: ['丁','壬'], candidateElement: 'WOOD' },
  { stems: ['戊','癸'], candidateElement: 'FIRE' }
];

// Complete month-branch climate profile. This is an environmental descriptor,
// NOT a full day-master-specific 调候 rule table.
const MONTH_CLIMATE = {
  寅: { season:'EARLY_SPRING', temperature:'COOL', moisture:'MODERATE', hardNeed:[], conditionalNeed:['FIRE'] },
  卯: { season:'MID_SPRING', temperature:'MILD', moisture:'MODERATE', hardNeed:[], conditionalNeed:[] },
  辰: { season:'LATE_SPRING', temperature:'MILD', moisture:'DAMP', hardNeed:[], conditionalNeed:[] },
  巳: { season:'EARLY_SUMMER', temperature:'HOT', moisture:'DRYING', hardNeed:['WATER'], conditionalNeed:[] },
  午: { season:'MID_SUMMER', temperature:'VERY_HOT', moisture:'DRY', hardNeed:['WATER'], conditionalNeed:[] },
  未: { season:'LATE_SUMMER', temperature:'HOT', moisture:'DRY', hardNeed:[], conditionalNeed:['WATER'] },
  申: { season:'EARLY_AUTUMN', temperature:'WARM', moisture:'DRY', hardNeed:[], conditionalNeed:['WATER'] },
  酉: { season:'MID_AUTUMN', temperature:'MILD', moisture:'DRY', hardNeed:[], conditionalNeed:['WATER'] },
  戌: { season:'LATE_AUTUMN', temperature:'COOL', moisture:'DRY', hardNeed:[], conditionalNeed:['WATER','FIRE'] },
  亥: { season:'EARLY_WINTER', temperature:'COLD', moisture:'WET', hardNeed:['FIRE'], conditionalNeed:[] },
  子: { season:'MID_WINTER', temperature:'VERY_COLD', moisture:'WET', hardNeed:['FIRE'], conditionalNeed:[] },
  丑: { season:'LATE_WINTER', temperature:'COLD', moisture:'DAMP', hardNeed:[], conditionalNeed:['FIRE'] }
};

function parsePillar(pillar) {
  if (!pillar || pillar.length < 2) throw new Error(`Invalid pillar: ${pillar}`);
  return { stem: pillar[0], branch: pillar[1] };
}

function seasonState(dayElement, monthBranch) {
  const dominant = BRANCH_MAIN_ELEMENT[monthBranch];
  if (!dominant) throw new Error(`Unknown month branch: ${monthBranch}`);
  if (dayElement === dominant) return 'WANG';
  if (dayElement === GENERATES[dominant]) return 'XIANG';
  if (dayElement === GENERATED_BY[dominant]) return 'XIU';
  if (dayElement === CONTROLLED_BY[dominant]) return 'QIU';
  if (dayElement === CONTROLS[dominant]) return 'SI';
  throw new Error('Unreachable season relation');
}

function relationToDay(dayElement, otherElement) {
  if (otherElement === dayElement) return 'PEER';
  if (GENERATES[otherElement] === dayElement) return 'RESOURCE';
  if (GENERATES[dayElement] === otherElement) return 'OUTPUT';
  if (CONTROLS[dayElement] === otherElement) return 'WEALTH';
  if (CONTROLS[otherElement] === dayElement) return 'OFFICER';
  throw new Error(`Unknown relation ${dayElement} vs ${otherElement}`);
}

function rootRank(index) {
  return index === 0 ? 'PRIMARY_ROOT' : index === 1 ? 'SECONDARY_ROOT' : 'RESIDUAL_ROOT';
}

function rootLevel(roots) {
  const effective = roots.filter(r => r.rank !== 'RESIDUAL_ROOT');
  const strongPosition = effective.some(r => ['MONTH_BRANCH','DAY_BRANCH'].includes(r.position));
  if (effective.length >= 2 || (effective.length >= 1 && strongPosition && roots.length >= 2)) return 'HIGH';
  if (effective.length >= 1) return 'MODERATE';
  return 'LOW';
}

function downgradeLevel(level) {
  if (level === 'HIGH') return 'MODERATE';
  if (level === 'MODERATE') return 'LOW';
  return 'LOW';
}

function pairKey(a,b) {
  return [a,b].sort().join('');
}

function detectRelations(pillars) {
  const branchItems = [
    { position:'YEAR_BRANCH', branch:pillars.year.branch },
    { position:'MONTH_BRANCH', branch:pillars.month.branch },
    { position:'DAY_BRANCH', branch:pillars.day.branch },
    { position:'HOUR_BRANCH', branch:pillars.hour.branch }
  ];
  const stemItems = [
    { position:'YEAR_STEM', stem:pillars.year.stem },
    { position:'MONTH_STEM', stem:pillars.month.stem },
    { position:'DAY_STEM', stem:pillars.day.stem },
    { position:'HOUR_STEM', stem:pillars.hour.stem }
  ];

  const clashSet = new Set(BRANCH_CLASHES.map(([a,b]) => pairKey(a,b)));
  const comboSet = new Set(BRANCH_COMBINATIONS.map(([a,b]) => pairKey(a,b)));
  const harmSet = new Set(BRANCH_HARMS.map(([a,b]) => pairKey(a,b)));
  const breakSet = new Set(BRANCH_BREAKS.map(([a,b]) => pairKey(a,b)));
  const mutualPunishmentSet = new Set(MUTUAL_PUNISHMENTS.map(([a,b]) => pairKey(a,b)));
  const punishmentTriadPairSet = new Set(
    THREE_PUNISHMENT_GROUPS.flatMap(g => [
      pairKey(g[0],g[1]), pairKey(g[0],g[2]), pairKey(g[1],g[2])
    ])
  );
  const branchFacts = [];

  for (let i = 0; i < branchItems.length; i++) {
    for (let j = i + 1; j < branchItems.length; j++) {
      const a = branchItems[i], b = branchItems[j];
      const key = pairKey(a.branch, b.branch);
      if (clashSet.has(key)) {
        branchFacts.push({ type:'CLASH', a, b, transformation:'NOT_EVALUATED' });
      }
      if (comboSet.has(key)) {
        branchFacts.push({ type:'COMBINATION', a, b, transformation:'NOT_EVALUATED' });
      }
      if (harmSet.has(key)) {
        branchFacts.push({ type:'HARM', a, b, transformation:'NOT_APPLICABLE' });
      }
      if (breakSet.has(key)) {
        branchFacts.push({ type:'BREAK', a, b, transformation:'NOT_APPLICABLE' });
      }
      if (mutualPunishmentSet.has(key)) {
        branchFacts.push({ type:'PUNISHMENT', subtype:'MUTUAL', a, b, transformation:'NOT_APPLICABLE' });
      }
      if (a.branch === b.branch && SELF_PUNISHMENTS.has(a.branch)) {
        branchFacts.push({ type:'PUNISHMENT', subtype:'SELF', a, b, transformation:'NOT_APPLICABLE' });
      }
      if (punishmentTriadPairSet.has(key)) {
        branchFacts.push({ type:'PUNISHMENT_CANDIDATE', subtype:'THREE_GROUP_PARTIAL', a, b, transformation:'NOT_APPLICABLE' });
      }
    }
  }

  const presentBranches = new Set(branchItems.map(x => x.branch));
  const assemblies = [];
  for (const item of THREE_HARMONIES) {
    if (item.branches.every(b => presentBranches.has(b))) {
      assemblies.push({ type:'THREE_HARMONY', branches:item.branches, candidateElement:item.element, transformation:'NOT_EVALUATED' });
    }
  }
  for (const item of THREE_MEETINGS) {
    if (item.branches.every(b => presentBranches.has(b))) {
      assemblies.push({ type:'THREE_MEETING', branches:item.branches, candidateElement:item.element, transformation:'NOT_EVALUATED' });
    }
  }

  const stemFacts = [];
  for (let i = 0; i < stemItems.length; i++) {
    for (let j = i + 1; j < stemItems.length; j++) {
      const a = stemItems[i], b = stemItems[j];
      const rule = STEM_COMBINATIONS.find(r => pairKey(...r.stems) === pairKey(a.stem, b.stem));
      if (rule) {
        stemFacts.push({ type:'STEM_COMBINATION', a, b, candidateElement:rule.candidateElement, transformation:'NOT_EVALUATED' });
      }
    }
  }

  return { branchFacts, assemblies, stemFacts };
}

function annotateRootRelations(roots, relations, relationResolution) {
  return roots.map(root => {
    const flags = [];
    for (const fact of relations.branchFacts) {
      if (fact.a.position === root.position || fact.b.position === root.position) {
        if (fact.type === 'CLASH') flags.push('UNDER_CLASH');
        if (fact.type === 'COMBINATION') flags.push('IN_COMBINATION');
        if (fact.type === 'PUNISHMENT') flags.push('IN_PUNISHMENT');
        if (fact.type === 'PUNISHMENT_CANDIDATE') flags.push('IN_PUNISHMENT_REVIEW');
        if (fact.type === 'HARM') flags.push('IN_HARM');
        if (fact.type === 'BREAK') flags.push('IN_BREAK');
      }
    }
    for (const clash of relationResolution.clashes) {
      if (clash.a.position === root.position || clash.b.position === root.position) {
        if (clash.status === 'ACTIVE') flags.push('UNDER_ACTIVE_CLASH');
        if (clash.status === 'MEDIATED_CONFIRMED') flags.push('UNDER_MEDIATED_CLASH');
        if (['MULTI_RELATION_REVIEW','MEDIATION_REVIEW'].includes(clash.status)) flags.push('UNDER_CLASH_REVIEW');
      }
    }
    for (const punishment of relationResolution.punishments ?? []) {
      const memberPositions = punishment.memberPositions ?? [punishment.a?.position, punishment.b?.position].filter(Boolean);
      if (memberPositions.includes(root.position)) {
        if (punishment.status === 'ACTIVE' || punishment.status === 'ACTIVE_COMPLETE') flags.push('UNDER_ACTIVE_PUNISHMENT');
        if (punishment.status === 'MEDIATED_CONFIRMED') flags.push('UNDER_MEDIATED_PUNISHMENT');
        if (String(punishment.status).includes('REVIEW')) flags.push('UNDER_PUNISHMENT_REVIEW');
      }
    }
    for (const harm of relationResolution.harms ?? []) {
      if (harm.a.position === root.position || harm.b.position === root.position) flags.push('UNDER_HARM_MODIFIER');
    }
    for (const brk of relationResolution.breaks ?? []) {
      if (brk.a.position === root.position || brk.b.position === root.position) flags.push('UNDER_BREAK_MODIFIER');
    }
    const positionState = (relationResolution.positionStates ?? []).find(x => x.position === root.position);
    if (positionState?.state === 'MULTI_RELATION_REVIEW') flags.push('MULTI_RELATION_REVIEW');
    for (const fact of relations.assemblies) {
      if (fact.branches.includes(root.branch)) flags.push(fact.type === 'THREE_HARMONY' ? 'IN_THREE_HARMONY' : 'IN_THREE_MEETING');
    }
    return { ...root, relationFlags:[...new Set(flags)] };
  });
}

function effectiveRootLevel(annotatedRoots) {
  const raw = rootLevel(annotatedRoots);
  const effective = annotatedRoots.filter(r => r.rank !== 'RESIDUAL_ROOT');
  if (!effective.length) return { raw, effective:raw, reason:'NO_EFFECTIVE_ROOT' };

  const activeClash = r => r.relationFlags.includes('UNDER_ACTIVE_CLASH') || r.relationFlags.includes('UNDER_CLASH_REVIEW');
  const intact = effective.filter(r => !activeClash(r));
  const soleEffectiveRootUnderActiveClash = effective.length === 1 && activeClash(effective[0]);

  // D7: a clash that is confirmed as mediated no longer downgrades the sole root.
  // Active or unresolved-review clashes remain conservative and can lower one step.
  if (soleEffectiveRootUnderActiveClash) {
    return { raw, effective:downgradeLevel(raw), reason:'SOLE_EFFECTIVE_ROOT_UNDER_CLASH' };
  }
  if (effective.length === 1 && effective[0].relationFlags.includes('UNDER_MEDIATED_CLASH')) {
    return { raw, effective:raw, reason:'SOLE_EFFECTIVE_ROOT_CLASH_MEDIATED' };
  }
  return { raw, effective:raw, reason:intact.length ? 'INTACT_ROOT_REMAINS' : 'MULTIPLE_ROOTS_UNDER_RELATION' };
}

function allyLevel(allies) {
  const visible = allies.filter(a => a.kind === 'VISIBLE_STEM').length;
  const mainQiHidden = allies.filter(a => a.kind === 'HIDDEN_STEM' && a.hiddenIndex === 0).length;
  if (visible >= 2) return 'HIGH';
  if (visible === 1 || mainQiHidden >= 1) return 'MODERATE';
  return 'LOW';
}

function seasonTierForElement(element, monthBranch) {
  return seasonState(element, monthBranch);
}

function opposingLevel(opposing, monthBranch) {
  const strongSignals = opposing.filter(o => {
    const tier = seasonTierForElement(o.element, monthBranch);
    const positionStrong = o.kind === 'VISIBLE_STEM' || o.hiddenIndex === 0;
    return positionStrong && !['QIU', 'SI'].includes(tier);
  });
  const visible = opposing.filter(o => o.kind === 'VISIBLE_STEM');
  const categories = new Set(opposing.map(o => o.relation));

  if (strongSignals.length >= 3 || (strongSignals.length >= 2 && categories.size >= 2)) return 'HIGH';
  if (strongSignals.length >= 1 || visible.length >= 2 || categories.size >= 2) return 'MODERATE';
  return opposing.length ? 'MODERATE' : 'LOW';
}

function resolveBand({ season, root, ally, opposition, effectiveCounterforce }) {
  const supportiveSeason = ['WANG', 'XIANG'].includes(season);
  const adverseSeason = ['QIU', 'SI'].includes(season);

  if (supportiveSeason && LEVEL[root] === 2 && LEVEL[ally] === 2 && !effectiveCounterforce) {
    return 'VERY_STRONG';
  }

  if (adverseSeason && LEVEL[root] === 0 && LEVEL[ally] === 0 && LEVEL[opposition] === 2) {
    return 'VERY_WEAK';
  }

  if (supportiveSeason && LEVEL[root] >= 1 && LEVEL[ally] >= 1) {
    return LEVEL[opposition] === 2 ? 'BALANCED_STRONG' : 'STRONG';
  }

  if (adverseSeason && LEVEL[root] === 0 && LEVEL[ally] <= 1) {
    return LEVEL[opposition] >= 1 ? 'WEAK' : 'BALANCED_WEAK';
  }

  if (LEVEL[root] === 2 && LEVEL[ally] >= 1 && LEVEL[opposition] <= 1) return 'BALANCED_STRONG';
  if (LEVEL[root] === 0 && LEVEL[ally] === 0 && LEVEL[opposition] >= 1) return 'BALANCED_WEAK';

  return 'BALANCED';
}

function climateProfile(monthBranch) {
  const profile = MONTH_CLIMATE[monthBranch];
  if (!profile) throw new Error(`Unknown month branch for climate: ${monthBranch}`);
  return { monthBranch, ...profile };
}

function favorableAssessment(dayElement, band, monthBranch) {
  const climate = climateProfile(monthBranch);
  let balance = [];
  let excessRisk = [];

  if (['STRONG','VERY_STRONG','BALANCED_STRONG'].includes(band)) {
    balance = [GENERATES[dayElement], CONTROLLED_BY[dayElement], CONTROLS[dayElement]];
    excessRisk = [dayElement, GENERATED_BY[dayElement]];
  } else if (['WEAK','VERY_WEAK','BALANCED_WEAK'].includes(band)) {
    balance = [GENERATED_BY[dayElement], dayElement];
    excessRisk = [CONTROLS[dayElement], CONTROLLED_BY[dayElement], GENERATES[dayElement]];
  }

  const unique = xs => [...new Set(xs)];
  const hardClimate = unique(climate.hardNeed);
  const conditionalClimate = unique(climate.conditionalNeed);
  const primary = hardClimate.length ? hardClimate : unique(balance.slice(0,1));
  const remaining = unique(balance.filter(x => !primary.includes(x)));
  const secondary = remaining.slice(0,1);
  const conditional = unique([...remaining.slice(1), ...conditionalClimate.filter(x => !primary.includes(x) && !secondary.includes(x))]);

  return {
    structureKey: null,
    climateProfile: climate,
    climateNeed: hardClimate,
    climateConditionalNeed: conditionalClimate,
    balanceNeed: unique(balance),
    bridgeNeed: [],
    primaryElements: primary,
    secondaryElements: secondary,
    conditionalElements: conditional,
    excessRiskElements: unique(excessRisk),
    confidence: 'PROVISIONAL'
  };
}

export function assessStrength(chart) {
  const pillars = {
    year: parsePillar(chart.year),
    month: parsePillar(chart.month),
    day: parsePillar(chart.day),
    hour: parsePillar(chart.hour)
  };
  const dayElement = STEM_ELEMENT[pillars.day.stem];
  const monthBranch = pillars.month.branch;
  const season = seasonState(dayElement, monthBranch);
  const relations = detectRelations(pillars);
  const relationResolution = resolveRelationTransformations(chart, relations);

  const branchPositions = [
    ['YEAR_BRANCH', pillars.year.branch],
    ['MONTH_BRANCH', pillars.month.branch],
    ['DAY_BRANCH', pillars.day.branch],
    ['HOUR_BRANCH', pillars.hour.branch]
  ];

  const roots = [];
  const allies = [];
  const opposing = [];

  for (const [position, branch] of branchPositions) {
    const hidden = BRANCH_HIDDEN[branch];
    hidden.forEach((stem, index) => {
      const element = STEM_ELEMENT[stem];
      const relation = relationToDay(dayElement, element);
      if (relation === 'PEER') roots.push({ position, branch, stem, element, rank: rootRank(index) });
      if (relation === 'RESOURCE') allies.push({ kind: 'HIDDEN_STEM', position, branch, stem, element, relation, hiddenIndex: index });
      if (['OUTPUT','WEALTH','OFFICER'].includes(relation)) {
        opposing.push({ kind: 'HIDDEN_STEM', position, branch, stem, element, relation, hiddenIndex: index });
      }
    });
  }

  const visiblePositions = [
    ['YEAR_STEM', pillars.year.stem],
    ['MONTH_STEM', pillars.month.stem],
    ['HOUR_STEM', pillars.hour.stem]
  ];

  for (const [position, stem] of visiblePositions) {
    const element = STEM_ELEMENT[stem];
    const relation = relationToDay(dayElement, element);
    if (['PEER','RESOURCE'].includes(relation)) {
      allies.push({ kind: 'VISIBLE_STEM', position, stem, element, relation });
    } else {
      opposing.push({ kind: 'VISIBLE_STEM', position, stem, element, relation });
    }
  }

  const annotatedRoots = annotateRootRelations(roots, relations, relationResolution);
  const rootResolution = effectiveRootLevel(annotatedRoots);
  const root = rootResolution.effective;
  const ally = allyLevel(allies);
  const opposition = opposingLevel(opposing, monthBranch);
  const effectiveCounterforce = opposing.some(o =>
    ['OFFICER','WEALTH'].includes(o.relation) &&
    (o.kind === 'VISIBLE_STEM' || o.hiddenIndex === 0)
  );
  const strengthBand = resolveBand({ season, root, ally, opposition, effectiveCounterforce });

  const specialStructureCandidate = ['VERY_STRONG','VERY_WEAK'].includes(strengthBand);
  const favorable = favorableAssessment(dayElement, strengthBand, monthBranch);

  return {
    version: VERSION,
    dayMaster: { stem: pillars.day.stem, element: dayElement },
    seasonState: season,
    relations,
    relationResolution,
    roots: annotatedRoots,
    rawRootLevel: rootResolution.raw,
    rootLevel: rootResolution.effective,
    rootModifierReason: rootResolution.reason,
    supportFindings: allies,
    supportLevel: ally,
    opposingFindings: opposing,
    opposingLevel: opposition,
    effectiveCounterforce,
    strengthBand,
    specialStructureCandidate,
    specialStructure: 'NOT_EVALUATED',
    climateProfile: favorable.climateProfile,
    climateNeed: favorable.climateNeed,
    climateConditionalNeed: favorable.climateConditionalNeed,
    favorable,
    trace: [
      `DAY_MASTER=${pillars.day.stem}/${dayElement}`,
      `SEASON=${monthBranch}/${season}`,
      `ROOT_LEVEL_RAW=${rootResolution.raw}`,
      `ROOT_LEVEL_EFFECTIVE=${rootResolution.effective}`,
      `ROOT_MODIFIER=${rootResolution.reason}`,
      `SUPPORT_LEVEL=${ally}`,
      `OPPOSITION_LEVEL=${opposition}`,
      `EFFECTIVE_COUNTERFORCE=${effectiveCounterforce ? 'YES' : 'NO'}`,
      `BRANCH_RELATIONS=${relations.branchFacts.map(x=>x.type).join(',') || 'NONE'}`,
      `ASSEMBLY_CANDIDATES=${relations.assemblies.map(x=>`${x.type}:${x.candidateElement}`).join(',') || 'NONE'}`,
      `STEM_COMBINATIONS=${relations.stemFacts.map(x=>x.candidateElement).join(',') || 'NONE'}`,
      `RELATION_MONTH_CLASH=${relationResolution.monthCommandClash.status}`,
      `STRENGTH_BAND=${strengthBand}`,
      `CLIMATE=${favorable.climateProfile.temperature}/${favorable.climateProfile.moisture}`,
      `CLIMATE_NEED=${favorable.climateNeed.join(',') || 'NONE'}`,
      `CLIMATE_CONDITIONAL=${favorable.climateConditionalNeed.join(',') || 'NONE'}`,
      `FAVORABLE_PRIMARY=${favorable.primaryElements.join(',') || 'NONE'}`,
      `FAVORABLE_SECONDARY=${favorable.secondaryElements.join(',') || 'NONE'}`,
      `FAVORABLE_CONDITIONAL=${favorable.conditionalElements.join(',') || 'NONE'}`
    ]
  };
}

export function compareBand(a, b) {
  return BAND_ORDER[a] - BAND_ORDER[b];
}
