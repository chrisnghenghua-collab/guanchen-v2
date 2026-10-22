import { assessTimingActivation } from './timingActivationEngine.mjs';
import { assessStrength } from './strengthEngine.mjs';

export const TIMING_RELATION_RESOLUTION_VERSION = 'GUANCHENG_TIMING_RELATION_RESOLUTION_PROTO_V1_D8_R1';

const LAYER_RANK = { NATAL:0, DAYUN:1, YEAR:2 };
const PRIMARY_TYPES = new Set(['CLASH','PUNISHMENT','BINDING','ASSEMBLY']);

function scopeFromPosition(position, fallback='NATAL') {
  if (position?.startsWith('DAYUN_')) return 'DAYUN';
  if (position?.startsWith('YEAR_')) return 'YEAR';
  return fallback;
}

function endpointFromTarget(target) {
  const scope = target.scope ?? scopeFromPosition(target.position,'NATAL');
  return { scope, position:target.position, value:target.value };
}

function endpointFromSource(fact, kind='BRANCH') {
  return {
    scope:fact.layer,
    position:`${fact.layer}_${kind}`,
    value:fact.source.value
  };
}

function endpointKey(e) { return `${e.scope}:${e.position}`; }
function pairEndpointKey(a,b) { return [endpointKey(a),endpointKey(b)].sort().join('|'); }
function sameEndpoint(a,b) { return endpointKey(a)===endpointKey(b); }

function canonicalTimingFacts(activation) {
  const stemBindings=[];
  const branchBindings=[];
  const clashes=[];
  const harms=[];
  const breaks=[];
  const pairPunishments=[];
  const repeats=[];

  for (const layer of activation.layers) {
    for (const f of layer.relationFacts) {
      if (f.type==='PILLAR_REPEAT_FACT' || f.type==='BRANCH_REPEAT_FACT') {
        repeats.push({ originLayer:f.layer, type:f.type, source:endpointFromSource(f, f.type==='PILLAR_REPEAT_FACT'?'PILLAR':'BRANCH'), target:endpointFromTarget(f.target), status:'FACT_ONLY' });
        continue;
      }
      const isStem=f.type==='STEM_COMBINATION_TRIGGER';
      const source=endpointFromSource(f,isStem?'STEM':'BRANCH');
      const target=endpointFromTarget(f.target);
      const base={ originLayer:f.layer, source, target, sourceLayerRank:LAYER_RANK[f.layer], pairKey:pairEndpointKey(source,target) };
      if (f.type==='STEM_COMBINATION_TRIGGER') stemBindings.push({...base,type:'STEM_BINDING',candidateElement:f.candidateElement});
      if (f.type==='SIX_COMBINATION_TRIGGER') branchBindings.push({...base,type:'SIX_COMBINATION'});
      if (f.type==='BRANCH_CLASH_TRIGGER') clashes.push({...base,type:'CLASH'});
      if (f.type==='HARM_TRIGGER') harms.push({...base,type:'HARM'});
      if (f.type==='BREAK_TRIGGER') breaks.push({...base,type:'BREAK'});
      if (['MUTUAL_PUNISHMENT_TRIGGER','SELF_PUNISHMENT_TRIGGER','THREE_PUNISHMENT_PARTIAL_TRIGGER'].includes(f.type)) {
        pairPunishments.push({...base,type:'PUNISHMENT',subtype:f.type,status:f.status});
      }
    }
  }
  return { stemBindings, branchBindings, clashes, harms, breaks, pairPunishments, repeats };
}

function natalBranchEndpoint(x) {
  return { scope:'NATAL', position:x.position, value:x.branch };
}
function natalStemEndpoint(x) {
  return { scope:'NATAL', position:x.position, value:x.stem };
}

