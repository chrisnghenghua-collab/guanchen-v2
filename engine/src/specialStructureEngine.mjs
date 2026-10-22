import { assessStrength } from './strengthEngine.mjs';

export const SPECIAL_STRUCTURE_VERSION = 'GUANCHENG_SPECIAL_STRUCTURE_STRICT_GATE_PROTO_V1';

const GENERATES = { WOOD: 'FIRE', FIRE: 'EARTH', EARTH: 'METAL', METAL: 'WATER', WATER: 'WOOD' };
const GENERATED_BY = Object.fromEntries(Object.entries(GENERATES).map(([a,b]) => [b,a]));

function weightFinding(f) {
  if (f.kind === 'VISIBLE_STEM') return 4;
  if (f.hiddenIndex === 0) return 3;
  if (f.hiddenIndex === 1) return 2;
  return 1;
}

function rootWeight(root) {
  if (root.rank === 'PRIMARY_ROOT') return 3;
  if (root.rank === 'SECONDARY_ROOT') return 2;
  return 1;
}

function sumBy(items, selector) {
  return items.reduce((acc, item) => acc + selector(item), 0);
}

function weakDominance(assessment) {
  const scores = { OUTPUT:0, WEALTH:0, OFFICER:0 };
  for (const f of assessment.opposingFindings) scores[f.relation] += weightFinding(f);
  const total = Object.values(scores).reduce((a,b) => a+b, 0);
  const ordered = Object.entries(scores).sort((a,b) => b[1]-a[1]);
  const [topName, topScore] = ordered[0];
  const secondScore = ordered[1][1];
  return {
    scores,
    total,
    top:topName,
    topScore,
    secondScore,
    topShare: total ? topScore / total : 0,
    dominanceRatio: secondScore ? topScore / secondScore : (topScore ? Infinity : 0)
  };
}

function strongDominance(assessment) {
  const peerScore = sumBy(assessment.roots, rootWeight) +
    sumBy(assessment.supportFindings.filter(x => x.relation === 'PEER'), weightFinding);
  const resourceScore = sumBy(assessment.supportFindings.filter(x => x.relation === 'RESOURCE'), weightFinding);
  const total = peerScore + resourceScore;
  return {
    peerScore,
    resourceScore,
    total,
    peerShare: total ? peerScore/total : 0,
    resourceShare: total ? resourceScore/total : 0
  };
}

function supportiveAssemblyBreaks(assessment) {
  const day = assessment.dayMaster.element;
  const resource = GENERATED_BY[day];
  const supporting = new Set([day, resource]);
  const reasons = [];
  for (const a of assessment.relations.assemblies) {
    if (supporting.has(a.candidateElement)) reasons.push(`SUPPORTING_${a.type}_CANDIDATE_${a.candidateElement}`);
  }
  for (const s of assessment.relations.stemFacts) {
    if (supporting.has(s.candidateElement)) reasons.push(`SUPPORTING_STEM_COMBINATION_CANDIDATE_${s.candidateElement}`);
  }
  return reasons;
}

function evaluateStrong(assessment) {
  const breaks = [];
  if (assessment.strengthBand !== 'VERY_STRONG') breaks.push('NOT_VERY_STRONG');
  if (assessment.rootLevel !== 'HIGH') breaks.push('ROOT_NOT_HIGH');
  if (assessment.supportLevel !== 'HIGH') breaks.push('SUPPORT_NOT_HIGH');
  if (assessment.opposingLevel !== 'LOW') breaks.push('OPPOSING_FLOW_PRESENT');
  if (assessment.effectiveCounterforce) breaks.push('EFFECTIVE_COUNTERFORCE_PRESENT');

  const dominance = strongDominance(assessment);
  if (breaks.length) {
    return {
      strictGate:'FAIL',
      status:'REJECTED',
      classification:null,
      chineseLabel:null,
      breakConditions:breaks,
      dominance
    };
  }

  if (dominance.peerScore >= dominance.resourceScore * 1.4) {
    return {
      strictGate:'PASS', status:'CLASSIFIED',
      classification:'FOLLOW_PROSPEROUS', chineseLabel:'从旺',
      breakConditions:[], dominance
    };
  }
  if (dominance.resourceScore >= dominance.peerScore * 1.4) {
    return {
      strictGate:'PASS', status:'CLASSIFIED',
      classification:'FOLLOW_STRONG', chineseLabel:'从强',
      breakConditions:[], dominance
    };
  }
  return {
    strictGate:'REVIEW', status:'AMBIGUOUS',
    classification:null, chineseLabel:null,
    breakConditions:['PEER_RESOURCE_DOMINANCE_AMBIGUOUS'], dominance
  };
}

