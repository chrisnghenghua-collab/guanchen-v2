import { assessStrength } from './strengthEngine.mjs';
import { evaluateSpecialStructure } from './specialStructureEngine.mjs';
import { assessPattern } from './patternEngine.mjs';

export const PATTERN_RESOLUTION_VERSION = 'GUANCHENG_PATTERN_FORMATION_RESCUE_GRAPH_PROTO_V3_D7_R1';

const STRONG_BANDS = new Set(['BALANCED_STRONG','STRONG','VERY_STRONG']);
const WEAK_BANDS = new Set(['BALANCED_WEAK','WEAK','VERY_WEAK']);

function hasGod(pattern, god) {
  return [...pattern.godPresence.visible, ...pattern.godPresence.hidden].some(x => x.god === god);
}
function hasVisibleGod(pattern, god) {
  return pattern.godPresence.visible.some(x => x.god === god);
}
function visibleOfGod(pattern, god) {
  return pattern.godPresence.visible.filter(x => x.god === god);
}
function hasFamily(pattern, family) {
  const families = {
    WEALTH:['DIRECT_WEALTH','INDIRECT_WEALTH'],
    RESOURCE:['DIRECT_RESOURCE','INDIRECT_RESOURCE'],
    OFFICER:['DIRECT_OFFICER'],
    KILLING:['SEVEN_KILLINGS'],
    OUTPUT:['EATING_GOD','HURTING_OFFICER'],
    PEER:['PEER','ROB_WEALTH']
  };
  return (families[family] ?? []).some(g => hasGod(pattern, g));
}
function hasVisibleFamily(pattern, family) {
  const families = {
    WEALTH:['DIRECT_WEALTH','INDIRECT_WEALTH'],
    RESOURCE:['DIRECT_RESOURCE','INDIRECT_RESOURCE'],
    OFFICER:['DIRECT_OFFICER'],
    KILLING:['SEVEN_KILLINGS'],
    OUTPUT:['EATING_GOD','HURTING_OFFICER'],
    PEER:['PEER','ROB_WEALTH']
  };
  return (families[family] ?? []).some(g => hasVisibleGod(pattern, g));
}

function unique(xs) { return [...new Set(xs)]; }

function stemBindingCandidates(pattern, strength) {
  const byPosition = new Map(pattern.godPresence.visible.map(x => [x.position, x]));
  const resolved = strength.relationResolution?.stems ?? [];
  const out = [];
  for (const fact of resolved) {
    const a = byPosition.get(fact.a.position);
    const b = byPosition.get(fact.b.position);
    if (!a && !b) continue;
    for (const side of [a,b].filter(Boolean)) {
      out.push({
        god:side.god,
        stem:side.stem,
        position:side.position,
        candidateElement:fact.candidateElement,
        bindingStatus:fact.bindingStatus,
        transformationStatus:fact.transformationStatus,
        counterpartPosition: fact.a.position === side.position ? fact.b.position : fact.a.position
      });
    }
  }
  return out;
}

function authorityPurification(pattern, strength) {
  const officerVisible = visibleOfGod(pattern, 'DIRECT_OFFICER');
  const killingVisible = visibleOfGod(pattern, 'SEVEN_KILLINGS');
  const mixed = officerVisible.length > 0 && killingVisible.length > 0;
  if (!mixed) return { mixed:false, status:'NOT_APPLICABLE', route:null, candidates:[] };

  const binding = stemBindingCandidates(pattern, strength);
  const effective = binding.filter(x => x.bindingStatus === 'EFFECTIVE_BINDING');
  const reviewBinding = binding.filter(x => x.bindingStatus !== 'EFFECTIVE_BINDING');
  const officerBound = effective.some(x => x.god === 'DIRECT_OFFICER');
  const killingBound = effective.some(x => x.god === 'SEVEN_KILLINGS');
  const candidates = [];
  if (killingBound && !officerBound) candidates.push('REMOVE_KILLING_KEEP_OFFICER');
  if (officerBound && !killingBound) candidates.push('REMOVE_OFFICER_KEEP_KILLING');

  if (candidates.length === 1) {
    return {
      mixed:true,
      status:'PURIFICATION_CONFIRMED',
      route:candidates[0],
      candidates,
      binding,
      authority:'EFFECTIVE_UNCONTENDED_STEM_BINDING'
    };
  }

  return {
    mixed:true,
    status:reviewBinding.length ? 'PURIFICATION_REVIEW' : 'UNRESOLVED_MIXTURE',
    route:null,
    candidates,
    binding,
    reason: officerBound && killingBound
      ? 'BOTH_AUTHORITY_STEMS_EFFECTIVELY_BOUND'
      : reviewBinding.length
        ? 'ONLY_CONTENDED_BINDING_AVAILABLE'
        : 'NO_SINGLE_AUTHORITY_PURIFICATION'
  };
}

