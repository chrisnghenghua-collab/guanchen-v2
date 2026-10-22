export const RELATION_TRANSFORMATION_VERSION = 'GUANCHENG_RELATION_TRANSFORMATION_PROTO_V2_D7_R1';

const STEM_ELEMENT = {
  甲: 'WOOD', 乙: 'WOOD', 丙: 'FIRE', 丁: 'FIRE', 戊: 'EARTH',
  己: 'EARTH', 庚: 'METAL', 辛: 'METAL', 壬: 'WATER', 癸: 'WATER'
};

const BRANCH_MAIN_ELEMENT = {
  子:'WATER', 丑:'EARTH', 寅:'WOOD', 卯:'WOOD', 辰:'EARTH', 巳:'FIRE',
  午:'FIRE', 未:'EARTH', 申:'METAL', 酉:'METAL', 戌:'EARTH', 亥:'WATER'
};

const THREE_HARMONIES = [
  { branches:['申','子','辰'], element:'WATER', center:'子' },
  { branches:['亥','卯','未'], element:'WOOD', center:'卯' },
  { branches:['寅','午','戌'], element:'FIRE', center:'午' },
  { branches:['巳','酉','丑'], element:'METAL', center:'酉' }
];

const THREE_MEETINGS = [
  { branches:['亥','子','丑'], element:'WATER' },
  { branches:['寅','卯','辰'], element:'WOOD' },
  { branches:['巳','午','未'], element:'FIRE' },
  { branches:['申','酉','戌'], element:'METAL' }
];

const MUTUAL_PUNISHMENTS = [ ['子','卯'] ];
const THREE_PUNISHMENT_GROUPS = [
  { branches:['寅','巳','申'], label:'UNGRATEFUL_THREE_PUNISHMENT' },
  { branches:['丑','戌','未'], label:'POWER_THREE_PUNISHMENT' }
];
const SELF_PUNISHMENTS = new Set(['辰','午','酉','亥']);

function parsePillar(pillar) {
  if (!pillar || pillar.length < 2) throw new Error(`Invalid pillar: ${pillar}`);
  return { stem:pillar[0], branch:pillar[1] };
}

function chartParts(chart) {
  const p = {
    year:parsePillar(chart.year), month:parsePillar(chart.month),
    day:parsePillar(chart.day), hour:parsePillar(chart.hour)
  };
  return {
    pillars:p,
    branches:[
      { position:'YEAR_BRANCH', branch:p.year.branch },
      { position:'MONTH_BRANCH', branch:p.month.branch },
      { position:'DAY_BRANCH', branch:p.day.branch },
      { position:'HOUR_BRANCH', branch:p.hour.branch }
    ],
    stems:[
      { position:'YEAR_STEM', stem:p.year.stem },
      { position:'MONTH_STEM', stem:p.month.stem },
      { position:'DAY_STEM', stem:p.day.stem },
      { position:'HOUR_STEM', stem:p.hour.stem }
    ]
  };
}

function countPositionFacts(facts, position, keyA='a', keyB='b') {
  return facts.filter(f => f[keyA]?.position === position || f[keyB]?.position === position).length;
}

function fullAssemblySupportForElement(rawRelations, monthBranch, element) {
  return rawRelations.assemblies.some(a =>
    a.candidateElement === element && a.branches.includes(monthBranch)
  );
}