function natalResolvedFacts(strength) {
  const rr=strength.relationResolution;
  const stems=rr.stems.map(x=>({
    originLayer:'NATAL', type:'STEM_BINDING',
    source:natalStemEndpoint(x.a), target:natalStemEndpoint(x.b),
    pairKey:pairEndpointKey(natalStemEndpoint(x.a),natalStemEndpoint(x.b)),
    candidateElement:x.candidateElement,
    bindingStatus:x.bindingStatus,
    transformationStatus:x.transformationStatus,
    baseStatus:x.bindingStatus
  }));
  const branchBindings=rr.sixCombinations.map(x=>({
    originLayer:'NATAL', type:'SIX_COMBINATION',
    source:natalBranchEndpoint(x.a), target:natalBranchEndpoint(x.b),
    pairKey:pairEndpointKey(natalBranchEndpoint(x.a),natalBranchEndpoint(x.b)),
    bindingStatus:x.bindingStatus,
    baseStatus:x.bindingStatus
  }));
  const assemblies=rr.assemblies.map(x=>({
    originLayer:'NATAL', type:x.type, candidateElement:x.candidateElement,
    status:'FORMATION_CONFIRMED', memberEndpoints:x.memberPositions.map((position,i)=>({
      scope:'NATAL', position, value:x.branches[i] ?? null
    })),
    branches:x.branches,
    baseStatus:x.status
  }));
  const clashes=rr.clashes.map(x=>({
    originLayer:'NATAL', type:'CLASH', source:natalBranchEndpoint(x.a), target:natalBranchEndpoint(x.b),
    pairKey:pairEndpointKey(natalBranchEndpoint(x.a),natalBranchEndpoint(x.b)), baseStatus:x.status
  }));
  const punishments=rr.punishments.map(x=>({
    originLayer:'NATAL', type:'PUNISHMENT', subtype:x.subtype,
    source:x.a ? natalBranchEndpoint(x.a) : null,
    target:x.b ? natalBranchEndpoint(x.b) : null,
    memberEndpoints:(x.memberPositions ?? []).map((position,i)=>({scope:'NATAL',position,value:x.branches?.[i] ?? x.branch ?? null})),
    baseStatus:x.status
  }));
  const harms=rr.harms.map(x=>({ originLayer:'NATAL', type:'HARM', source:natalBranchEndpoint(x.a), target:natalBranchEndpoint(x.b), baseStatus:x.status }));
  const breaks=rr.breaks.map(x=>({ originLayer:'NATAL', type:'BREAK', source:natalBranchEndpoint(x.a), target:natalBranchEndpoint(x.b), baseStatus:x.status }));
  return { stems, branchBindings, assemblies, clashes, punishments, harms, breaks };
}

function timingAssemblies(activation) {
  const out=[];
  for (const layer of activation.layers) {
    for (const a of layer.assemblyCompletions) {
      const memberEndpoints=(a.sources ?? []).map(endpointFromTarget);
      memberEndpoints.push({scope:layer.layer,position:`${layer.layer}_BRANCH`,value:a.completedBy});
      out.push({
        originLayer:layer.layer, type:a.type.replace('_COMPLETION',''), candidateElement:a.candidateElement,
        branches:a.branches, status:'FORMATION_COMPLETED_BY_TIMING', memberEndpoints,
        completedByLayer:layer.layer
      });
    }
  }
  return out;
}

function timingPunishmentCompletions(activation) {
  const out=[];
  for (const layer of activation.layers) {
    for (const p of layer.punishmentCompletions) {
      const memberEndpoints=(p.sources ?? []).map(endpointFromTarget);
      memberEndpoints.push({scope:layer.layer,position:`${layer.layer}_BRANCH`,value:p.completedBy});
      out.push({
        originLayer:layer.layer, type:'PUNISHMENT', subtype:'THREE_GROUP_COMPLETE',
        branches:p.branches, memberEndpoints, baseStatus:'COMPLETED_BY_TIMING_LAYER'
      });
    }
  }
  return out;
}

function endpointCounts(facts) {
  const map=new Map();
  for (const f of facts) {
    for (const e of [f.source,f.target]) {
      if (!e) continue;
      const k=endpointKey(e);
      map.set(k,(map.get(k)??0)+1);
    }
  }
  return map;
}

