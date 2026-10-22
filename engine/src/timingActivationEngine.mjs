import { tenGod } from './patternEngine.mjs';
import { assessStrength } from './strengthEngine.mjs';
import { resolvePattern } from './patternResolutionEngine.mjs';

export const TIMING_ACTIVATION_VERSION = 'GUANCHENG_TIMING_ACTIVATION_PROTO_V1_D8';

const BRANCH_HIDDEN = {
  子:['癸'], 丑:['己','癸','辛'], 寅:['甲','丙','戊'], 卯:['乙'],
  辰:['戊','乙','癸'], 巳:['丙','戊','庚'], 午:['丁','己'], 未:['己','丁','乙'],
  申:['庚','壬','戊'], 酉:['辛'], 戌:['戊','辛','丁'], 亥:['壬','甲']
};

const STEM_COMBINATIONS = [
  { stems:['甲','己'], candidateElement:'EARTH' },
  { stems:['乙','庚'], candidateElement:'METAL' },
  { stems:['丙','辛'], candidateElement:'WATER' },
  { stems:['丁','壬'], candidateElement:'WOOD' },
  { stems:['戊','癸'], candidateElement:'FIRE' }
];

const BRANCH_CLASHES = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
const BRANCH_COMBINATIONS = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
const BRANCH_HARMS = [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']];
const BRANCH_BREAKS = [['子','酉'],['丑','辰'],['寅','亥'],['卯','午'],['巳','申'],['未','戌']];
const MUTUAL_PUNISHMENTS = [['子','卯']];
const THREE_PUNISHMENT_GROUPS = [
  { branches:['寅','巳','申'], key:'UNGRATEFUL_THREE_PUNISHMENT' },
  { branches:['丑','戌','未'], key:'POWER_THREE_PUNISHMENT' }
];
const SELF_PUNISHMENTS = new Set(['辰','午','酉','亥']);
const THREE_HARMONIES = [
  { branches:['申','子','辰'], element:'WATER', key:'THREE_HARMONY' },
  { branches:['亥','卯','未'], element:'WOOD', key:'THREE_HARMONY' },
  { branches:['寅','午','戌'], element:'FIRE', key:'THREE_HARMONY' },
  { branches:['巳','酉','丑'], element:'METAL', key:'THREE_HARMONY' }
];
const THREE_MEETINGS = [
  { branches:['亥','子','丑'], element:'WATER', key:'THREE_MEETING' },
  { branches:['寅','卯','辰'], element:'WOOD', key:'THREE_MEETING' },
  { branches:['巳','午','未'], element:'FIRE', key:'THREE_MEETING' },
  { branches:['申','酉','戌'], element:'METAL', key:'THREE_MEETING' }
];

const GOD_FAMILY = {
  PEER:'PEER', ROB_WEALTH:'PEER',
  EATING_GOD:'OUTPUT', HURTING_OFFICER:'OUTPUT',
  DIRECT_WEALTH:'WEALTH', INDIRECT_WEALTH:'WEALTH',
  DIRECT_OFFICER:'AUTHORITY', SEVEN_KILLINGS:'AUTHORITY',
  DIRECT_RESOURCE:'RESOURCE', INDIRECT_RESOURCE:'RESOURCE'
};

function parsePillar(p) {
  if (!p || typeof p !== 'string' || p.length < 2) throw new Error(`Invalid pillar: ${p}`);
  return { stem:p[0], branch:p[1] };
}

function pairKey(a,b) { return [a,b].sort().join(''); }
function pairSet(items) { return new Set(items.map(([a,b]) => pairKey(a,b))); }
const CLASH_SET = pairSet(BRANCH_CLASHES);
const COMBO_SET = pairSet(BRANCH_COMBINATIONS);
const HARM_SET = pairSet(BRANCH_HARMS);
const BREAK_SET = pairSet(BRANCH_BREAKS);
const MUTUAL_PUNISH_SET = pairSet(MUTUAL_PUNISHMENTS);
const PUNISHMENT_PAIR_SET = new Set(THREE_PUNISHMENT_GROUPS.flatMap(g => [
  pairKey(g.branches[0],g.branches[1]), pairKey(g.branches[0],g.branches[2]), pairKey(g.branches[1],g.branches[2])
]));

function natalSources(chart) {
  const y=parsePillar(chart.year), m=parsePillar(chart.month), d=parsePillar(chart.day), h=parsePillar(chart.hour);
  return {
    dayStem:d.stem,
    stems:[
      {scope:'NATAL', position:'YEAR_STEM', value:y.stem},
      {scope:'NATAL', position:'MONTH_STEM', value:m.stem},
      {scope:'NATAL', position:'DAY_STEM', value:d.stem},
      {scope:'NATAL', position:'HOUR_STEM', value:h.stem}
    ],
    branches:[
      {scope:'NATAL', position:'YEAR_BRANCH', value:y.branch},
      {scope:'NATAL', position:'MONTH_BRANCH', value:m.branch},
      {scope:'NATAL', position:'DAY_BRANCH', value:d.branch},
      {scope:'NATAL', position:'HOUR_BRANCH', value:h.branch}
    ],
    pillars:[
      {scope:'NATAL', position:'YEAR_PILLAR', value:chart.year},
      {scope:'NATAL', position:'MONTH_PILLAR', value:chart.month},
      {scope:'NATAL', position:'DAY_PILLAR', value:chart.day},
      {scope:'NATAL', position:'HOUR_PILLAR', value:chart.hour}
    ]
  };
}

function layerDescriptor(dayStem, layer, pillar) {
  const {stem,branch}=parsePillar(pillar);
  const hidden=BRANCH_HIDDEN[branch];
  if (!hidden) throw new Error(`Unknown branch: ${branch}`);
  return {
    layer,
    pillar,
    stem,
    branch,
    stemGod:tenGod(dayStem,stem),
    stemFamily:GOD_FAMILY[tenGod(dayStem,stem)],
    branchHiddenGods:hidden.map((s,i)=>({ stem:s, hiddenIndex:i, god:tenGod(dayStem,s), family:GOD_FAMILY[tenGod(dayStem,s)] })),
    branchMainGod:tenGod(dayStem,hidden[0]),
    branchMainFamily:GOD_FAMILY[tenGod(dayStem,hidden[0])]
  };
}

function stemCombination(a,b) {
  const rule=STEM_COMBINATIONS.find(r => pairKey(...r.stems)===pairKey(a,b));
  return rule?.candidateElement ?? null;
}

function relationFactsForLayer(layer, existing) {
  const out=[];
  for (const x of existing.stems) {
    const candidateElement=stemCombination(layer.stem,x.value);
    if (candidateElement) out.push({
      type:'STEM_COMBINATION_TRIGGER', layer:layer.layer,
      source:{position:`${layer.layer}_STEM`, value:layer.stem},
      target:x, candidateElement, status:'TRIGGERED_NOT_AUTO_TRANSFORMED'
    });
  }

  for (const x of existing.branches) {
    const k=pairKey(layer.branch,x.value);
    const base={ layer:layer.layer, source:{position:`${layer.layer}_BRANCH`,value:layer.branch}, target:x };
    if (CLASH_SET.has(k)) out.push({...base,type:'BRANCH_CLASH_TRIGGER',status:'TRIGGERED'});
    if (COMBO_SET.has(k)) out.push({...base,type:'SIX_COMBINATION_TRIGGER',status:'TRIGGERED_NOT_AUTO_TRANSFORMED'});
    if (HARM_SET.has(k)) out.push({...base,type:'HARM_TRIGGER',status:'SECONDARY_MODIFIER'});
    if (BREAK_SET.has(k)) out.push({...base,type:'BREAK_TRIGGER',status:'SECONDARY_MODIFIER'});
    if (MUTUAL_PUNISH_SET.has(k)) out.push({...base,type:'MUTUAL_PUNISHMENT_TRIGGER',status:'TRIGGERED'});
    if (PUNISHMENT_PAIR_SET.has(k)) out.push({...base,type:'THREE_PUNISHMENT_PARTIAL_TRIGGER',status:'REVIEW_PARTIAL_NOT_COMPLETE'});
    if (layer.branch===x.value && SELF_PUNISHMENTS.has(layer.branch)) out.push({...base,type:'SELF_PUNISHMENT_TRIGGER',status:'TRIGGERED'});
    if (layer.branch===x.value) out.push({...base,type:'BRANCH_REPEAT_FACT',status:'FACT_ONLY'});
  }

  for (const p of existing.pillars) {
    if (layer.pillar===p.value) out.push({
      type:'PILLAR_REPEAT_FACT', layer:layer.layer,
      source:{position:`${layer.layer}_PILLAR`,value:layer.pillar}, target:p, status:'FACT_ONLY'
    });
  }
  return out;
}

function groupCompletions(layer, existingBranches, groups, type) {
  const before=new Set(existingBranches.map(x=>x.value));
  const after=new Set([...before,layer.branch]);
  const out=[];
  for (const g of groups) {
    const wasComplete=g.branches.every(b=>before.has(b));
    const isComplete=g.branches.every(b=>after.has(b));
    if (!wasComplete && isComplete) out.push({
      type, layer:layer.layer, branches:g.branches,
      candidateElement:g.element ?? null,
      status:'COMPLETED_BY_TIMING_LAYER',
      completedBy:layer.branch,
      sources:existingBranches.filter(x=>g.branches.includes(x.value))
    });
  }
  return out;
}

function activationFindings(layer, relations, completions, punishCompletions) {
  const findings=[];
  findings.push({
    category:'TEN_GOD_ENTRY', layer:layer.layer, key:`${layer.stemGod}_VISIBLE_ENTERED`,
    source:`${layer.layer}_STEM`, god:layer.stemGod, family:layer.stemFamily, strength:'VISIBLE',
    meaning:'TIMING_LAYER_VISIBLE_STEM', rewritesNatalStructure:false
  });
  layer.branchHiddenGods.forEach((x,i)=>findings.push({
    category:'TEN_GOD_ENTRY', layer:layer.layer, key:`${x.god}_BRANCH_${i===0?'MAIN':'HIDDEN'}_ENTERED`,
    source:`${layer.layer}_BRANCH`, god:x.god, family:x.family,
    strength:i===0?'BRANCH_MAIN':'HIDDEN', hiddenIndex:i, rewritesNatalStructure:false
  }));

  const sameElementGods=layer.branchHiddenGods.filter(x=>['PEER','ROB_WEALTH'].includes(x.god));
  if (sameElementGods.length) findings.push({
    category:'TEMPORARY_SUPPORT', layer:layer.layer, key:'SAME_ELEMENT_ROOT_SUPPORT_ENTERED',
    source:`${layer.layer}_BRANCH`, gods:sameElementGods.map(x=>x.god),
    status:'ACTIVATED_NOT_NATAL_ROOT', rewritesNatalStrength:false
  });
  const resourceGods=layer.branchHiddenGods.filter(x=>['DIRECT_RESOURCE','INDIRECT_RESOURCE'].includes(x.god));
  if (resourceGods.length) findings.push({
    category:'TEMPORARY_SUPPORT', layer:layer.layer, key:'RESOURCE_SUPPORT_ENTERED',
    source:`${layer.layer}_BRANCH`, gods:resourceGods.map(x=>x.god),
    status:'ACTIVATED_NOT_NATAL_ROOT', rewritesNatalStrength:false
  });

  for (const r of relations) findings.push({
    category:'RELATION_TRIGGER', layer:layer.layer, key:r.type,
    source:r.source, target:r.target, status:r.status,
    candidateElement:r.candidateElement ?? null,
    rewritesNatalStructure:false
  });
  for (const c of completions) findings.push({
    category:'ASSEMBLY_COMPLETION', layer:layer.layer, key:`${c.type}_${c.candidateElement}`,
    branches:c.branches, candidateElement:c.candidateElement, status:c.status,
    rewritesNatalStructure:false
  });
  for (const c of punishCompletions) findings.push({
    category:'PUNISHMENT_COMPLETION', layer:layer.layer, key:c.type,
    branches:c.branches, status:c.status, rewritesNatalStructure:false
  });
  return findings;
}

function patternSignals(natalPattern, layers) {
  const base=natalPattern.baseStructure?.key;
  const visibleGods=layers.map(x=>({layer:x.layer,god:x.stemGod}));
  const signals=[];
  const add=(x)=>signals.push({ requiresFullSynthesis:true, rewritesNatalStructure:false, ...x });

  for (const x of visibleGods) {
    const g=x.god;
    if (base==='DIRECT_OFFICER') {
      if (g==='HURTING_OFFICER') add({layer:x.layer,key:'HURTING_OFFICER_PRESSURES_OFFICER',classification:'PATTERN_PRESSURE_CANDIDATE'});
      if (['DIRECT_RESOURCE','INDIRECT_RESOURCE'].includes(g)) add({layer:x.layer,key:'RESOURCE_SUPPORTS_OFFICER_ROUTE',classification:'PATTERN_SUPPORT_CANDIDATE'});
      if (['DIRECT_WEALTH','INDIRECT_WEALTH'].includes(g)) add({layer:x.layer,key:'WEALTH_SUPPORTS_OFFICER_ROUTE',classification:'PATTERN_SUPPORT_CANDIDATE'});
      if (g==='SEVEN_KILLINGS') add({layer:x.layer,key:'OFFICER_KILLING_MIXTURE_ACTIVATED',classification:'PATTERN_COMPLEXITY_REVIEW'});
    }
    if (base==='SEVEN_KILLINGS') {
      if (g==='EATING_GOD') add({layer:x.layer,key:'EATING_GOD_CONTROL_KILLING_ACTIVATED',classification:'PATTERN_SUPPORT_CANDIDATE'});
      if (['DIRECT_RESOURCE','INDIRECT_RESOURCE'].includes(g)) add({layer:x.layer,key:'KILLING_RESOURCE_TRANSFORMATION_ACTIVATED',classification:'PATTERN_SUPPORT_CANDIDATE'});
      if (['DIRECT_WEALTH','INDIRECT_WEALTH'].includes(g)) add({layer:x.layer,key:'WEALTH_FEEDS_KILLING_PRESSURE',classification:'PATTERN_PRESSURE_CANDIDATE'});
    }
    if (['DIRECT_WEALTH','INDIRECT_WEALTH'].includes(base)) {
      if (['EATING_GOD','HURTING_OFFICER'].includes(g)) add({layer:x.layer,key:'OUTPUT_GENERATES_WEALTH_ACTIVATED',classification:'PATTERN_SUPPORT_CANDIDATE'});
      if (['PEER','ROB_WEALTH'].includes(g)) add({layer:x.layer,key:'PEER_PRESSURE_ON_WEALTH_ACTIVATED',classification:'PATTERN_PRESSURE_CANDIDATE'});
    }
    if (['DIRECT_RESOURCE','INDIRECT_RESOURCE'].includes(base)) {
      if (['DIRECT_WEALTH','INDIRECT_WEALTH'].includes(g)) add({layer:x.layer,key:'WEALTH_PRESSURES_RESOURCE_ACTIVATED',classification:'PATTERN_PRESSURE_CANDIDATE'});
      if (['DIRECT_OFFICER','SEVEN_KILLINGS'].includes(g)) add({layer:x.layer,key:'AUTHORITY_GENERATES_RESOURCE_ACTIVATED',classification:'PATTERN_SUPPORT_CANDIDATE'});
    }
    if (base==='EATING_GOD') {
      if (g==='INDIRECT_RESOURCE') add({layer:x.layer,key:'INDIRECT_RESOURCE_PRESSURES_EATING_GOD',classification:'PATTERN_PRESSURE_CANDIDATE'});
      if (['DIRECT_WEALTH','INDIRECT_WEALTH'].includes(g)) add({layer:x.layer,key:'WEALTH_ROUTE_FROM_EATING_GOD_ACTIVATED',classification:'PATTERN_SUPPORT_CANDIDATE'});
      if (g==='SEVEN_KILLINGS') add({layer:x.layer,key:'EATING_GOD_KILLING_CONTROL_ROUTE_ACTIVATED',classification:'PATTERN_ROUTE_CANDIDATE'});
    }
    if (base==='HURTING_OFFICER') {
      if (['DIRECT_WEALTH','INDIRECT_WEALTH'].includes(g)) add({layer:x.layer,key:'HURTING_OFFICER_WEALTH_ROUTE_ACTIVATED',classification:'PATTERN_SUPPORT_CANDIDATE'});
      if (['DIRECT_RESOURCE','INDIRECT_RESOURCE'].includes(g)) add({layer:x.layer,key:'HURTING_OFFICER_RESOURCE_ROUTE_ACTIVATED',classification:'PATTERN_ROUTE_CANDIDATE'});
      if (g==='DIRECT_OFFICER') add({layer:x.layer,key:'HURTING_OFFICER_MEETS_OFFICER_ACTIVATED',classification:'PATTERN_PRESSURE_CANDIDATE'});
    }
    if (base==='YANG_REN') {
      if (['DIRECT_OFFICER','SEVEN_KILLINGS'].includes(g)) add({layer:x.layer,key:'YANG_REN_AUTHORITY_ACTIVATED',classification:'PATTERN_ROUTE_CANDIDATE'});
    }
    if (['JIAN_LU','YUE_JIE'].includes(base)) {
      if (g==='DIRECT_OFFICER') add({layer:x.layer,key:'PEER_MONTH_OFFICER_ROUTE_ACTIVATED',classification:'PATTERN_ROUTE_CANDIDATE'});
      if (['DIRECT_WEALTH','INDIRECT_WEALTH'].includes(g)) add({layer:x.layer,key:'PEER_MONTH_WEALTH_ROUTE_SIGNAL',classification:'PATTERN_ROUTE_CANDIDATE'});
      if (g==='SEVEN_KILLINGS') add({layer:x.layer,key:'PEER_MONTH_KILLING_ROUTE_SIGNAL',classification:'PATTERN_ROUTE_CANDIDATE'});
    }
  }
  return signals;
}

function reinforceThemes(layers) {
  if (layers.length < 2) return [];
  const [a,b]=layers;
  const out=[];
  if (a.stemFamily===b.stemFamily) out.push({
    key:'VISIBLE_STEM_THEME_REINFORCED', family:a.stemFamily,
    layers:[a.layer,b.layer], status:'REINFORCED_NOT_AUTO_GOOD_BAD'
  });
  if (a.branchMainFamily===b.branchMainFamily) out.push({
    key:'BRANCH_MAIN_THEME_REINFORCED', family:a.branchMainFamily,
    layers:[a.layer,b.layer], status:'REINFORCED_NOT_AUTO_GOOD_BAD'
  });
  if (a.stemGod===b.stemGod) out.push({
    key:'SAME_VISIBLE_TEN_GOD_REPEATED', god:a.stemGod,
    layers:[a.layer,b.layer], status:'REINFORCED_NOT_AUTO_GOOD_BAD'
  });
  return out;
}

export function assessTimingActivation(chart, timing={}) {
  const natalStrength=assessStrength(chart);
  const natalPattern=resolvePattern(chart);
  const sources=natalSources(chart);
  const layers=[];
  const allFindings=[];
  const layerResults=[];

  const specs=[];
  if (timing.dayun) specs.push({layer:'DAYUN',pillar:timing.dayun});
  if (timing.year) specs.push({layer:'YEAR',pillar:timing.year});

  for (const spec of specs) {
    const descriptor=layerDescriptor(sources.dayStem,spec.layer,spec.pillar);
    const relations=relationFactsForLayer(descriptor,sources);
    const assemblyCompletions=[
      ...groupCompletions(descriptor,sources.branches,THREE_HARMONIES,'THREE_HARMONY_COMPLETION'),
      ...groupCompletions(descriptor,sources.branches,THREE_MEETINGS,'THREE_MEETING_COMPLETION')
    ];
    const punishmentCompletions=groupCompletions(descriptor,sources.branches,THREE_PUNISHMENT_GROUPS,'THREE_PUNISHMENT_COMPLETION');
    const findings=activationFindings(descriptor,relations,assemblyCompletions,punishmentCompletions);

    layerResults.push({
      ...descriptor,
      relationFacts:relations,
      assemblyCompletions,
      punishmentCompletions,
      findings
    });
    layers.push(descriptor);
    allFindings.push(...findings);

    // The next timing layer may interact with this layer. This does not mutate natal.
    sources.stems.push({scope:spec.layer,position:`${spec.layer}_STEM`,value:descriptor.stem});
    sources.branches.push({scope:spec.layer,position:`${spec.layer}_BRANCH`,value:descriptor.branch});
    sources.pillars.push({scope:spec.layer,position:`${spec.layer}_PILLAR`,value:descriptor.pillar});
  }

  const patternActivation=patternSignals(natalPattern,layers);
  const reinforcedThemes=reinforceThemes(layers);

  return {
    version:TIMING_ACTIVATION_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    timingInputAuthority:'ACTIVE_DAYUN_AND_YEAR_MUST_BE_RESOLVED_BY_STEP01_CORE',
    natalInvariant:{
      strengthBand:natalStrength.strengthBand,
      baseStructure:natalPattern.baseStructure,
      patternStage:natalPattern.stage,
      natalStrengthRewritten:false,
      natalStructureRewritten:false
    },
    layers:layerResults,
    findings:allFindings,
    patternActivation,
    reinforcedThemes,
    trace:[
      `NATAL_STRENGTH=${natalStrength.strengthBand}`,
      `NATAL_STRUCTURE=${natalPattern.baseStructure?.key ?? 'NONE'}`,
      `NATAL_PATTERN_STAGE=${natalPattern.stage}`,
      `LAYERS=${layers.map(x=>`${x.layer}:${x.pillar}`).join('|') || 'NONE'}`,
      `VISIBLE_GODS=${layers.map(x=>`${x.layer}:${x.stemGod}`).join('|') || 'NONE'}`,
      `RELATION_TRIGGERS=${allFindings.filter(x=>x.category==='RELATION_TRIGGER').map(x=>`${x.layer}:${x.key}`).join('|') || 'NONE'}`,
      `ASSEMBLY_COMPLETIONS=${allFindings.filter(x=>x.category==='ASSEMBLY_COMPLETION').map(x=>`${x.layer}:${x.key}`).join('|') || 'NONE'}`,
      `PUNISHMENT_COMPLETIONS=${allFindings.filter(x=>x.category==='PUNISHMENT_COMPLETION').map(x=>`${x.layer}:${x.key}`).join('|') || 'NONE'}`,
      `PATTERN_ACTIVATION=${patternActivation.map(x=>`${x.layer}:${x.key}`).join('|') || 'NONE'}`,
      `REINFORCED=${reinforcedThemes.map(x=>x.key).join('|') || 'NONE'}`,
      'NATAL_REWRITE=NO'
    ]
  };
}