function evaluateStemFacts(chart, rawRelations) {
  const { pillars } = chartParts(chart);
  const monthElement = BRANCH_MAIN_ELEMENT[pillars.month.branch];
  return rawRelations.stemFacts.map((fact, index) => {
    const aCount = countPositionFacts(rawRelations.stemFacts, fact.a.position);
    const bCount = countPositionFacts(rawRelations.stemFacts, fact.b.position);
    const contended = aCount > 1 || bCount > 1;
    const includesDayStem = fact.a.position === 'DAY_STEM' || fact.b.position === 'DAY_STEM';
    const seasonalSupport = fact.candidateElement === monthElement;
    const assemblySupport = fullAssemblySupportForElement(rawRelations, pillars.month.branch, fact.candidateElement);

    let bindingStatus = 'EFFECTIVE_BINDING';
    if (contended) bindingStatus = 'CONTENDED_BINDING_REVIEW';

    let transformationStatus = 'NOT_CONFIRMED';
    let transformationReason = 'NO_STRICT_TRANSFORMATION_AUTHORITY';
    if (contended) {
      transformationStatus = 'REVIEW';
      transformationReason = 'CONTENDED_BINDING';
    } else if (!includesDayStem) {
      transformationStatus = 'NOT_APPLICABLE';
      transformationReason = 'STRICT_PROTO_ONLY_EVALUATES_DAY_STEM_TRANSFORMATION';
    } else if (seasonalSupport || assemblySupport) {
      transformationStatus = 'CONFIRMED';
      transformationReason = seasonalSupport
        ? 'DAY_STEM_COMBINATION_WITH_MONTH_COMMAND_SUPPORT'
        : 'DAY_STEM_COMBINATION_WITH_COMPLETE_ASSEMBLY_SUPPORT';
    } else {
      transformationStatus = 'REVIEW';
      transformationReason = 'DAY_STEM_COMBINATION_LACKS_STRICT_SEASON_OR_ASSEMBLY_SUPPORT';
    }

    return {
      index,
      type:'STEM_COMBINATION',
      a:fact.a,
      b:fact.b,
      candidateElement:fact.candidateElement,
      bindingStatus,
      transformationStatus,
      transformationReason,
      seasonalSupport,
      assemblySupport,
      includesDayStem
    };
  });
}

function evaluateSixCombinations(rawRelations) {
  const combos = rawRelations.branchFacts.filter(f => f.type === 'COMBINATION');
  return combos.map((fact, index) => {
    const aCount = countPositionFacts(combos, fact.a.position);
    const bCount = countPositionFacts(combos, fact.b.position);
    const contended = aCount > 1 || bCount > 1;
    return {
      index,
      type:'SIX_COMBINATION',
      a:fact.a,
      b:fact.b,
      bindingStatus:contended ? 'CONTENDED_BINDING_REVIEW' : 'EFFECTIVE_BINDING',
      transformationStatus:'NOT_CONFIRMED',
      reason:contended
        ? 'MULTIPLE_POSSIBLE_PARTNERS'
        : 'SIX_COMBINATION_CAN_BIND_OR_MEDIATE_WITHOUT_AUTO_TRANSFORMATION'
    };
  });
}

function branchPositionsByValue(chart) {
  const { branches } = chartParts(chart);
  const map = new Map();
  for (const item of branches) {
    if (!map.has(item.branch)) map.set(item.branch, []);
    map.get(item.branch).push(item.position);
  }
  return map;
}

function evaluateAssemblies(chart, rawRelations) {
  const positions = branchPositionsByValue(chart);
  return rawRelations.assemblies.map((a, index) => ({
    index,
    type:a.type,
    branches:a.branches,
    candidateElement:a.candidateElement,
    status:'FORMATION_CONFIRMED',
    memberPositions:a.branches.flatMap(b => positions.get(b) ?? []),
    preservesOriginalBranches:true
  }));
}

function partialAssemblyCandidates(chart, rawRelations) {
  const { branches } = chartParts(chart);
  const present = new Set(branches.map(x => x.branch));
  const fullKeys = new Set(rawRelations.assemblies.map(a => `${a.type}:${a.branches.join('')}`));
  const out = [];

  for (const h of THREE_HARMONIES) {
    const presentMembers = h.branches.filter(b => present.has(b));
    if (presentMembers.length !== 2) continue;
    if (fullKeys.has(`THREE_HARMONY:${h.branches.join('')}`)) continue;
    const includesCenter = presentMembers.includes(h.center);
    out.push({
      type:includesCenter ? 'HALF_HARMONY_CANDIDATE' : 'ARCH_HARMONY_CANDIDATE',
      branches:presentMembers,
      candidateElement:h.element,
      status:'REVIEW_NOT_FORMED'
    });
  }

  for (const m of THREE_MEETINGS) {
    const presentMembers = m.branches.filter(b => present.has(b));
    if (presentMembers.length !== 2) continue;
    if (fullKeys.has(`THREE_MEETING:${m.branches.join('')}`)) continue;
    out.push({
      type:'PARTIAL_MEETING_CANDIDATE',
      branches:presentMembers,
      candidateElement:m.element,
      status:'REVIEW_NOT_FORMED'
    });
  }

  return out;
}