function relationMediation(pattern, strength, chart) {
  const resolution = strength.relationResolution?.monthCommandClash ?? { present:false, status:'NONE', clashes:[] };
  if (!resolution.present) {
    return { monthCommandClashed:false, status:'NONE', candidates:[], clashes:[] };
  }

  const candidates = [];
  for (const c of resolution.clashes) {
    for (const side of ['left','right']) {
      for (const m of (c.mediators?.[side] ?? [])) {
        candidates.push(`${m.type}_MEDIATION`);
      }
    }
  }

  return {
    monthCommandClashed:true,
    status:resolution.status,
    candidates:unique(candidates),
    clashes:resolution.clashes,
    authority:'RELATION_TRANSFORMATION_PROTO_V2_D7_R1'
  };
}

function add(arr, key, detail = null) {
  arr.push(detail ? { key, detail } : { key });
}
function keys(arr) { return arr.map(x => x.key); }

function mechanismsForBase(pattern, strength, purification, mediation) {
  const base = pattern.baseStructure.key;
  const support = [];
  const failure = [];
  const rescue = [];
  const review = [];
  const routes = [];

  const strong = STRONG_BANDS.has(strength.strengthBand);
  const weak = WEAK_BANDS.has(strength.strengthBand);
  const wealth = hasFamily(pattern,'WEALTH');
  const resource = hasFamily(pattern,'RESOURCE');
  const officer = hasFamily(pattern,'OFFICER');
  const killing = hasFamily(pattern,'KILLING');
  const eating = hasGod(pattern,'EATING_GOD');
  const hurting = hasGod(pattern,'HURTING_OFFICER');
  const peer = hasFamily(pattern,'PEER');

  // Cross-pattern semantic mechanisms retained independently from final formation.
  if (wealth && officer) add(support, 'WEALTH_GENERATES_OFFICER');
  if (wealth && (eating || hurting)) add(support, 'OUTPUT_GENERATES_WEALTH');
  if (killing && eating) add(support, 'EATING_GOD_CONTROLS_KILLING');
  if (killing && resource) add(support, 'KILLING_GENERATES_RESOURCE');
  if (hurting && resource && weak) add(support, 'HURTING_OFFICER_WITH_RESOURCE');
  if (hurting && officer) add(failure, 'HURTING_OFFICER_MEETS_OFFICER');
  if (eating && hasGod(pattern,'INDIRECT_RESOURCE')) add(failure, 'INDIRECT_RESOURCE_SEIZES_EATING_GOD');
  if (wealth && resource && hasVisibleFamily(pattern,'WEALTH') && hasVisibleFamily(pattern,'RESOURCE')) {
    add(review, 'WEALTH_RESOURCE_INTERFERENCE_POSITION_REQUIRED');
  }

  if (purification.mixed) {
    add(failure, 'OFFICER_KILLING_MIXED');
    if (purification.status === 'PURIFICATION_CONFIRMED') {
      add(rescue, 'AUTHORITY_PURIFIED_BY_EFFECTIVE_BINDING', purification.route);
    } else if (purification.status === 'PURIFICATION_REVIEW') {
      add(review, 'AUTHORITY_PURIFICATION_BINDING_REVIEW');
    }
  }

  if (mediation.monthCommandClashed) {
    add(failure, 'MONTH_COMMAND_UNDER_CLASH');
    if (mediation.status === 'MEDIATED_CONFIRMED') {
      add(rescue, 'MONTH_COMMAND_CLASH_MEDIATED_BY_RELATION');
    } else if (mediation.status === 'REVIEW') {
      add(review, 'MONTH_COMMAND_CLASH_MEDIATION_REVIEW');
    }
  }

  if (base === 'DIRECT_OFFICER') {
    if (wealth) add(routes, 'DIRECT_OFFICER_WITH_WEALTH');
    if (resource) add(routes, 'DIRECT_OFFICER_WITH_RESOURCE');
    if (hurting) add(failure, 'HURTING_OFFICER_ATTACKS_OFFICER');
    if (hurting && resource) add(rescue, 'RESOURCE_CONTROLS_HURTING_OFFICER_PROTECTS_OFFICER');
    if (purification.mixed && purification.status === 'PURIFICATION_REVIEW') {
      add(review, 'AUTHORITY_PURIFICATION_REQUIRES_BINDING_AUTHORITY');
    }
  }

  if (base === 'DIRECT_WEALTH' || base === 'INDIRECT_WEALTH') {
    if (eating || hurting) add(routes, 'OUTPUT_GENERATES_WEALTH_ROUTE');
    if (officer) add(routes, 'WEALTH_GENERATES_OFFICER_ROUTE');
    if (strong && peer) add(failure, 'PEER_ROB_COMPETES_FOR_WEALTH');
    if (strong && peer && (eating || hurting)) add(rescue, 'OUTPUT_TRANSFORMS_PEER_PRESSURE_INTO_WEALTH');
    if (strong && peer && officer) add(rescue, 'OFFICER_CONTROLS_PEER_PRESSURE');
    if (killing && !eating && !resource) add(failure, 'WEALTH_FEEDS_UNCONTROLLED_KILLING');
    if (killing && eating) add(rescue, 'EATING_GOD_CONTROLS_KILLING_PRESERVES_WEALTH');
  }

  if (base === 'DIRECT_RESOURCE' || base === 'INDIRECT_RESOURCE') {
    if (officer || killing) add(routes, 'AUTHORITY_GENERATES_RESOURCE_ROUTE');
    if (strong && (eating || hurting)) add(routes, 'STRONG_RESOURCE_WITH_OUTPUT_RELEASE_ROUTE');
    if (wealth) add(failure, 'WEALTH_CONTROLS_RESOURCE');
    if (wealth && peer) add(rescue, 'PEER_ROB_CONTROLS_WEALTH_PROTECTS_RESOURCE');
    if (wealth && stemBindingCandidates(pattern,strength).some(x => ['DIRECT_WEALTH','INDIRECT_WEALTH'].includes(x.god))) {
      add(review, 'WEALTH_BINDING_MAY_PRESERVE_RESOURCE');
    }
  }

  if (base === 'EATING_GOD') {
    if (wealth) add(routes, 'EATING_GOD_GENERATES_WEALTH_ROUTE');
    if (killing) add(routes, 'EATING_GOD_CONTROLS_KILLING_ROUTE');
    if (hasGod(pattern,'INDIRECT_RESOURCE')) add(failure, 'INDIRECT_RESOURCE_SEIZES_EATING_GOD');
    if (hasGod(pattern,'INDIRECT_RESOURCE') && wealth) add(rescue, 'WEALTH_CONTROLS_INDIRECT_RESOURCE_PROTECTS_EATING_GOD');
    if (hasGod(pattern,'INDIRECT_RESOURCE') && killing && !wealth) add(review, 'EATING_GOD_TO_KILLING_RESOURCE_STRUCTURE_SHIFT_REVIEW');
  }

  if (base === 'SEVEN_KILLINGS') {
    if (eating) add(routes, 'EATING_GOD_CONTROLS_KILLING_ROUTE');
    if (resource) add(routes, 'KILLING_RESOURCE_TRANSFORMATION_ROUTE');
    if (hurting && strong) add(routes, 'HURTING_OFFICER_CONTROLS_KILLING_CANDIDATE');
    if (wealth && !eating && !resource) add(failure, 'WEALTH_FEEDS_UNCONTROLLED_KILLING');
    if (weak && !resource) add(failure, 'WEAK_BODY_UNTRANSFORMED_KILLING_PRESSURE');
    if (resource) add(rescue, 'RESOURCE_TRANSFORMS_KILLING');
    if (eating) add(rescue, 'EATING_GOD_CONTROLS_KILLING');
  }

  if (base === 'HURTING_OFFICER') {
    if (wealth) add(routes, 'HURTING_OFFICER_GENERATES_WEALTH_ROUTE');
    if (resource && weak) add(routes, 'HURTING_OFFICER_WITH_RESOURCE_ROUTE');
    if (resource && !weak) add(review, 'RESOURCE_ROUTE_REQUIRES_WEAK_SIDE_CONFIRMATION');
    if (officer) add(failure, 'HURTING_OFFICER_MEETS_OFFICER');
    if (officer && resource) add(rescue, 'RESOURCE_MEDIATES_HURTING_OFFICER_OFFICER_CONFLICT');
    if (officer && wealth) add(review, 'WEALTH_MEDIATION_OF_HURTING_OFFICER_OFFICER_REQUIRES_POSITION_AUTHORITY');
    if (resource && strong) add(review, 'RESOURCE_ROUTE_WITH_STRONG_BODY_REQUIRES_REVIEW');
  }

  if (['JIAN_LU','YUE_JIE','YANG_REN'].includes(base)) {
    if (pattern.operationalResolution?.status === 'SELECTED') add(routes, pattern.operationalResolution.route);
    else if (pattern.operationalResolution?.status === 'REVIEW') add(review, 'MULTIPLE_OPERATIONAL_ROUTES');
    else add(review, 'PEER_MONTH_OPERATIONAL_ROUTE_UNRESOLVED');

    const route = pattern.operationalResolution?.route;
    if (route === 'OFFICER_ROUTE' && hurting) add(failure, 'PEER_MONTH_OFFICER_ROUTE_HURT_BY_HURTING_OFFICER');
    if (route === 'OFFICER_ROUTE' && hurting && resource) add(rescue, 'RESOURCE_PROTECTS_PEER_MONTH_OFFICER_ROUTE');
    if (route === 'WEALTH_ROUTE' && killing && !eating) add(failure, 'PEER_MONTH_WEALTH_ROUTE_EXPOSES_KILLING');
    if (route === 'KILLING_CONTROL_ROUTE' && resource) add(review, 'KILLING_CONTROL_AND_RESOURCE_BOTH_PRESENT_REQUIRES_PRIORITY_REVIEW');
  }

  return {
    routes:uniqueObjects(routes),
    support:uniqueObjects(support),
    failure:uniqueObjects(failure),
    rescue:uniqueObjects(rescue),
    review:uniqueObjects(review)
  };
}