function evaluateWeak(assessment) {
  const breaks = [];
  const hasAnyRoot = assessment.roots.length > 0;
  const hasAnySupport = assessment.supportFindings.length > 0;
  if (hasAnyRoot) breaks.push('ANY_DAYMASTER_ROOT_BREAKS_STRICT_FOLLOW_WEAK');
  if (hasAnySupport) breaks.push('ANY_PEER_OR_RESOURCE_SUPPORT_BREAKS_STRICT_FOLLOW_WEAK');
  if (['WANG','XIANG'].includes(assessment.seasonState)) breaks.push('SEASON_SUPPORTS_DAYMASTER');
  breaks.push(...supportiveAssemblyBreaks(assessment));

  const dominance = weakDominance(assessment);
  const outputPurityException = assessment.strengthBand === 'WEAK' &&
    dominance.top === 'OUTPUT' && dominance.topShare >= 0.65 && dominance.dominanceRatio >= 1.8;
  const eligibleBand = assessment.strengthBand === 'VERY_WEAK' || outputPurityException;
  if (!eligibleBand) breaks.push('NOT_STRICT_WEAK_ELIGIBLE');

  if (breaks.length) {
    return {
      strictGate:'FAIL', status:'REJECTED',
      classification:null, chineseLabel:null,
      breakConditions:[...new Set(breaks)], dominance,
      outputPurityException
    };
  }

  // Specific following structures require a clearly dominant opposing pathway.
  if (dominance.topShare >= 0.58 && dominance.dominanceRatio >= 1.5) {
    const map = {
      OUTPUT:['FOLLOW_OUTPUT','从儿'],
      WEALTH:['FOLLOW_WEALTH','从财'],
      OFFICER:['FOLLOW_OFFICER','从官杀']
    };
    const [classification, chineseLabel] = map[dominance.top];
    return {
      strictGate:'PASS', status:'CLASSIFIED',
      classification, chineseLabel,
      breakConditions:[], dominance,
      outputPurityException
    };
  }

  // Mixed weak charts are intentionally not auto-labelled “从弱”. The false-positive
  // cost is too high; keep them for manual / later Authority review.
  return {
    strictGate:'REVIEW', status:'AMBIGUOUS',
    classification:'FOLLOW_WEAK_CANDIDATE', chineseLabel:'从弱候选',
    breakConditions:['NO_SINGLE_DOMINANT_FOLLOW_PATH'], dominance,
    outputPurityException
  };
}

export function evaluateSpecialStructure(chart, precomputedAssessment = null) {
  const assessment = precomputedAssessment ?? assessStrength(chart);
  const extremeOrWeakInspection = ['VERY_STRONG','VERY_WEAK','WEAK'].includes(assessment.strengthBand);

  let result;
  if (assessment.strengthBand === 'VERY_STRONG') result = evaluateStrong(assessment);
  else if (['VERY_WEAK','WEAK'].includes(assessment.strengthBand)) result = evaluateWeak(assessment);
  else {
    result = {
      strictGate:'NOT_APPLICABLE', status:'NORMAL_STRUCTURE',
      classification:null, chineseLabel:null,
      breakConditions:['NORMAL_STRENGTH_BAND'], dominance:null
    };
  }

  return {
    version:SPECIAL_STRUCTURE_VERSION,
    strengthVersion:assessment.version,
    inspected:extremeOrWeakInspection,
    strengthBand:assessment.strengthBand,
    dayMaster:assessment.dayMaster,
    ...result,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    trace:[
      `STRENGTH_BAND=${assessment.strengthBand}`,
      `SEASON=${assessment.seasonState}`,
      `ROOT_LEVEL=${assessment.rootLevel}`,
      `ROOT_COUNT=${assessment.roots.length}`,
      `SUPPORT_LEVEL=${assessment.supportLevel}`,
      `SUPPORT_COUNT=${assessment.supportFindings.length}`,
      `OPPOSING_LEVEL=${assessment.opposingLevel}`,
      `COUNTERFORCE=${assessment.effectiveCounterforce ? 'YES':'NO'}`,
      `STRICT_GATE=${result.strictGate}`,
      `STATUS=${result.status}`,
      `CLASSIFICATION=${result.classification ?? 'NONE'}`,
      `BREAKS=${result.breakConditions?.join('|') || 'NONE'}`
    ]
  };
}