function endpointMediators(position, six, assemblies) {
  const sixHits = six.filter(x =>
    x.bindingStatus === 'EFFECTIVE_BINDING' &&
    (x.a.position === position || x.b.position === position)
  ).map(x => ({ type:'SIX_COMBINATION', detail:x }));

  const assemblyHits = assemblies.filter(x => x.memberPositions.includes(position))
    .map(x => ({ type:x.type, detail:x }));

  const reviewHits = six.filter(x =>
    x.bindingStatus !== 'EFFECTIVE_BINDING' &&
    (x.a.position === position || x.b.position === position)
  ).map(x => ({ type:'SIX_COMBINATION_REVIEW', detail:x }));

  return { effective:[...sixHits, ...assemblyHits], review:reviewHits };
}

function evaluateClashes(rawRelations, six, assemblies) {
  const clashes = rawRelations.branchFacts.filter(f => f.type === 'CLASH');
  return clashes.map((fact, index) => {
    const left = endpointMediators(fact.a.position, six, assemblies);
    const right = endpointMediators(fact.b.position, six, assemblies);

    if (left.effective.length && right.effective.length) {
      return {
        index, type:'CLASH', a:fact.a, b:fact.b,
        status:'MULTI_RELATION_REVIEW',
        mediators:{ left:left.effective, right:right.effective },
        reason:'BOTH_CLASH_ENDPOINTS_ARE_BOUND_OR_ASSEMBLED'
      };
    }

    if (left.effective.length || right.effective.length) {
      return {
        index, type:'CLASH', a:fact.a, b:fact.b,
        status:'MEDIATED_CONFIRMED',
        mediators:{ left:left.effective, right:right.effective },
        reason:'ONE_CLASH_ENDPOINT_IS_EFFECTIVELY_BOUND_OR_IN_COMPLETE_ASSEMBLY'
      };
    }

    if (left.review.length || right.review.length) {
      return {
        index, type:'CLASH', a:fact.a, b:fact.b,
        status:'MEDIATION_REVIEW',
        mediators:{ left:left.review, right:right.review },
        reason:'ONLY_CONTENDED_BINDING_CANDIDATE_AVAILABLE'
      };
    }

    return {
      index, type:'CLASH', a:fact.a, b:fact.b,
      status:'ACTIVE', mediators:{ left:[], right:[] }, reason:'NO_MEDIATION'
    };
  });
}


function factTouchesPosition(fact, position) {
  if (fact.memberPositions) return fact.memberPositions.includes(position);
  return fact.a?.position === position || fact.b?.position === position;
}

function pairMediationStatus(a, b, six, assemblies) {
  const left = endpointMediators(a.position, six, assemblies);
  const right = endpointMediators(b.position, six, assemblies);
  if (left.effective.length && right.effective.length) {
    return {
      status:'MULTI_RELATION_REVIEW',
      mediators:{ left:left.effective, right:right.effective },
      reason:'BOTH_PUNISHMENT_ENDPOINTS_ARE_BOUND_OR_ASSEMBLED'
    };
  }
  if (left.effective.length || right.effective.length) {
    return {
      status:'MEDIATED_CONFIRMED',
      mediators:{ left:left.effective, right:right.effective },
      reason:'ONE_PUNISHMENT_ENDPOINT_IS_EFFECTIVELY_BOUND_OR_ASSEMBLED'
    };
  }
  if (left.review.length || right.review.length) {
    return {
      status:'MEDIATION_REVIEW',
      mediators:{ left:left.review, right:right.review },
      reason:'ONLY_CONTENDED_BINDING_CANDIDATE_AVAILABLE'
    };
  }
  return { status:'ACTIVE', mediators:{ left:[], right:[] }, reason:'NO_MEDIATION' };
}