function resolveBindings(natalFacts, timingFacts, family) {
  const all=[...natalFacts,...timingFacts];
  const counts=endpointCounts(all);
  return all.map(f=>{
    if (f.originLayer==='NATAL') return {
      ...f,
      family,
      bindingStatus:f.bindingStatus ?? f.baseStatus,
      timingResolution:'NATAL_BASE_PRESERVED'
    };
    const contended=(counts.get(endpointKey(f.source))??0)>1 || (counts.get(endpointKey(f.target))??0)>1;
    return {
      ...f,
      family,
      bindingStatus:contended?'CONTENDED_BINDING_REVIEW':'EFFECTIVE_BINDING_TRIGGER',
      transformationStatus:'NOT_CONFIRMED_TIMING_LAYER',
      timingResolution:contended?'REVIEW':'EFFECTIVE_BINDING_ONLY'
    };
  });
}

function bindingTouches(b,e) { return sameEndpoint(b.source,e) || sameEndpoint(b.target,e); }
function assemblyTouches(a,e) { return a.memberEndpoints.some(x=>sameEndpoint(x,e)); }
function isEffectiveBinding(b) { return ['EFFECTIVE_BINDING','EFFECTIVE_BINDING_TRIGGER'].includes(b.bindingStatus); }
function isReviewBinding(b) { return String(b.bindingStatus).includes('REVIEW'); }

function endpointMediators(e, bindings, assemblies) {
  const effective=[];
  const review=[];
  for (const b of bindings) {
    if (!bindingTouches(b,e)) continue;
    (isEffectiveBinding(b)?effective:review).push({family:'SIX_COMBINATION',originLayer:b.originLayer,detail:b});
  }
  for (const a of assemblies) {
    if (assemblyTouches(a,e)) effective.push({family:'ASSEMBLY',originLayer:a.originLayer,detail:a});
  }
  return { effective, review };
}

function mediatorScopes(mediator) {
  const d=mediator.detail ?? {};
  const scopes=new Set();
  if (d.source?.scope) scopes.add(d.source.scope);
  if (d.target?.scope) scopes.add(d.target.scope);
  for (const e of d.memberEndpoints ?? []) if (e.scope) scopes.add(e.scope);
  if (mediator.originLayer) scopes.add(mediator.originLayer);
  return scopes;
}

function mediatorReason(clashOrigin, mediators) {
  const scopes=new Set();
  for (const m of mediators) for (const s of mediatorScopes(m)) scopes.add(s);
  if (clashOrigin==='DAYUN' && scopes.has('YEAR')) return 'MEDIATED_BY_YEAR_TRIGGER';
  if (clashOrigin==='YEAR' && scopes.has('DAYUN')) return 'YEAR_TRIGGER_MEDIATED_BY_DAYUN_ENVIRONMENT';
  if (clashOrigin==='NATAL' && scopes.has('YEAR')) return 'NATAL_RELATION_MEDIATED_BY_YEAR_TRIGGER';
  if (clashOrigin==='NATAL' && scopes.has('DAYUN')) return 'NATAL_RELATION_MEDIATED_BY_DAYUN_ENVIRONMENT';
  return 'MEDIATED_WITHIN_ACTIVE_TIMING_GRAPH';
}

function resolveClashes(natalClashes, timingClashes, bindings, assemblies) {
  return [...natalClashes,...timingClashes].map(c=>{
    const left=endpointMediators(c.source,bindings,assemblies);
    const right=endpointMediators(c.target,bindings,assemblies);
    const timingMediators=[...left.effective,...right.effective].filter(x=>x.originLayer!=='NATAL');
    const review=[...left.review,...right.review];

    // Preserve a natal static mediation unless timing creates a new ambiguity.
    if (c.originLayer==='NATAL' && c.baseStatus==='MEDIATED_CONFIRMED' && !review.length && !timingMediators.length) {
      return {...c,status:'MEDIATED_CONFIRMED',reason:'NATAL_BASE_MEDIATION_PRESERVED',mediators:{left:left.effective,right:right.effective}};
    }
    if (left.effective.length && right.effective.length) {
      return {...c,status:'MULTI_RELATION_REVIEW',reason:'BOTH_CLASH_ENDPOINTS_BOUND_OR_ASSEMBLED',mediators:{left:left.effective,right:right.effective}};
    }
    if (left.effective.length || right.effective.length) {
      const eff=[...left.effective,...right.effective];
      return {...c,status:'MEDIATED_CONFIRMED',reason:mediatorReason(c.originLayer,eff),mediators:{left:left.effective,right:right.effective}};
    }
    if (review.length) {
      return {...c,status:'MEDIATION_REVIEW',reason:'ONLY_CONTENDED_BINDING_AVAILABLE',mediators:{left:left.review,right:right.review}};
    }
    return {...c,status:'ACTIVE',reason:'NO_EFFECTIVE_MEDIATOR',mediators:{left:[],right:[]}};
  });
}

