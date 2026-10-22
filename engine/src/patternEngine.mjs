import { assessStrength } from './strengthEngine.mjs';
import { evaluateSpecialStructure } from './specialStructureEngine.mjs';

export const PATTERN_VERSION = 'GUANCHENG_NORMAL_PATTERN_STRUCTURE_KEY_PROTO_V1';

const STEM_ELEMENT = {
  甲:'WOOD', 乙:'WOOD', 丙:'FIRE', 丁:'FIRE', 戊:'EARTH',
  己:'EARTH', 庚:'METAL', 辛:'METAL', 壬:'WATER', 癸:'WATER'
};
const STEM_POLARITY = {
  甲:'YANG', 乙:'YIN', 丙:'YANG', 丁:'YIN', 戊:'YANG',
  己:'YIN', 庚:'YANG', 辛:'YIN', 壬:'YANG', 癸:'YIN'
};
const BRANCH_HIDDEN = {
  子:['癸'], 丑:['己','癸','辛'], 寅:['甲','丙','戊'], 卯:['乙'],
  辰:['戊','乙','癸'], 巳:['丙','戊','庚'], 午:['丁','己'], 未:['己','丁','乙'],
  申:['庚','壬','戊'], 酉:['辛'], 戌:['戊','辛','丁'], 亥:['壬','甲']
};
const GENERATES = { WOOD:'FIRE', FIRE:'EARTH', EARTH:'METAL', METAL:'WATER', WATER:'WOOD' };
const CONTROLS = { WOOD:'EARTH', FIRE:'METAL', EARTH:'WATER', METAL:'WOOD', WATER:'FIRE' };
const GENERATED_BY = Object.fromEntries(Object.entries(GENERATES).map(([a,b]) => [b,a]));
const CONTROLLED_BY = Object.fromEntries(Object.entries(CONTROLS).map(([a,b]) => [b,a]));

const LU_BRANCH = { 甲:'寅', 乙:'卯', 丙:'巳', 丁:'午', 戊:'巳', 己:'午', 庚:'申', 辛:'酉', 壬:'亥', 癸:'子' };
// Conservative classical 阳刃 table: only the five yang stems are auto-labelled.
const YANG_REN_BRANCH = { 甲:'卯', 丙:'午', 戊:'午', 庚:'酉', 壬:'子' };

const GOD_FAMILY = {
  DIRECT_OFFICER:'OFFICER', SEVEN_KILLINGS:'KILLING',
  DIRECT_WEALTH:'WEALTH', INDIRECT_WEALTH:'WEALTH',
  DIRECT_RESOURCE:'RESOURCE', INDIRECT_RESOURCE:'RESOURCE',
  EATING_GOD:'EATING_GOD', HURTING_OFFICER:'HURTING_OFFICER',
  PEER:'PEER', ROB_WEALTH:'ROB_WEALTH'
};

const PATTERN_LABEL = {
  DIRECT_OFFICER:'正官格', SEVEN_KILLINGS:'七杀格',
  DIRECT_WEALTH:'正财格', INDIRECT_WEALTH:'偏财格',
  DIRECT_RESOURCE:'正印格', INDIRECT_RESOURCE:'偏印格',
  EATING_GOD:'食神格', HURTING_OFFICER:'伤官格',
  JIAN_LU:'建禄', YUE_JIE:'月劫', YANG_REN:'阳刃'
};

function parsePillar(p) {
  if (!p || p.length < 2) throw new Error(`Invalid pillar: ${p}`);
  return { stem:p[0], branch:p[1] };
}