function evaluatePunishments(chart, six, assemblies) {
  const { branches } = chartParts(chart);
  const out = [];

  // 子卯 mutual punishment is treated as a direct pair fact.
  for (const [x,y] of MUTUAL_PUNISHMENTS) {
    for (let i=0;i<branches.length;i++) {
      for (let j=i+1;j<branches.length;j++) {
        const a=branches[i], b=branches[j];
        if (!((a.branch===x && b.branch===y) || (a.branch===y && b.branch===x))) continue;
        const med = pairMediationStatus(a,b,six,assemblies);
        out.push({
          type:'PUNISHMENT', subtype:'MUTUAL', a, b,
          memberPositions:[a.position,b.position], ...med
        });
      }
    }
  }

  // Self-punishment requires the same self-punishing branch to appear in at least two pillar positions.
  for (const branch of SELF_PUNISHMENTS) {
    const hits = branches.filter(x => x.branch===branch);
    for (let i=0;i<hits.length;i++) {
      for (let j=i+1;j<hits.length;j++) {
        const a=hits[i], b=hits[j];
        const med = pairMediationStatus(a,b,six,assemblies);
        out.push({
          type:'PUNISHMENT', subtype:'SELF', branch, a, b,
          memberPositions:[a.position,b.position], ...med
        });
      }
    }
  }

  // 寅巳申 and 丑戌未 are conservative: only the complete three-branch set is confirmed.
  // Two members are retained as REVIEW rather than automatically promoted to a completed 三刑.
  for (const group of THREE_PUNISHMENT_GROUPS) {
    const hits = branches.filter(x => group.branches.includes(x.branch));
    const present = new Set(hits.map(x => x.branch));
    if (group.branches.every(b => present.has(b))) {
      const memberPositions = hits.map(x => x.position);
      const overlapping = memberPositions.flatMap(pos => endpointMediators(pos,six,assemblies).effective);
      out.push({
        type:'PUNISHMENT', subtype:'THREE_GROUP_COMPLETE', label:group.label,
        branches:group.branches, memberPositions,
        status:overlapping.length ? 'MULTI_RELATION_REVIEW' : 'ACTIVE_COMPLETE',
        mediators:overlapping,
        reason:overlapping.length
          ? 'COMPLETE_THREE_PUNISHMENT_OVERLAPS_EFFECTIVE_BINDING_OR_ASSEMBLY'
          : 'COMPLETE_THREE_PUNISHMENT_PRESENT'
      });
    } else if (present.size === 2) {
      out.push({
        type:'PUNISHMENT', subtype:'THREE_GROUP_PARTIAL', label:group.label,
        branches:[...present], memberPositions:hits.map(x => x.position),
        status:'REVIEW_PARTIAL_NOT_COMPLETE', mediators:[],
        reason:'STRICT_PROTO_REQUIRES_ALL_THREE_BRANCHES_FOR_CONFIRMED_THREE_PUNISHMENT'
      });
    }
  }
  return out;
}

function exactEffectiveSixBinding(fact, six) {
  return six.some(x =>
    x.bindingStatus === 'EFFECTIVE_BINDING' &&
    ((x.a.position===fact.a.position && x.b.position===fact.b.position) ||
     (x.a.position===fact.b.position && x.b.position===fact.a.position))
  );
}

function evaluateSecondaryModifiers(rawRelations, six, assemblies, type) {
  return rawRelations.branchFacts.filter(f => f.type===type).map((fact,index) => {
    const left = endpointMediators(fact.a.position,six,assemblies);
    const right = endpointMediators(fact.b.position,six,assemblies);
    const exactBinding = exactEffectiveSixBinding(fact,six);
    let status='ACTIVE_MODIFIER';
    let reason='SECONDARY_RELATION_RETAINED_WITHOUT_AUTO_CANCELLATION';
    if (type==='BREAK' && exactBinding) {
      status='BINDING_BREAK_COEXISTENCE_REVIEW';
      reason='SAME_BRANCH_PAIR_HAS_EFFECTIVE_LIUHE_AND_BREAK_RELATION';
    } else if (left.effective.length || right.effective.length || left.review.length || right.review.length) {
      status='COEXISTING_RELATION_REVIEW';
      reason='SECONDARY_RELATION_OVERLAPS_BINDING_OR_ASSEMBLY_WITHOUT_CANCELLATION_AUTHORITY';
    }
    return {
      index, type, a:fact.a, b:fact.b, status, reason,
      exactBinding,
      related:{ left:[...left.effective,...left.review], right:[...right.effective,...right.review] }
    };
  });
}