function resolvePunishments(natalPunishments, timingPairPunishments, timingCompletePunishments, bindings, assemblies) {
  const all=[...natalPunishments,...timingPairPunishments,...timingCompletePunishments];
  return all.map(p=>{
    if (p.subtype==='THREE_PUNISHMENT_PARTIAL_TRIGGER') return {...p,status:'REVIEW_PARTIAL_NOT_COMPLETE',reason:'STRICT_COMPLETE_SET_REQUIRED'};
    const endpoints=p.memberEndpoints?.length ? p.memberEndpoints : [p.source,p.target].filter(Boolean);
    const mediators=endpoints.flatMap(e=>endpointMediators(e,bindings,assemblies).effective);
    const review=endpoints.flatMap(e=>endpointMediators(e,bindings,assemblies).review);
    if (p.subtype==='THREE_GROUP_COMPLETE' && mediators.length) {
      return {...p,status:'MULTI_RELATION_REVIEW',reason:'COMPLETE_PUNISHMENT_OVERLAPS_EFFECTIVE_BINDING_OR_ASSEMBLY',mediators};
    }
    if (mediators.length>1) return {...p,status:'MULTI_RELATION_REVIEW',reason:'MULTIPLE_PUNISHMENT_MEDIATORS',mediators};
    if (mediators.length===1) {
      return {...p,status:'MEDIATED_CONFIRMED',reason:mediatorReason(p.originLayer,mediators),mediators};
    }
    if (review.length) return {...p,status:'MEDIATION_REVIEW',reason:'ONLY_CONTENDED_BINDING_AVAILABLE',mediators:review};
    if (p.originLayer==='NATAL' && p.baseStatus && String(p.baseStatus).includes('REVIEW')) return {...p,status:p.baseStatus,reason:'NATAL_BASE_REVIEW_PRESERVED',mediators:[]};
    return {...p,status:p.subtype==='THREE_GROUP_COMPLETE'?'ACTIVE_COMPLETE':'ACTIVE',reason:'NO_EFFECTIVE_MEDIATOR',mediators:[]};
  });
}

function exactEffectiveBinding(source,target,bindings) {
  return bindings.some(b=>isEffectiveBinding(b) && pairEndpointKey(b.source,b.target)===pairEndpointKey(source,target));
}

function resolveSecondary(natalFacts, timingFacts, bindings, assemblies, type) {
  return [...natalFacts,...timingFacts].map(f=>{
    const left=endpointMediators(f.source,bindings,assemblies);
    const right=endpointMediators(f.target,bindings,assemblies);
    const exact=type==='BREAK' && exactEffectiveBinding(f.source,f.target,bindings);
    if (exact) return {...f,status:'BINDING_BREAK_COEXISTENCE_REVIEW',reason:'SAME_PAIR_HAS_EFFECTIVE_LIUHE_AND_BREAK'};
    if (left.effective.length || right.effective.length || left.review.length || right.review.length) {
      return {...f,status:'COEXISTING_RELATION_REVIEW',reason:'SECONDARY_RELATION_OVERLAPS_BINDING_OR_ASSEMBLY'};
    }
    return {...f,status:'ACTIVE_MODIFIER',reason:'SECONDARY_RELATION_RETAINED'};
  });
}

function relationTouchesEndpoint(r,e) {
  if (r.source && sameEndpoint(r.source,e)) return true;
  if (r.target && sameEndpoint(r.target,e)) return true;
  if (r.memberEndpoints?.some(x=>sameEndpoint(x,e))) return true;
  return false;
}