export function tenGod(dayStem, otherStem) {
  const dm = STEM_ELEMENT[dayStem];
  const other = STEM_ELEMENT[otherStem];
  if (!dm || !other) throw new Error(`Unknown stem: ${dayStem}/${otherStem}`);
  const samePolarity = STEM_POLARITY[dayStem] === STEM_POLARITY[otherStem];

  if (other === dm) return samePolarity ? 'PEER' : 'ROB_WEALTH';
  if (GENERATES[dm] === other) return samePolarity ? 'EATING_GOD' : 'HURTING_OFFICER';
  if (CONTROLS[dm] === other) return samePolarity ? 'INDIRECT_WEALTH' : 'DIRECT_WEALTH';
  if (CONTROLS[other] === dm) return samePolarity ? 'SEVEN_KILLINGS' : 'DIRECT_OFFICER';
  if (GENERATED_BY[dm] === other) return samePolarity ? 'INDIRECT_RESOURCE' : 'DIRECT_RESOURCE';
  throw new Error(`Cannot map ten god ${dayStem}/${otherStem}`);
}

function externalVisibleStems(pillars) {
  return [
    {position:'YEAR_STEM', stem:pillars.year.stem},
    {position:'MONTH_STEM', stem:pillars.month.stem},
    {position:'HOUR_STEM', stem:pillars.hour.stem}
  ];
}

function godPresence(dayStem, pillars) {
  const visible = externalVisibleStems(pillars).map(x => ({...x, god:tenGod(dayStem, x.stem)}));
  const hidden = [];
  for (const [position, branch] of [
    ['YEAR_BRANCH',pillars.year.branch], ['MONTH_BRANCH',pillars.month.branch],
    ['DAY_BRANCH',pillars.day.branch], ['HOUR_BRANCH',pillars.hour.branch]
  ]) {
    BRANCH_HIDDEN[branch].forEach((stem, hiddenIndex) => hidden.push({
      position, branch, stem, hiddenIndex, god:tenGod(dayStem, stem)
    }));
  }
  const all = [...visible, ...hidden];
  const has = god => all.some(x => x.god === god);
  const hasVisible = god => visible.some(x => x.god === god);
  const familyPresent = family => all.some(x => GOD_FAMILY[x.god] === family);
  const familyVisible = family => visible.some(x => GOD_FAMILY[x.god] === family);
  return { visible, hidden, all, has, hasVisible, familyPresent, familyVisible };
}

function baseStructure(dayStem, monthBranch) {
  const mainStem = BRANCH_HIDDEN[monthBranch][0];
  const mainGod = tenGod(dayStem, mainStem);

  if (LU_BRANCH[dayStem] === monthBranch) {
    return { key:'JIAN_LU', label:PATTERN_LABEL.JIAN_LU, monthMainStem:mainStem, monthMainGod:mainGod };
  }
  if (YANG_REN_BRANCH[dayStem] === monthBranch) {
    return { key:'YANG_REN', label:PATTERN_LABEL.YANG_REN, monthMainStem:mainStem, monthMainGod:mainGod };
  }
  if (mainGod === 'PEER' || mainGod === 'ROB_WEALTH') {
    return { key:'YUE_JIE', label:PATTERN_LABEL.YUE_JIE, monthMainStem:mainStem, monthMainGod:mainGod };
  }
  return { key:mainGod, label:PATTERN_LABEL[mainGod], monthMainStem:mainStem, monthMainGod:mainGod };
}

function monthHiddenExposure(dayStem, monthBranch, visibleStems) {
  return BRANCH_HIDDEN[monthBranch].map((stem, hiddenIndex) => {
    const matches = visibleStems.filter(x => x.stem === stem).map(x => x.position);
    return {
      stem, hiddenIndex,
      qi: hiddenIndex === 0 ? 'MAIN_QI' : hiddenIndex === 1 ? 'MIDDLE_QI' : 'RESIDUAL_QI',
      god:tenGod(dayStem, stem),
      exposed:matches.length > 0,
      exposedAt:matches
    };
  });
}