function uniqueObjects(items) {
  const seen = new Set();
  return items.filter(x => {
    const k = `${x.key}|${x.detail ?? ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const RESCUE_COVERS = {
  AUTHORITY_PURIFIED_BY_EFFECTIVE_BINDING:['OFFICER_KILLING_MIXED'],
  MONTH_COMMAND_CLASH_MEDIATED_BY_RELATION:['MONTH_COMMAND_UNDER_CLASH'],
  RESOURCE_CONTROLS_HURTING_OFFICER_PROTECTS_OFFICER:['HURTING_OFFICER_ATTACKS_OFFICER','HURTING_OFFICER_MEETS_OFFICER'],
  OUTPUT_TRANSFORMS_PEER_PRESSURE_INTO_WEALTH:['PEER_ROB_COMPETES_FOR_WEALTH'],
  OFFICER_CONTROLS_PEER_PRESSURE:['PEER_ROB_COMPETES_FOR_WEALTH'],
  EATING_GOD_CONTROLS_KILLING_PRESERVES_WEALTH:['WEALTH_FEEDS_UNCONTROLLED_KILLING'],
  PEER_ROB_CONTROLS_WEALTH_PROTECTS_RESOURCE:['WEALTH_CONTROLS_RESOURCE'],
  WEALTH_CONTROLS_INDIRECT_RESOURCE_PROTECTS_EATING_GOD:['INDIRECT_RESOURCE_SEIZES_EATING_GOD'],
  RESOURCE_TRANSFORMS_KILLING:['WEAK_BODY_UNTRANSFORMED_KILLING_PRESSURE','WEALTH_FEEDS_UNCONTROLLED_KILLING'],
  EATING_GOD_CONTROLS_KILLING:['WEAK_BODY_UNTRANSFORMED_KILLING_PRESSURE','WEALTH_FEEDS_UNCONTROLLED_KILLING'],
  RESOURCE_MEDIATES_HURTING_OFFICER_OFFICER_CONFLICT:['HURTING_OFFICER_MEETS_OFFICER'],
  RESOURCE_PROTECTS_PEER_MONTH_OFFICER_ROUTE:['PEER_MONTH_OFFICER_ROUTE_HURT_BY_HURTING_OFFICER']
};

function resolveStage(mech, purification, mediation, pattern) {
  const failures = keys(mech.failure);
  const rescues = keys(mech.rescue);
  const covered = new Set();
  for (const r of rescues) for (const f of (RESCUE_COVERS[r] ?? [])) covered.add(f);

  const unresolvedFailures = failures.filter(f => !covered.has(f));
  const hasRoute = mech.routes.length > 0 || mech.support.length > 0;

  if (pattern.status === 'REVIEW' || mech.review.length > 0) {
    if (failures.length && unresolvedFailures.length === 0 && rescues.length && mech.review.length === 0) {
      return { stage:'RESCUED', unresolvedFailures:[] };
    }
    return { stage:'REVIEW', unresolvedFailures };
  }

  if (!failures.length) {
    return { stage:hasRoute ? 'FORMED' : 'UNRESOLVED', unresolvedFailures:[] };
  }
  if (unresolvedFailures.length === 0 && rescues.length) {
    return { stage:'RESCUED', unresolvedFailures:[] };
  }
  if (hasRoute && unresolvedFailures.length) {
    return { stage:'FORMED_WITH_FLAW', unresolvedFailures };
  }
  return { stage:'BROKEN', unresolvedFailures };
}

function variationResolution(pattern) {
  const candidates = pattern.variationCandidates ?? [];
  if (!candidates.length) return { status:'NONE', candidates:[] };
  if (candidates.length === 1) {
    return {
      status:'REVIEW_SINGLE_EXPOSED_SECONDARY_QI',
      candidates,
      authority:'NO_AUTO_PATTERN_CHANGE'
    };
  }
  return {
    status:'REVIEW_MULTIPLE_EXPOSED_SECONDARY_QI',
    candidates,
    authority:'NO_AUTO_PATTERN_CHANGE'
  };
}

export function resolvePattern(chart) {
  const strength = assessStrength(chart);
  const special = evaluateSpecialStructure(chart, strength);
  const pattern = assessPattern(chart, strength, special);

  if (pattern.normalPatternSuppressed) {
    return {
      version:PATTERN_RESOLUTION_VERSION,
      authorityStatus:'PROTOTYPE_NOT_FINAL',
      stage:'SPECIAL_STRUCTURE_PRECEDENCE',
      baseStructure:pattern.baseStructure,
      specialStructure:special.classification,
      pattern,
      strengthBand:strength.strengthBand,
      trace:[
        `BASE=${pattern.baseStructure.key}`,
        `SPECIAL_GATE=${special.strictGate}`,
        `SPECIAL=${special.classification}`,
        'NORMAL_RESOLUTION=SUPPRESSED'
      ]
    };
  }

  const purification = authorityPurification(pattern, strength);
  const mediation = relationMediation(pattern, strength, chart);
  const mechanisms = mechanismsForBase(pattern, strength, purification, mediation);
  const stageResult = resolveStage(mechanisms, purification, mediation, pattern);
  const variation = variationResolution(pattern);

  return {
    version:PATTERN_RESOLUTION_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    stage:stageResult.stage,
    strengthBand:strength.strengthBand,
    baseStructure:pattern.baseStructure,
    operationalPattern:pattern.operationalPattern,
    mechanisms,
    unresolvedFailures:stageResult.unresolvedFailures,
    authorityPurification:purification,
    relationMediation:mediation,
    relationResolution:strength.relationResolution,
    variationResolution:variation,
    pattern,
    trace:[
      `BASE=${pattern.baseStructure.key}`,
      `STRENGTH=${strength.strengthBand}`,
      `ROUTES=${keys(mechanisms.routes).join('|') || 'NONE'}`,
      `SUPPORT=${keys(mechanisms.support).join('|') || 'NONE'}`,
      `FAILURE=${keys(mechanisms.failure).join('|') || 'NONE'}`,
      `RESCUE=${keys(mechanisms.rescue).join('|') || 'NONE'}`,
      `REVIEW=${keys(mechanisms.review).join('|') || 'NONE'}`,
      `AUTHORITY_MIXED=${purification.mixed ? 'YES':'NO'}`,
      `PURIFICATION=${purification.route ?? purification.status}`,
      `MONTH_CLASH=${mediation.monthCommandClashed ? 'YES':'NO'}`,
      `MONTH_CLASH_STATUS=${mediation.status}`,
      `RELATION_STEM_TRANSFORM=${strength.relationResolution.stems.map(x=>`${x.candidateElement}:${x.transformationStatus}`).join('|') || 'NONE'}`,
      `VARIATION=${variation.status}`,
      `FINAL_STAGE=${stageResult.stage}`
    ]
  };
}