function endpointUniverse(chart, activation) {
  const parse=p=>({stem:p[0],branch:p[1]});
  const y=parse(chart.year),m=parse(chart.month),d=parse(chart.day),h=parse(chart.hour);
  const out=[
    {scope:'NATAL',position:'YEAR_BRANCH',value:y.branch},
    {scope:'NATAL',position:'MONTH_BRANCH',value:m.branch},
    {scope:'NATAL',position:'DAY_BRANCH',value:d.branch},
    {scope:'NATAL',position:'HOUR_BRANCH',value:h.branch}
  ];
  for (const l of activation.layers) out.push({scope:l.layer,position:`${l.layer}_BRANCH`,value:l.branch});
  return out;
}

function positionStates(chart, activation, bindings, assemblies, clashes, punishments, harms, breaks) {
  return endpointUniverse(chart,activation).map(e=>{
    const refs=[];
    for (const b of bindings) if (relationTouchesEndpoint(b,e)) refs.push({family:'BINDING',status:b.bindingStatus,ref:b});
    for (const a of assemblies) if (relationTouchesEndpoint(a,e)) refs.push({family:'ASSEMBLY',status:a.status,ref:a});
    for (const c of clashes) if (relationTouchesEndpoint(c,e)) refs.push({family:'CLASH',status:c.status,ref:c});
    for (const p of punishments) if (relationTouchesEndpoint(p,e)) refs.push({family:'PUNISHMENT',status:p.status,ref:p});
    for (const x of harms) if (relationTouchesEndpoint(x,e)) refs.push({family:'HARM',status:x.status,ref:x});
    for (const x of breaks) if (relationTouchesEndpoint(x,e)) refs.push({family:'BREAK',status:x.status,ref:x});
    const unresolved=refs.filter(x=>String(x.status).includes('REVIEW'));
    const activePrimary=refs.filter(x=>PRIMARY_TYPES.has(x.family) && ['ACTIVE','ACTIVE_COMPLETE','EFFECTIVE_BINDING','EFFECTIVE_BINDING_TRIGGER','FORMATION_CONFIRMED','FORMATION_COMPLETED_BY_TIMING'].includes(x.status));
    const mediated=refs.filter(x=>x.status==='MEDIATED_CONFIRMED');
    const secondary=refs.filter(x=>['HARM','BREAK'].includes(x.family));
    let state='NONE';
    if (unresolved.length || activePrimary.length>1) state='MULTI_RELATION_REVIEW';
    else if (activePrimary.length===1) state=`${activePrimary[0].family}_ACTIVE`;
    else if (mediated.length) state='CONFLICT_MEDIATED';
    else if (secondary.length) state='SECONDARY_MODIFIER_ONLY';
    return {...e,state,relations:refs};
  });
}

function crossLayerSignals(activation, clashes, assemblies, stemBindings, branchBindings) {
  const out=[];
  for (const c of clashes) {
    if (c.originLayer==='DAYUN' && c.status==='MEDIATED_CONFIRMED' && c.reason==='MEDIATED_BY_YEAR_TRIGGER') {
      out.push({key:'YEAR_MEDIATES_DAYUN_CLASH',status:'MODIFIES_ENVIRONMENT_NOT_ERASES'});
    }
    if (c.originLayer==='YEAR' && c.status==='MEDIATED_CONFIRMED' && c.reason==='YEAR_TRIGGER_MEDIATED_BY_DAYUN_ENVIRONMENT') {
      out.push({key:'DAYUN_MEDIATES_YEAR_CLASH',status:'ENVIRONMENT_CONDITIONS_TRIGGER'});
    }
  }
  for (const a of assemblies) {
    if (a.originLayer==='YEAR' && a.memberEndpoints.some(x=>x.scope==='DAYUN') && a.memberEndpoints.some(x=>x.scope==='NATAL')) {
      out.push({key:'YEAR_COMPLETES_NATAL_DAYUN_ASSEMBLY',status:'COMPLETED_BY_YEAR_TRIGGER'});
    }
  }
  const allBindings=[...stemBindings,...branchBindings];
  if (allBindings.some(x=>x.originLayer==='YEAR' && String(x.bindingStatus).includes('CONTENDED'))) {
    out.push({key:'YEAR_CREATES_BINDING_CONTENTION',status:'REVIEW'});
  }

  // Same natal endpoint clashed by both Dayun and Year is reinforcement/review, never automatic good/bad.
  const natalTargets=new Map();
  for (const c of clashes.filter(x=>x.originLayer!=='NATAL')) {
    for (const e of [c.source,c.target].filter(x=>x.scope==='NATAL')) {
      const k=endpointKey(e);
      if (!natalTargets.has(k)) natalTargets.set(k,[]);
      natalTargets.get(k).push(c.originLayer);
    }
  }
  for (const [position,layers] of natalTargets) {
    if (layers.includes('DAYUN') && layers.includes('YEAR')) out.push({
      key:'STACKED_CLASH_ON_SAME_NATAL_POSITION', target:position,
      status:'REINFORCED_REVIEW_NOT_AUTO_GOOD_BAD'
    });
  }

  // Dedupe by key+target.
  const seen=new Set();
  return out.filter(x=>{const k=`${x.key}:${x.target??''}`; if(seen.has(k))return false; seen.add(k); return true;});
}