function relationRefsForPosition(position, six, assemblies, clashes, punishments, harms, breaks) {
  const refs=[];
  for (const x of six) if (factTouchesPosition(x,position)) refs.push({ family:'BINDING', status:x.bindingStatus, ref:x });
  for (const x of assemblies) if (factTouchesPosition(x,position)) refs.push({ family:'ASSEMBLY', status:x.status, ref:x });
  for (const x of clashes) if (factTouchesPosition(x,position)) refs.push({ family:'CLASH', status:x.status, ref:x });
  for (const x of punishments) if (factTouchesPosition(x,position)) refs.push({ family:'PUNISHMENT', status:x.status, ref:x });
  for (const x of harms) if (factTouchesPosition(x,position)) refs.push({ family:'HARM', status:x.status, ref:x });
  for (const x of breaks) if (factTouchesPosition(x,position)) refs.push({ family:'BREAK', status:x.status, ref:x });
  return refs;
}

function evaluatePositionStates(chart, six, assemblies, clashes, punishments, harms, breaks) {
  const { branches } = chartParts(chart);
  return branches.map(item => {
    const relations = relationRefsForPosition(item.position,six,assemblies,clashes,punishments,harms,breaks);
    const activePrimary=[];
    if (relations.some(x => x.family==='ASSEMBLY' && x.status==='FORMATION_CONFIRMED')) activePrimary.push('ASSEMBLY');
    if (relations.some(x => x.family==='BINDING' && x.status==='EFFECTIVE_BINDING')) activePrimary.push('BINDING');
    if (relations.some(x => x.family==='CLASH' && x.status==='ACTIVE')) activePrimary.push('CLASH');
    if (relations.some(x => x.family==='PUNISHMENT' && ['ACTIVE','ACTIVE_COMPLETE'].includes(x.status))) activePrimary.push('PUNISHMENT');
    const secondary = relations.filter(x => ['HARM','BREAK'].includes(x.family));
    const unresolved = relations.filter(x => String(x.status).includes('REVIEW'));

    let state='NONE';
    if (unresolved.length || activePrimary.length>1) state='MULTI_RELATION_REVIEW';
    else if (activePrimary.length===1) {
      if (activePrimary[0]==='ASSEMBLY') state='ASSEMBLY_DOMINANT';
      if (activePrimary[0]==='BINDING') state='BINDING_DOMINANT';
      if (activePrimary[0]==='CLASH') state=secondary.length ? 'CLASH_ACTIVE_WITH_MODIFIERS' : 'CLASH_ACTIVE';
      if (activePrimary[0]==='PUNISHMENT') state=secondary.length ? 'PUNISHMENT_ACTIVE_WITH_MODIFIERS' : 'PUNISHMENT_ACTIVE';
    } else if (secondary.length) state='SECONDARY_MODIFIER_ONLY';
    else if (relations.some(x => x.family==='CLASH' && x.status==='MEDIATED_CONFIRMED')) state='CONFLICT_MEDIATED';
    else if (relations.some(x => x.family==='PUNISHMENT' && x.status==='MEDIATED_CONFIRMED')) state='CONFLICT_MEDIATED';

    return {
      position:item.position, branch:item.branch, state,
      activePrimary, secondaryFamilies:[...new Set(secondary.map(x=>x.family))],
      relations
    };
  });
}

function monthCommandRelationSummary(positionStates, clashes, punishments, harms, breaks) {
  const state = positionStates.find(x => x.position==='MONTH_BRANCH');
  const touch = xs => xs.filter(x => factTouchesPosition(x,'MONTH_BRANCH'));
  return {
    status:state?.state ?? 'NONE',
    branch:state?.branch ?? null,
    clashes:touch(clashes),
    punishments:touch(punishments),
    harms:touch(harms),
    breaks:touch(breaks),
    authority:'D7_R1_MULTI_RELATION_PRECEDENCE_PROTO'
  };
}