function operationalForPeerMonth(base, exposure, presence) {
  if (!['JIAN_LU','YUE_JIE','YANG_REN'].includes(base.key)) return null;

  const visibleGods = new Set(presence.visible.map(x => x.god));
  const hasFamily = f => presence.familyPresent(f);
  const hasGod = g => presence.has(g);
  const routes = [];

  if (base.key === 'YANG_REN') {
    const authorityVisible = visibleGods.has('DIRECT_OFFICER') || visibleGods.has('SEVEN_KILLINGS');
    const auxiliary = hasFamily('WEALTH') || hasFamily('RESOURCE');
    const noHurtingOfficer = !hasGod('HURTING_OFFICER');
    if (authorityVisible && auxiliary && noHurtingOfficer) {
      routes.push({ route:'YANG_REN_OFFICER_KILLING_ROUTE', status:'SUPPORTED_CANDIDATE' });
    }
  } else {
    // 《子平真诠》prototype routes for 建禄/月劫:
    // 透官而逢财印；透财而逢食伤；透煞而遇制伏。
    if (visibleGods.has('DIRECT_OFFICER') && (hasFamily('WEALTH') || hasFamily('RESOURCE'))) {
      routes.push({ route:'OFFICER_ROUTE', status:'SUPPORTED_CANDIDATE' });
    }
    if ((visibleGods.has('DIRECT_WEALTH') || visibleGods.has('INDIRECT_WEALTH')) &&
        (hasGod('EATING_GOD') || hasGod('HURTING_OFFICER'))) {
      routes.push({ route:'WEALTH_ROUTE', status:'SUPPORTED_CANDIDATE' });
    }
    if (visibleGods.has('SEVEN_KILLINGS') && (hasGod('EATING_GOD') || hasGod('HURTING_OFFICER'))) {
      routes.push({ route:'KILLING_CONTROL_ROUTE', status:'SUPPORTED_CANDIDATE' });
    }
  }

  if (routes.length === 1) return { status:'SELECTED', route:routes[0].route, source:'CLASSICAL_ROUTE', candidates:routes };
  if (routes.length > 1) return { status:'REVIEW', route:null, source:'MULTIPLE_CLASSICAL_ROUTES', candidates:routes };

  // Keep incomplete external signals auditable without promoting them to a formed route.
  const rawEligible = presence.visible.filter(x => [
    'DIRECT_OFFICER','SEVEN_KILLINGS','DIRECT_WEALTH','INDIRECT_WEALTH','EATING_GOD','HURTING_OFFICER'
  ].includes(x.god));
  const hiddenEligible = exposure.filter(x => x.hiddenIndex > 0 && x.exposed && [
    'DIRECT_OFFICER','SEVEN_KILLINGS','DIRECT_WEALTH','INDIRECT_WEALTH','EATING_GOD','HURTING_OFFICER'
  ].includes(x.god));
  const raw = [...rawEligible, ...hiddenEligible];
  if (raw.length) return { status:'UNRESOLVED', route:null, source:'INCOMPLETE_OPERATIONAL_ROUTE', candidates:raw };
  return { status:'UNRESOLVED', route:null, source:'NO_ELIGIBLE_VISIBLE_USE', candidates:[] };
}

function monthBranchUnderClash(assessment) {
  return assessment.relations.branchFacts.some(f => f.type === 'CLASH' &&
    (f.a.position === 'MONTH_BRANCH' || f.b.position === 'MONTH_BRANCH'));
}

