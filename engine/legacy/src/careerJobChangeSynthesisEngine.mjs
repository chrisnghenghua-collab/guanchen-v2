import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';
import { resolveTimingRelations } from '../../src/timingRelationResolutionEngine.mjs';

export const CAREER_JOB_CHANGE_SYNTHESIS_VERSION = 'GUANCHENG_CAREER_JOB_CHANGE_SYNTHESIS_PROTO_V2_STEP02_E_R1';

export const CAREER_JOB_CHANGE_QUESTION = Object.freeze({
  questionId:'CAREER_JOB_CHANGE',
  domain:'CAREER',
  userText:'现在适不适合换工作？',
  intent:'CHANGE_CURRENT_EMPLOYMENT',
  timeHorizon:'NOW_TO_12_MONTHS',
  evidenceRecipeId:'RECIPE_CAREER_JOB_CHANGE_V1',
  contextRequired:true,
  contextSetId:'CTX_JOB_CHANGE',
  timingRequired:['DAYUN','YEAR'],
  outputTemplate:'STANDARD_SYNTHESIS_V1'
});

export const JOB_CHANGE_CONTEXTS = Object.freeze({
  CTX_STABLE_CONSIDERING:{ label:'工作稳定，只是在考虑', realityPriority:'NORMAL' },
  CTX_SEARCHING:{ label:'已经开始找新工作', realityPriority:'NORMAL' },
  CTX_INTERVIEWING:{ label:'正在面试', realityPriority:'NORMAL' },
  CTX_OFFER_RECEIVED:{ label:'已收到 Offer', realityPriority:'HIGH' },
  CTX_WANT_TO_LEAVE:{ label:'很想离开目前环境', realityPriority:'HIGH' },
  CTX_RESTRUCTURING:{ label:'公司正在重组 / 裁员', realityPriority:'CRITICAL' },
  CTX_RESIGNATION_DECIDED:{ label:'已决定辞职', realityPriority:'HIGH' }
});

export const CAREER_JOB_CHANGE_STATES = Object.freeze([
  'STAY_AND_BUILD',
  'PREPARE_TO_MOVE',
  'MOVE_IF_QUALITY',
  'ACTIVE_CHANGE_WINDOW',
  'HIGH_FRICTION_CAUTION'
]);

const STATE_COPY = Object.freeze({
  STAY_AND_BUILD:{
    direct:'目前更适合继续累积，而不是急着换工作。',
    current:'目前的命盘与时运证据没有形成足够明确的主动转换窗口，更像是先把现有位置、能力与筹码做稳。',
    development:'接下来可以观察机会，但现阶段不需要为了“必须变化”而制造变化。',
    caution:'不要把短期的不耐烦，直接等同于“现在离开一定更好”。'
  },
  PREPARE_TO_MOVE:{
    direct:'可以开始准备转换，但更适合先把下一步准备好，再正式离开。',
    current:'变化或外部机会的信号已经出现，但还不足以支持无条件地快速离场。',
    development:'未来一段时间更适合主动搜集机会、面试和比较，让选择逐渐从想法变成可验证的选项。',
    caution:'准备转换不等于马上辞职，先把现实条件与下一步承接好。'
  },
  MOVE_IF_QUALITY:{
    direct:'可以认真考虑换工作，但重点是机会质量，而不是单纯离开。',
    current:'当前已有较明确的职业支持或变化信号，但同时仍存在需要筛选和比较的条件。',
    development:'只要新机会在职责、成长、资源或现实条件上确实优于现在，转换可以进入实际决策阶段。',
    caution:'不要因为“有机会”就接受任何机会，真正要比较的是下一站能不能让你往前走。'
  },
  ACTIVE_CHANGE_WINDOW:{
    direct:'目前已经进入较明显的职业变化窗口，可以认真推进新的工作选择。',
    current:'变化信号与职业支持信号同时出现，而且没有被高摩擦因素压过，说明这一阶段更容易出现实际转换。',
    development:'如果你已经在找工作、面试或接触新机会，可以把重点放在筛选与落实，而不只是观望。',
    caution:'窗口明显仍不等于所有选择都合适，合同、收入、职责和稳定性仍要现实核对。'
  },
  HIGH_FRICTION_CAUTION:{
    direct:'现在想改变的力量很强，但更适合先稳住判断，不建议只因为压力就仓促离开。',
    current:'目前更明显的是压力、冲突或消耗信号，而新的职业支持尚未形成足够清楚的承接。',
    development:'先把压力来源与真正的职业机会分开，等下一步条件清楚以后再决定，会比直接逃离更稳。',
    caution:'“很想离开”与“下一份工作已经成熟”是两件不同的事。'
  }
});