function monthCommandClashResolution(clashes) {
  const relevant = clashes.filter(c =>
    c.a.position === 'MONTH_BRANCH' || c.b.position === 'MONTH_BRANCH'
  );
  if (!relevant.length) return { present:false, status:'NONE', clashes:[] };
  if (relevant.some(c => c.status === 'MULTI_RELATION_REVIEW' || c.status === 'MEDIATION_REVIEW')) {
    return { present:true, status:'REVIEW', clashes:relevant };
  }
  if (relevant.every(c => c.status === 'MEDIATED_CONFIRMED')) {
    return { present:true, status:'MEDIATED_CONFIRMED', clashes:relevant };
  }
  return { present:true, status:'ACTIVE', clashes:relevant };
}

export function resolveRelationTransformations(chart, rawRelations) {
  const stems = evaluateStemFacts(chart, rawRelations);
  const sixCombinations = evaluateSixCombinations(rawRelations);
  const assemblies = evaluateAssemblies(chart, rawRelations);
  const partialAssemblies = partialAssemblyCandidates(chart, rawRelations);
  const clashes = evaluateClashes(rawRelations, sixCombinations, assemblies);
  const punishments = evaluatePunishments(chart, sixCombinations, assemblies);
  const harms = evaluateSecondaryModifiers(rawRelations, sixCombinations, assemblies, 'HARM');
  const breaks = evaluateSecondaryModifiers(rawRelations, sixCombinations, assemblies, 'BREAK');
  const positionStates = evaluatePositionStates(chart, sixCombinations, assemblies, clashes, punishments, harms, breaks);
  const monthCommandClash = monthCommandClashResolution(clashes);
  const monthCommandRelations = monthCommandRelationSummary(positionStates, clashes, punishments, harms, breaks);

  return {
    version:RELATION_TRANSFORMATION_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    stems,
    sixCombinations,
    assemblies,
    partialAssemblies,
    clashes,
    punishments,
    harms,
    breaks,
    positionStates,
    monthCommandClash,
    monthCommandRelations,
    trace:[
      `STEM_BINDINGS=${stems.map(x=>`${x.a.stem}${x.b.stem}:${x.bindingStatus}`).join('|') || 'NONE'}`,
      `STEM_TRANSFORMATIONS=${stems.map(x=>`${x.candidateElement}:${x.transformationStatus}`).join('|') || 'NONE'}`,
      `SIX_COMBINATIONS=${sixCombinations.map(x=>`${x.a.branch}${x.b.branch}:${x.bindingStatus}`).join('|') || 'NONE'}`,
      `ASSEMBLIES=${assemblies.map(x=>`${x.type}:${x.candidateElement}:${x.status}`).join('|') || 'NONE'}`,
      `PARTIAL_ASSEMBLIES=${partialAssemblies.map(x=>`${x.type}:${x.candidateElement}`).join('|') || 'NONE'}`,
      `CLASHES=${clashes.map(x=>`${x.a.branch}${x.b.branch}:${x.status}`).join('|') || 'NONE'}`,
      `PUNISHMENTS=${punishments.map(x=>`${x.subtype}:${x.status}`).join('|') || 'NONE'}`,
      `HARMS=${harms.map(x=>`${x.a.branch}${x.b.branch}:${x.status}`).join('|') || 'NONE'}`,
      `BREAKS=${breaks.map(x=>`${x.a.branch}${x.b.branch}:${x.status}`).join('|') || 'NONE'}`,
      `POSITION_STATES=${positionStates.map(x=>`${x.position}:${x.state}`).join('|')}`,
      `MONTH_COMMAND_CLASH=${monthCommandClash.status}`,
      `MONTH_COMMAND_RELATIONS=${monthCommandRelations.status}`
    ]
  };
}

export function branchMainElement(branch) {
  return BRANCH_MAIN_ELEMENT[branch] ?? null;
}

export function stemElement(stem) {
  return STEM_ELEMENT[stem] ?? null;
}