function formationSignals(base, operational, presence, strength) {
  const active = operational?.route ?? base.key;
  const family = GOD_FAMILY[base.key] ?? base.key;
  const support = [];
  const disruption = [];
  const unresolved = [];
  const weakBand = ['WEAK','VERY_WEAK','BALANCED_WEAK'].includes(strength.strengthBand);
  const strongBand = ['STRONG','VERY_STRONG','BALANCED_STRONG'].includes(strength.strengthBand);

  const hasFamily = f => presence.familyPresent(f);
  const hasGod = g => presence.has(g);
  const monthClash = monthBranchUnderClash(strength);

  if (['JIAN_LU','YUE_JIE','YANG_REN'].includes(base.key)) {
    if (operational?.status === 'SELECTED') support.push(`PEER_MONTH_${operational.route}`);
    if (operational?.status === 'UNRESOLVED') unresolved.push('PEER_MONTH_REQUIRES_COMPLETE_OPERATIONAL_ROUTE');
    if (operational?.status === 'REVIEW') unresolved.push('MULTIPLE_OPERATIONAL_ROUTES');
    if (monthClash) disruption.push('MONTH_COMMAND_UNDER_CLASH');
  } else if (family === 'OFFICER') {
    if (hasFamily('WEALTH')) support.push('WEALTH_SUPPORTS_OFFICER');
    if (hasFamily('RESOURCE')) support.push('RESOURCE_PROTECTS_OR_CHANNELS_OFFICER');
    if (hasGod('HURTING_OFFICER')) disruption.push('HURTING_OFFICER_ATTACKS_OFFICER');
    if (monthClash) disruption.push('MONTH_COMMAND_UNDER_CLASH');
  } else if (family === 'WEALTH') {
    if (hasFamily('OFFICER')) support.push('WEALTH_GENERATES_OFFICER');
    if (hasGod('EATING_GOD') || hasGod('HURTING_OFFICER')) support.push('OUTPUT_GENERATES_WEALTH');
    if ((hasGod('PEER') || hasGod('ROB_WEALTH')) && weakBand === false) disruption.push('PEER_ROB_COMPETES_FOR_WEALTH');
  } else if (family === 'RESOURCE') {
    if (hasFamily('OFFICER') || hasFamily('KILLING')) support.push('OFFICER_KILLING_GENERATES_RESOURCE');
    if (hasFamily('WEALTH')) disruption.push('WEALTH_CONTROLS_RESOURCE');
    if (strongBand && hasFamily('KILLING')) unresolved.push('STRONG_BODY_RESOURCE_WITH_KILLING_NEEDS_REVIEW');
  } else if (family === 'EATING_GOD') {
    if (hasFamily('WEALTH')) support.push('EATING_GOD_GENERATES_WEALTH');
    if (hasFamily('KILLING') && !hasFamily('WEALTH')) support.push('EATING_GOD_CONTROLS_KILLING_CANDIDATE');
    if (hasGod('INDIRECT_RESOURCE')) disruption.push('INDIRECT_RESOURCE_CONTROLS_EATING_GOD');
  } else if (family === 'KILLING') {
    if (strongBand && (hasGod('EATING_GOD') || hasGod('HURTING_OFFICER'))) support.push('STRONG_BODY_WITH_OUTPUT_CONTROL_OF_KILLING');
    if (hasFamily('RESOURCE')) support.push('RESOURCE_TRANSFORMS_KILLING_CANDIDATE');
    if (hasFamily('WEALTH') && !(hasGod('EATING_GOD') || hasGod('HURTING_OFFICER'))) disruption.push('WEALTH_FEEDS_UNCONTROLLED_KILLING');
    if (weakBand && !hasFamily('RESOURCE')) disruption.push('WEAK_BODY_KILLING_PRESSURE');
  } else if (family === 'HURTING_OFFICER') {
    if (hasFamily('WEALTH')) support.push('HURTING_OFFICER_GENERATES_WEALTH');
    if (hasFamily('RESOURCE')) support.push('RESOURCE_CONTROLS_HURTING_OFFICER_CANDIDATE');
    if (hasFamily('OFFICER')) disruption.push('HURTING_OFFICER_MEETS_OFFICER');
  }

  let status = 'UNRESOLVED';
  if (support.length && !disruption.length && !unresolved.length) status = 'SUPPORTED';
  else if (disruption.length && !support.length && !unresolved.length) status = 'DISRUPTED';
  else if (support.length && disruption.length) status = 'MIXED';
  else if (unresolved.length) status = 'REVIEW';

  return { active, family, status, support, disruption, unresolved };
}