const MAGNITUDE_ORDER = { LOW:1, MODERATE:2, HIGH:3 };

function assertTiming(timing) {
  if (!timing?.dayun || !timing?.year) {
    const e=new Error('CAREER_JOB_CHANGE requires active Dayun and Year from STEP 01 Core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}

function assertContext(contextId) {
  if (!JOB_CHANGE_CONTEXTS[contextId]) {
    const e=new Error(`Unknown CAREER_JOB_CHANGE context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
}

function finding({id,role,category,sourceType,sourceKey,polarity='NEUTRAL',magnitude='LOW',timingScope='NATAL',certainty='CONFIRMED',tags=[],plainMeaning,technicalBasis=[]}) {
  if (!['PRIMARY','SECONDARY','TIMING','MODIFIER'].includes(role)) throw new Error(`Invalid role: ${role}`);
  if (!['STRUCTURAL','RELATIONAL','TIMING','MODIFIER','SUPPORTING'].includes(category)) throw new Error(`Invalid category: ${category}`);
  if (!['SUPPORTIVE','CHALLENGING','MIXED','NEUTRAL'].includes(polarity)) throw new Error(`Invalid polarity: ${polarity}`);
  if (!MAGNITUDE_ORDER[magnitude]) throw new Error(`Invalid magnitude: ${magnitude}`);
  return { id,role,category,sourceType,sourceKey,domainTags:['CAREER'],polarity,magnitude,timingScope,certainty,tags:[...new Set(tags)],plainMeaning,technicalBasis };
}

function patternPolarity(stage) {
  if (['FORMED','RESCUED'].includes(stage)) return ['SUPPORTIVE','MODERATE'];
  if (stage==='BROKEN') return ['CHALLENGING','MODERATE'];
  if (stage==='FORMED_WITH_FLAW') return ['MIXED','MODERATE'];
  return ['NEUTRAL','LOW'];
}

function buildNatalEvidence(strength, pattern) {
  const [polarity,magnitude]=patternPolarity(pattern.stage);
  return [
    finding({
      id:'CAREER_NATAL_STRUCTURE', role:'PRIMARY', category:'STRUCTURAL', sourceType:'PATTERN_RESOLUTION',
      sourceKey:pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE', polarity, magnitude,
      tags:['BASELINE','CAREER_STRUCTURE'],
      plainMeaning:'原局事业结构提供长期职业倾向与承载方式，但不会单独决定现在是否换工作。',
      technicalBasis:[`StructureKey=${pattern.baseStructure?.key ?? 'NONE'}`,`PatternStage=${pattern.stage}`]
    }),
    finding({
      id:'CAREER_NATAL_STRENGTH', role:'SECONDARY', category:'STRUCTURAL', sourceType:'STRENGTH',
      sourceKey:strength.strengthBand, polarity:'NEUTRAL', magnitude:'LOW', tags:['BASELINE','CAPACITY'],
      plainMeaning:'日主强弱用于理解承压、输出与资源需求，不直接等同于换工作的吉凶。',
      technicalBasis:[`StrengthBand=${strength.strengthBand}`]
    })
  ];
}

const FAMILY_COPY = {
  AUTHORITY:{ polarity:'SUPPORTIVE', tags:['OPPORTUNITY','RESPONSIBILITY'], plain:'职责、职位、规则或组织角色主题进入当前时运。' },
  WEALTH:{ polarity:'SUPPORTIVE', tags:['OPPORTUNITY','MATERIAL'], plain:'资源、收入或现实条件主题进入当前时运。' },
  OUTPUT:{ polarity:'MIXED', tags:['CHANGE','AGENCY'], plain:'表达、输出、主动争取与改变现状的倾向增强。' },
  RESOURCE:{ polarity:'SUPPORTIVE', tags:['PREPARATION','SUPPORT'], plain:'学习、资历、支持与适应新体系的条件增强。' },
  PEER:{ polarity:'MIXED', tags:['COMPETITION','AGENCY'], plain:'自主性、同侪竞争或自我主张主题增强。' }
};

function timingLayerEvidence(activation) {
  const out=[];
  for (const layer of activation.layers) {
    const family=FAMILY_COPY[layer.stemFamily] ?? {polarity:'NEUTRAL',tags:[],plain:'新的时运主题进入。'};
    out.push(finding({
      id:`CAREER_${layer.layer}_VISIBLE_${layer.stemGod}`, role:'TIMING', category:'TIMING', sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.stemGod}_VISIBLE_ENTERED`, polarity:family.polarity, magnitude:'MODERATE', timingScope:layer.layer,
      tags:family.tags, plainMeaning:family.plain,
      technicalBasis:[`${layer.layer}=${layer.pillar}`,`VisibleTenGod=${layer.stemGod}`]
    }));
  }
  return out;
}

function patternActivationEvidence(activation) {
  return activation.patternActivation.map((x,i)=>{
    let polarity='MIXED', magnitude='MODERATE', tags=['CAREER_STRUCTURE_ACTIVATED'];
    if (x.classification==='PATTERN_SUPPORT_CANDIDATE') { polarity='SUPPORTIVE'; magnitude='HIGH'; tags.push('OPPORTUNITY'); }
    if (x.classification==='PATTERN_ROUTE_CANDIDATE') { polarity='SUPPORTIVE'; magnitude='MODERATE'; tags.push('OPPORTUNITY','ROUTE'); }
    if (x.classification==='PATTERN_PRESSURE_CANDIDATE') { polarity='CHALLENGING'; magnitude='HIGH'; tags.push('FRICTION','PRESSURE'); }
    if (x.classification==='PATTERN_COMPLEXITY_REVIEW') { polarity='MIXED'; magnitude='MODERATE'; tags.push('FRICTION','REVIEW'); }
    return finding({
      id:`CAREER_PATTERN_ACT_${i}_${x.key}`, role:'PRIMARY', category:'TIMING', sourceType:'PATTERN_ACTIVATION',
      sourceKey:x.key, polarity, magnitude, timingScope:x.layer, certainty:'CONDITIONAL', tags,
      plainMeaning: polarity==='SUPPORTIVE' ? '当前时运对原局事业结构形成可利用的支持或发展路线。' : polarity==='CHALLENGING' ? '当前时运对原局事业结构形成明显压力，需要避免只凭情绪做决定。' : '当前时运让事业结构变得更复杂，需要结合其它证据判断。',
      technicalBasis:[`Layer=${x.layer}`,`Activation=${x.key}`,`Class=${x.classification}`]
    });
  });
}

function resolvedRelationEvidence(timingResolution) {
  const out=[];
  let seq=0;
  for (const c of timingResolution.clashes.filter(x=>x.originLayer!=='NATAL')) {
    if (c.status==='ACTIVE') out.push(finding({
      id:`CAREER_REL_${seq++}_CLASH_ACTIVE`, role:'TIMING', category:'RELATIONAL', sourceType:'TIMING_RELATION', sourceKey:'ACTIVE_CLASH',
      polarity:'MIXED', magnitude:'HIGH', timingScope:c.originLayer, tags:['CHANGE','ENVIRONMENT_SHIFT'],
      plainMeaning:'当前时运形成直接冲动关系，职业环境或职责结构更容易出现明显调整。',
      technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`,`Reason=${c.reason}`]
    }));
    else if (c.status==='MEDIATED_CONFIRMED') out.push(finding({
      id:`CAREER_REL_${seq++}_CLASH_MEDIATED`, role:'TIMING', category:'RELATIONAL', sourceType:'TIMING_RELATION', sourceKey:'MEDIATED_CLASH',
      polarity:'MIXED', magnitude:'MODERATE', timingScope:c.originLayer, tags:['CHANGE','MEDIATED'],
      plainMeaning:'变化关系存在，但同时有其它关系牵制或缓和，不宜按完全裸冲理解。',
      technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`,`Reason=${c.reason}`]
    }));
    else if (String(c.status).includes('REVIEW')) out.push(finding({
      id:`CAREER_REL_${seq++}_CLASH_REVIEW`, role:'TIMING', category:'RELATIONAL', sourceType:'TIMING_RELATION', sourceKey:'CLASH_MULTI_RELATION_REVIEW',
      polarity:'MIXED', magnitude:'MODERATE', timingScope:c.originLayer, certainty:'CONDITIONAL', tags:['CHANGE','REVIEW'],
      plainMeaning:'变化关系与其它合会结构重叠，当前只能视为复杂变化信号。',
      technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`,`Reason=${c.reason}`]
    }));
  }

  for (const p of timingResolution.punishments.filter(x=>x.originLayer!=='NATAL')) {
    if (['ACTIVE','ACTIVE_COMPLETE'].includes(p.status)) out.push(finding({
      id:`CAREER_REL_${seq++}_PUNISHMENT`, role:'TIMING', category:'RELATIONAL', sourceType:'TIMING_RELATION', sourceKey:'ACTIVE_PUNISHMENT',
      polarity:'CHALLENGING', magnitude:p.status==='ACTIVE_COMPLETE'?'HIGH':'MODERATE', timingScope:p.originLayer,
      tags:['FRICTION','PRESSURE'], plainMeaning:'当前时运存在较明显的摩擦或内外拉扯，不适合把压力本身误判为成熟机会。',
      technicalBasis:[`Origin=${p.originLayer}`,`Status=${p.status}`,`Reason=${p.reason}`]
    }));
  }

  for (const a of timingResolution.assemblies.filter(x=>x.originLayer!=='NATAL')) {
    if (['FORMATION_COMPLETED_BY_TIMING','FORMATION_CONFIRMED'].includes(a.status)) out.push(finding({
      id:`CAREER_REL_${seq++}_ASSEMBLY`, role:'TIMING', category:'RELATIONAL', sourceType:'TIMING_ASSEMBLY', sourceKey:a.type,
      polarity:'MIXED', magnitude:'MODERATE', timingScope:a.originLayer, tags:['CHANGE','STRUCTURE_REORGANIZATION'],
      plainMeaning:'当前大运或流年补全了原局关系结构，环境主题更容易集中或重组。',
      technicalBasis:[`Origin=${a.originLayer}`,`Type=${a.type}`,`Element=${a.candidateElement ?? 'NONE'}`]
    }));
  }

  for (const s of timingResolution.crossLayerSignals) {
    if (s.key==='STACKED_CLASH_ON_SAME_NATAL_POSITION') out.push(finding({
      id:`CAREER_REL_${seq++}_STACKED_CLASH`, role:'PRIMARY', category:'TIMING', sourceType:'CROSS_LAYER_SIGNAL', sourceKey:s.key,
      polarity:'MIXED', magnitude:'HIGH', timingScope:'PERIOD', tags:['CHANGE','ENVIRONMENT_SHIFT'],
      plainMeaning:'大运与流年同时对同一原局位置形成变化压力，变化主题被重复强调。',
      technicalBasis:[`Signal=${s.key}`,`Target=${s.target ?? 'UNKNOWN'}`]
    }));
  }

  for (const r of timingResolution.repeats ?? []) out.push(finding({
    id:`CAREER_REL_${seq++}_REPEAT`, role:'MODIFIER', category:'MODIFIER', sourceType:'REPEAT_FACT', sourceKey:r.type ?? 'REPEAT',
    polarity:'MIXED', magnitude:'LOW', timingScope:r.originLayer ?? 'PERIOD', tags:['REINFORCEMENT'],
    plainMeaning:'当前时运与原局出现重复结构，相关主题可能被再次强调，但不单独决定吉凶。',
    technicalBasis:[`Repeat=${r.type ?? 'UNKNOWN'}`]
  }));

  return out;
}

function independentSources(items, tag, polarity=null) {
  return new Set(items.filter(x=>x.tags.includes(tag) && (!polarity || x.polarity===polarity)).map(x=>`${x.sourceType}:${x.sourceKey}`));
}
function has(items, fn) { return items.some(fn); }

export function resolveCareerJobChangeState(evidence) {
  const timing=evidence.filter(x=>['PRIMARY','TIMING'].includes(x.role) && x.timingScope!=='NATAL');
  const opportunity=timing.filter(x=>x.tags.includes('OPPORTUNITY') && x.polarity==='SUPPORTIVE');
  const change=timing.filter(x=>x.tags.includes('CHANGE'));
  const friction=timing.filter(x=>x.tags.includes('FRICTION') && x.polarity==='CHALLENGING');

  const supportStrong = has(opportunity,x=>x.magnitude==='HIGH') || independentSources(opportunity,'OPPORTUNITY','SUPPORTIVE').size>=2;
  const supportPresent = opportunity.length>0;
  const changeStrong = has(change,x=>x.magnitude==='HIGH') || independentSources(change,'CHANGE').size>=2;
  const changePresent = change.length>0;
  const frictionStrong = has(friction,x=>x.magnitude==='HIGH') || independentSources(friction,'FRICTION','CHALLENGING').size>=2;
  const frictionPresent = friction.length>0;

  let state;
  if (frictionStrong && !supportStrong) state='HIGH_FRICTION_CAUTION';
  else if (changeStrong && supportStrong && !frictionStrong) state='ACTIVE_CHANGE_WINDOW';
  else if (supportStrong || (supportPresent && changePresent)) state='MOVE_IF_QUALITY';
  else if (changePresent || supportPresent || frictionPresent) state='PREPARE_TO_MOVE';
  else state='STAY_AND_BUILD';

  return {
    state,
    corroboration:{
      support:supportStrong?'STRONG':supportPresent?'PRESENT':'NONE',
      change:changeStrong?'STRONG':changePresent?'PRESENT':'NONE',
      friction:frictionStrong?'STRONG':frictionPresent?'PRESENT':'NONE'
    },
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

function assertState(state) {
  if (!CAREER_JOB_CHANGE_STATES.includes(state)) {
    const e=new Error(`Unknown CAREER_JOB_CHANGE state: ${state}`);
    e.code='INVALID_SYNTHESIS_STATE';
    throw e;
  }
}

export function renderCareerJobChangeAnswer(state, contextId, evidence=[]) {
  assertState(state);
  assertContext(contextId);
  const copy=STATE_COPY[state];
  const actions=actionsFor(state,contextId);
  const why=topWhy(evidence);
  const technicalBasis=evidence
    .filter(x=>x?.magnitude!=='LOW')
    .slice(0,8)
    .flatMap(x=>(x.technicalBasis ?? []).map(b=>`${x.sourceKey}: ${b}`));
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    development:copy.development,
    actions,
    caution:copy.caution,
    why,
    technicalBasis,
    deepAwareness:deepAwarenessFor(contextId),
    certaintyLanguage:'NON_DETERMINISTIC'
  };
}

function actionsFor(state, contextId) {
  const base={
    STAY_AND_BUILD:['先把当前岗位能累积的经验与成果做实','低成本观察市场，不需要为了变化而变化','明确下一份工作必须改善的条件'],
    PREPARE_TO_MOVE:['更新履历与市场信息，开始主动比较机会','可以面试，但先不要把裸辞当成默认选项','比较成长空间、职责与稳定性，不只看薪资'],
    MOVE_IF_QUALITY:['把现有工作与新机会放在同一张条件表比较','优先选择能提升职责、资源或成长空间的机会','确认现实承接条件后再决定离开时间'],
    ACTIVE_CHANGE_WINDOW:['积极推进真正合适的面试与机会','把合同、职责、收入与发展路径核对清楚','为交接与入职预留现实缓冲'],
    HIGH_FRICTION_CAUTION:['先辨认当前最主要的压力来源','在没有明确下一步前保留基本安全垫','避免在冲突最强的时候做不可逆决定']
  }[state].slice();

  const overrides={
    CTX_STABLE_CONSIDERING:'把“想换”先转成市场调研和条件清单，不需要先辞职。',
    CTX_SEARCHING:'继续找，但每一个机会都要和当前岗位做实际比较。',
    CTX_INTERVIEWING:'把面试当成收集信息与筛选，不要因为第一份机会就急着决定。',
    CTX_OFFER_RECEIVED:'重点已经不是“要不要找”，而是核对这个 Offer 是否真的比现在更值得。',
    CTX_WANT_TO_LEAVE:'先区分是工作本身不适合，还是当前压力让你只想离开。',
    CTX_RESTRUCTURING:'现实上的组织风险优先，应立即准备替代方案与现金流缓冲，不必等待命盘给出“完美窗口”。',
    CTX_RESIGNATION_DECIDED:'既然离开决定已定，重点转为交接、现金流与下一阶段承接，而不是反复讨论要不要辞。'
  };
  base[0]=overrides[contextId];
  return base.slice(0,3);
}

function deepAwarenessFor(contextId) {
  if (contextId==='CTX_RESTRUCTURING') return '公司环境已经发生客观变化。更深一层要看的，不是把现实风险心理化，而是你怎样在不可控变化里保留自己的选择权。';
  if (contextId==='CTX_RESIGNATION_DECIDED') return '决定已经做出以后，更值得观察的是：你希望下一份工作真正改变什么，而不是只复制同一种工作结构。';
  if (contextId==='CTX_WANT_TO_LEAVE') return '你现在真正想离开的，是这份工作本身，还是长期无法掌握自己节奏的感觉？如果换一个地方却重复同一种工作结构，同样的问题仍可能回来。';
  return '如果真的换到另一个环境，你最希望改变的是职责、成长、收入、节奏，还是人与人的相处方式？把这一点说清楚，下一步会比单纯追求“换”更有方向。';
}

function topWhy(evidence) {
  const rank={HIGH:3,MODERATE:2,LOW:1};
  return evidence
    .filter(x=>x.role!=='MODIFIER' && x.timingScope!=='NATAL')
    .slice()
    .sort((a,b)=>rank[b.magnitude]-rank[a.magnitude])
    .slice(0,4)
    .map(x=>x.plainMeaning);
}

export function buildCareerJobChangeEvidence(chart, timing) {
  assertTiming(timing);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const timingResolution=resolveTimingRelations(chart,timing);
  const evidence=[
    ...buildNatalEvidence(strength,pattern),
    ...timingLayerEvidence(timingResolution.activation),
    ...patternActivationEvidence(timingResolution.activation),
    ...resolvedRelationEvidence(timingResolution)
  ];
  return {
    version:CAREER_JOB_CHANGE_SYNTHESIS_VERSION,
    questionId:CAREER_JOB_CHANGE_QUESTION.questionId,
    evidence,
    primary:evidence.filter(x=>x.role==='PRIMARY'),
    secondary:evidence.filter(x=>x.role==='SECONDARY'),
    timing:evidence.filter(x=>x.role==='TIMING'),
    modifiers:evidence.filter(x=>x.role==='MODIFIER'),
    sourceSnapshot:{
      strengthBand:strength.strengthBand,
      structureKey:pattern.baseStructure?.key ?? null,
      patternStage:pattern.stage,
      timingVersion:timingResolution.version,
      natalStrengthRewritten:timingResolution.natalInvariant.natalStrengthRewritten,
      natalStructureRewritten:timingResolution.natalInvariant.natalStructureRewritten
    }
  };
}

export function synthesizeCareerJobChange(chart, timing, contextId) {
  assertContext(contextId);
  const built=buildCareerJobChangeEvidence(chart,timing);
  const resolution=resolveCareerJobChangeState(built.evidence);
  const context=JOB_CHANGE_CONTEXTS[contextId];
  const answer=renderCareerJobChangeAnswer(resolution.state,contextId,built.evidence);

  return {
    version:CAREER_JOB_CHANGE_SYNTHESIS_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:CAREER_JOB_CHANGE_QUESTION,
    context:{ id:contextId, label:context.label, realityPriority:context.realityPriority, rewritesEvidence:false },
    evidenceStack:built,
    synthesis:{
      state:resolution.state,
      corroboration:resolution.corroboration,
      numericScoreUsed:false,
      percentConfidenceUsed:false,
      contextChangedEvidenceState:false
    },
    answer,
    trace:[
      `QUESTION=${CAREER_JOB_CHANGE_QUESTION.questionId}`,
      `STRUCTURE=${built.sourceSnapshot.structureKey}`,
      `PATTERN_STAGE=${built.sourceSnapshot.patternStage}`,
      `STRENGTH=${built.sourceSnapshot.strengthBand}`,
      `STATE=${resolution.state}`,
      `SUPPORT=${resolution.corroboration.support}`,
      `CHANGE=${resolution.corroboration.change}`,
      `FRICTION=${resolution.corroboration.friction}`,
      `CONTEXT=${contextId}`,
      'CONTEXT_REWRITES_EVIDENCE=NO',
      'NUMERIC_SCORE=NO',
      'PERCENT_CONFIDENCE=NO'
    ]
  };
}