export function resolveTimingRelations(chart, timing={}) {
  const activation=assessTimingActivation(chart,timing);
  const strength=assessStrength(chart);
  const natal=natalResolvedFacts(strength);
  const raw=canonicalTimingFacts(activation);

  const stemBindings=resolveBindings(natal.stems,raw.stemBindings,'STEM_BINDING');
  const branchBindings=resolveBindings(natal.branchBindings,raw.branchBindings,'SIX_COMBINATION');
  const assemblies=[...natal.assemblies,...timingAssemblies(activation)];
  const clashes=resolveClashes(natal.clashes,raw.clashes,branchBindings,assemblies);
  const punishments=resolvePunishments(natal.punishments,raw.pairPunishments,timingPunishmentCompletions(activation),branchBindings,assemblies);
  const harms=resolveSecondary(natal.harms,raw.harms,branchBindings,assemblies,'HARM');
  const breaks=resolveSecondary(natal.breaks,raw.breaks,branchBindings,assemblies,'BREAK');
  const positions=positionStates(chart,activation,branchBindings,assemblies,clashes,punishments,harms,breaks);
  const crossLayer=crossLayerSignals(activation,clashes,assemblies,stemBindings,branchBindings);

  return {
    version:TIMING_RELATION_RESOLUTION_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    layerPrecedence:{
      order:['NATAL_BASE','DAYUN_ENVIRONMENT','YEAR_TRIGGER'],
      natalRole:'BASE', dayunRole:'ENVIRONMENT', yearRole:'TRIGGER',
      yearCanModifyDayun:true,
      yearErasesDayun:false,
      timingCanRewriteNatal:false,
      rule:'YEAR_MAY_MEDIATE_COMPLETE_OR_CONTEST_DAYUN_WITHOUT_ERASING_DAYUN_OR_REWRITING_NATAL'
    },
    natalInvariant:activation.natalInvariant,
    activation,
    stemBindings,
    branchBindings,
    assemblies,
    clashes,
    punishments,
    harms,
    breaks,
    repeats:raw.repeats,
    positionStates:positions,
    crossLayerSignals:crossLayer,
    trace:[
      `LAYER_ORDER=NATAL>DAYUN>YEAR`,
      `STEM_BINDINGS=${stemBindings.map(x=>`${x.originLayer}:${x.bindingStatus}`).join('|')||'NONE'}`,
      `BRANCH_BINDINGS=${branchBindings.map(x=>`${x.originLayer}:${x.bindingStatus}`).join('|')||'NONE'}`,
      `ASSEMBLIES=${assemblies.map(x=>`${x.originLayer}:${x.type}:${x.status}`).join('|')||'NONE'}`,
      `CLASHES=${clashes.map(x=>`${x.originLayer}:${x.status}`).join('|')||'NONE'}`,
      `PUNISHMENTS=${punishments.map(x=>`${x.originLayer}:${x.subtype}:${x.status}`).join('|')||'NONE'}`,
      `CROSS_LAYER=${crossLayer.map(x=>x.key).join('|')||'NONE'}`,
      'NATAL_REWRITE=NO',
      'DAYUN_ERASED_BY_YEAR=NO'
    ]
  };
}