function variationCandidates(base, exposure) {
  return exposure
    .filter(x => x.hiddenIndex > 0 && x.exposed)
    .map(x => ({ stem:x.stem, god:x.god, qi:x.qi, candidatePattern:PATTERN_LABEL[x.god] ?? null }))
    .filter(x => x.candidatePattern && x.god !== base.monthMainGod);
}

export function assessPattern(chart, precomputedStrength = null, precomputedSpecial = null) {
  const pillars = {
    year:parsePillar(chart.year), month:parsePillar(chart.month),
    day:parsePillar(chart.day), hour:parsePillar(chart.hour)
  };
  const strength = precomputedStrength ?? assessStrength(chart);
  const special = precomputedSpecial ?? evaluateSpecialStructure(chart, strength);
  const dayStem = pillars.day.stem;
  const base = baseStructure(dayStem, pillars.month.branch);
  const presence = godPresence(dayStem, pillars);
  const exposure = monthHiddenExposure(dayStem, pillars.month.branch, presence.visible);
  const variations = variationCandidates(base, exposure);
  const operational = operationalForPeerMonth(base, exposure, presence);

  if (special.strictGate === 'PASS') {
    return {
      version:PATTERN_VERSION,
      authorityStatus:'PROTOTYPE_NOT_FINAL',
      status:'SPECIAL_STRUCTURE_PRECEDENCE',
      normalPatternSuppressed:true,
      specialStructure:special.classification,
      specialStructureLabel:special.chineseLabel,
      baseStructure:base,
      operationalPattern:null,
      monthHiddenExposure:exposure,
      variationCandidates:variations,
      formation:null,
      trace:[
        `DAY_MASTER=${dayStem}`,
        `MONTH_BRANCH=${pillars.month.branch}`,
        `BASE_STRUCTURE=${base.key}`,
        `SPECIAL_GATE=${special.strictGate}`,
        `SPECIAL_STRUCTURE=${special.classification}`,
        'NORMAL_PATTERN=SUPPRESSED'
      ]
    };
  }

  const formation = formationSignals(base, operational, presence, strength);
  const needsReview = special.strictGate === 'REVIEW' || operational?.status === 'REVIEW';
  const status = needsReview ? 'REVIEW' : 'NORMAL_PATTERN_ASSESSED';
  const operationalPattern = operational?.route ? {
    key:operational.route,
    label:operational.route,
    source:operational.source
  } : null;

  return {
    version:PATTERN_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    status,
    normalPatternSuppressed:false,
    specialStructureCandidate:special.classification ?? null,
    baseStructure:base,
    operationalPattern,
    operationalResolution:operational,
    monthHiddenExposure:exposure,
    variationCandidates:variations,
    godPresence:{ visible:presence.visible, hidden:presence.hidden },
    formation,
    trace:[
      `DAY_MASTER=${dayStem}`,
      `MONTH_BRANCH=${pillars.month.branch}`,
      `MONTH_MAIN_STEM=${base.monthMainStem}`,
      `MONTH_MAIN_GOD=${base.monthMainGod}`,
      `BASE_STRUCTURE=${base.key}`,
      `BASE_LABEL=${base.label}`,
      `MONTH_EXPOSURES=${exposure.filter(x=>x.exposed).map(x=>`${x.stem}:${x.god}:${x.qi}`).join('|') || 'NONE'}`,
      `VARIATIONS=${variations.map(x=>x.god).join('|') || 'NONE'}`,
      `OPERATIONAL=${operationalPattern?.key ?? 'NONE'}`,
      `FORMATION_STATUS=${formation.status}`,
      `FORMATION_SUPPORT=${formation.support.join('|') || 'NONE'}`,
      `FORMATION_DISRUPTION=${formation.disruption.join('|') || 'NONE'}`,
      `SPECIAL_GATE=${special.strictGate}`,
      `STRENGTH=${strength.strengthBand}`
    ]
  };
}
