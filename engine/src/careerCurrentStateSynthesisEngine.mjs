import { assessStrength } from './strengthEngine.mjs';
import { resolvePattern } from './patternResolutionEngine.mjs';
import { resolveTimingRelations } from './timingRelationResolutionEngine.mjs';

export const CAREER_CURRENT_STATE_VERSION = 'GUANCHENG_CAREER_CURRENT_STATE_PROTO_V1_STEP02_G1';

export const CAREER_CURRENT_STATE_QUESTION = Object.freeze({
  questionId:'CAREER_CURRENT_STATE',
  domain:'CAREER',
  userText:'最近工作整体怎么样？',
  intent:'ASSESS_CURRENT_WORK_PHASE',
  timeHorizon:'CURRENT_TO_NEXT_6_MONTHS',
  evidenceRecipeId:'RECIPE_CAREER_CURRENT_STATE_V1',
  contextRequired:false,
  contextSetId:'CTX_CAREER_CURRENT_OPTIONAL',
  timingRequired:['DAYUN','YEAR'],
  outputTemplate:'CURRENT_STATE_SYNTHESIS_V1'
});

export const CAREER_CURRENT_CONTEXTS = Object.freeze({
  CTX_NONE:{label:'不补充现实状态'},
  CTX_WORK_STABLE:{label:'工作整体稳定'},
  CTX_RESPONSIBILITY_INCREASED:{label:'最近职责明显增加'},
  CTX_GROWTH_STALLED:{label:'最近觉得发展卡住'},
  CTX_PRESSURE_HIGH:{label:'最近工作压力明显偏高'},
  CTX_ORG_CHANGING:{label:'团队 / 公司正在调整'}
});

export const CAREER_CURRENT_STATES = Object.freeze([
  'STEADY_ACCUMULATION',
  'RESPONSIBILITY_RISING',
  'DEVELOPMENT_CONSTRAINED',
  'PRESSURE_IMBALANCED',
  'TRANSITION_PREPARATION'
]);

const MAGNITUDE_ORDER={LOW:1,MODERATE:2,HIGH:3};

function assertTiming(timing){
  if(!timing?.dayun || !timing?.year){
    const e=new Error('CAREER_CURRENT_STATE requires active Dayun and Year from STEP 01 Core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}
function normalizeContext(contextId='CTX_NONE'){
  if(!CAREER_CURRENT_CONTEXTS[contextId]){
    const e=new Error(`Unknown CAREER_CURRENT_STATE context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:CAREER_CURRENT_CONTEXTS[contextId].label,rewritesEvidence:false,rewritesState:false};
}
function finding({id,role,category,sourceType,sourceKey,polarity='NEUTRAL',magnitude='LOW',timingScope='NATAL',certainty='CONFIRMED',tags=[],plainMeaning,technicalBasis=[]}){
  return {id,role,category,sourceType,sourceKey,domainTags:['CAREER'],polarity,magnitude,timingScope,certainty,tags:[...new Set(tags)],plainMeaning,technicalBasis};
}

function natalEvidence(strength,pattern){
  const stage=pattern.stage;
  const polarity=['FORMED','RESCUED'].includes(stage)?'SUPPORTIVE':stage==='BROKEN'?'CHALLENGING':'NEUTRAL';
  const magnitude=polarity==='NEUTRAL'?'LOW':'MODERATE';
  return [
    finding({
      id:'CAREER_CURRENT_NATAL_STRUCTURE',role:'PRIMARY',category:'STRUCTURAL',sourceType:'PATTERN_RESOLUTION',
      sourceKey:pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE',polarity,magnitude,timingScope:'NATAL',tags:['BASELINE','WORK_STRUCTURE'],
      plainMeaning:'原局结构说明长期工作的承载方式，但不会单独决定最近工作的实际状态。',
      technicalBasis:[`StructureKey=${pattern.baseStructure?.key ?? 'NONE'}`,`PatternStage=${stage}`]
    }),
    finding({
      id:'CAREER_CURRENT_NATAL_STRENGTH',role:'SECONDARY',category:'STRUCTURAL',sourceType:'STRENGTH',
      sourceKey:strength.strengthBand,polarity:'NEUTRAL',magnitude:'LOW',timingScope:'NATAL',tags:['BASELINE','CAPACITY'],
      plainMeaning:'日主强弱用于理解承压、输出和资源需求，不直接等同于工作好坏。',
      technicalBasis:[`StrengthBand=${strength.strengthBand}`]
    })
  ];
}

const FAMILY_META={
  AUTHORITY:{polarity:'SUPPORTIVE',tags:['RESPONSIBILITY','ROLE_VISIBILITY','STABILITY_SUPPORT'],plain:'职位、职责、规则或组织角色主题进入当前时运。'},
  RESOURCE:{polarity:'SUPPORTIVE',tags:['STABILITY_SUPPORT','LEARNING_SUPPORT'],plain:'学习、支持、资历与适应体系的条件增强。'},
  WEALTH:{polarity:'SUPPORTIVE',tags:['MATERIAL_SUPPORT','DEVELOPMENT_SUPPORT'],plain:'资源、回报与现实成果主题进入当前时运。'},
  OUTPUT:{polarity:'MIXED',tags:['GROWTH_DRIVE','TRANSITION','AGENCY'],plain:'输出、表达、主动争取与改变工作方式的力量增强。'},
  PEER:{polarity:'MIXED',tags:['COMPETITION','TRANSITION','AGENCY'],plain:'自主性、同侪竞争或自我主张主题增强。'}
};

function timingLayerEvidence(activation){
  const out=[];
  for(const layer of activation.layers){
    const m=FAMILY_META[layer.stemFamily] ?? {polarity:'NEUTRAL',tags:[],plain:'新的时运主题进入。'};
    out.push(finding({
      id:`CAREER_CURRENT_${layer.layer}_${layer.stemGod}`,role:'TIMING',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.stemGod}_VISIBLE_ENTERED`,polarity:m.polarity,magnitude:'MODERATE',timingScope:layer.layer,tags:m.tags,
      plainMeaning:m.plain,technicalBasis:[`${layer.layer}=${layer.pillar}`,`VisibleTenGod=${layer.stemGod}`]
    }));
  }
  return out;
}

function patternActivationEvidence(activation){
  return activation.patternActivation.map((x,i)=>{
    let polarity='MIXED',magnitude='MODERATE',tags=['WORK_STRUCTURE_ACTIVATED'];
    if(x.classification==='PATTERN_SUPPORT_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='HIGH';tags.push('DEVELOPMENT_SUPPORT','STABILITY_SUPPORT');
    } else if(x.classification==='PATTERN_ROUTE_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='MODERATE';tags.push('RESPONSIBILITY','DEVELOPMENT_SUPPORT');
    } else if(x.classification==='PATTERN_PRESSURE_CANDIDATE'){
      polarity='CHALLENGING';magnitude='HIGH';tags.push('FRICTION','PRESSURE');
    } else if(x.classification==='PATTERN_COMPLEXITY_REVIEW'){
      polarity='MIXED';magnitude='MODERATE';tags.push('FRICTION','TRANSITION','REVIEW');
    }
    return finding({
      id:`CAREER_CURRENT_PATTERN_${i}_${x.key}`,role:'PRIMARY',category:'TIMING',sourceType:'PATTERN_ACTIVATION',sourceKey:x.key,
      polarity,magnitude,timingScope:x.layer,certainty:'CONDITIONAL',tags,
      plainMeaning:polarity==='SUPPORTIVE'?'当前时运对工作结构形成可利用的支持或发展路线。':polarity==='CHALLENGING'?'当前时运对工作结构形成较明显压力，容易出现承压或失衡感。':'当前工作结构进入复杂调整期，需要把发展、压力与变化分开看。',
      technicalBasis:[`Layer=${x.layer}`,`Activation=${x.key}`,`Class=${x.classification}`]
    });
  });
}

function relationEvidence(timingResolution){
  const out=[]; let seq=0;
  for(const c of timingResolution.clashes.filter(x=>x.originLayer!=='NATAL')){
    if(c.status==='ACTIVE') out.push(finding({
      id:`CAREER_CURRENT_REL_${seq++}_CLASH`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_CLASH',
      polarity:'MIXED',magnitude:'HIGH',timingScope:c.originLayer,tags:['TRANSITION','ENVIRONMENT_SHIFT'],
      plainMeaning:'当前工作环境、职责或协作方式更容易出现明显调整。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`,`Reason=${c.reason}`]
    }));
    else if(c.status==='MEDIATED_CONFIRMED') out.push(finding({
      id:`CAREER_CURRENT_REL_${seq++}_CLASH_MEDIATED`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MEDIATED_CLASH',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,tags:['TRANSITION','MEDIATED'],
      plainMeaning:'变化关系存在，但同时有其它关系缓和，工作状态更像调整而不是完全失序。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
    else if(String(c.status).includes('REVIEW')) out.push(finding({
      id:`CAREER_CURRENT_REL_${seq++}_CLASH_REVIEW`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MULTI_RELATION_REVIEW',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,certainty:'CONDITIONAL',tags:['TRANSITION','FRICTION','REVIEW'],
      plainMeaning:'多个关系同时作用，近期工作状态带有明显调整与复杂性。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
  }
  for(const p of timingResolution.punishments.filter(x=>x.originLayer!=='NATAL')){
    if(['ACTIVE','ACTIVE_COMPLETE'].includes(p.status)) out.push(finding({
      id:`CAREER_CURRENT_REL_${seq++}_PUNISHMENT`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_PUNISHMENT',
      polarity:'CHALLENGING',magnitude:p.status==='ACTIVE_COMPLETE'?'HIGH':'MODERATE',timingScope:p.originLayer,tags:['FRICTION','PRESSURE'],
      plainMeaning:'当前工作里的摩擦、重复消耗或压力感更容易被放大。',technicalBasis:[`Origin=${p.originLayer}`,`Status=${p.status}`]
    }));
  }
  for(const a of timingResolution.assemblies.filter(x=>x.originLayer!=='NATAL')){
    if(['FORMATION_COMPLETED_BY_TIMING','FORMATION_CONFIRMED'].includes(a.status)) out.push(finding({
      id:`CAREER_CURRENT_REL_${seq++}_ASSEMBLY`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_ASSEMBLY',sourceKey:a.type,
      polarity:'MIXED',magnitude:'MODERATE',timingScope:a.originLayer,tags:['TRANSITION','STRUCTURE_REORGANIZATION'],
      plainMeaning:'时运补全新的组合结构，工作资源、职责或环境更容易重新组合。',technicalBasis:[`Origin=${a.originLayer}`,`Type=${a.type}`]
    }));
  }
  for(const s of timingResolution.crossLayerSignals ?? []){
    if(s.key==='STACKED_CLASH_ON_SAME_NATAL_POSITION') out.push(finding({
      id:`CAREER_CURRENT_REL_${seq++}_STACKED_CLASH`,role:'PRIMARY',category:'TIMING',sourceType:'CROSS_LAYER_SIGNAL',sourceKey:s.key,
      polarity:'MIXED',magnitude:'HIGH',timingScope:'PERIOD',tags:['TRANSITION','ENVIRONMENT_SHIFT'],
      plainMeaning:'大运与流年同时强调同一工作变化主题，近期更像处在转折准备期。',technicalBasis:[`Signal=${s.key}`,`Target=${s.target ?? 'UNKNOWN'}`]
    }));
  }
  return out;
}

function srcCount(items){ return new Set(items.map(x=>`${x.sourceType}:${x.sourceKey}`)).size; }
function dimension(evidence,tags,{supportiveOnly=false,challengingOnly=false}={}){
  const xs=evidence.filter(x=>tags.some(t=>x.tags.includes(t)) && (!supportiveOnly || x.polarity==='SUPPORTIVE') && (!challengingOnly || x.polarity==='CHALLENGING'));
  const high=xs.some(x=>x.magnitude==='HIGH');
  if(high || srcCount(xs)>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveCareerCurrentState(evidence){
  const active=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER');
  const support=dimension(active,['STABILITY_SUPPORT','DEVELOPMENT_SUPPORT','MATERIAL_SUPPORT'],{supportiveOnly:true});
  const responsibility=dimension(active,['RESPONSIBILITY','ROLE_VISIBILITY']);
  const growth=dimension(active,['GROWTH_DRIVE','DEVELOPMENT_SUPPORT']);
  const friction=dimension(active,['FRICTION','PRESSURE'],{challengingOnly:true});
  const transition=dimension(active,['TRANSITION','ENVIRONMENT_SHIFT','STRUCTURE_REORGANIZATION']);

  let state='STEADY_ACCUMULATION';
  if(friction==='STRONG' && support!=='STRONG') state='PRESSURE_IMBALANCED';
  else if(transition==='STRONG') state='TRANSITION_PREPARATION';
  else if(responsibility==='STRONG' && friction!=='STRONG') state='RESPONSIBILITY_RISING';
  else if((growth!=='NONE' || transition!=='NONE') && support==='NONE' && friction!=='STRONG') state='DEVELOPMENT_CONSTRAINED';
  else if(friction==='PRESENT' && support==='NONE') state='DEVELOPMENT_CONSTRAINED';
  else state='STEADY_ACCUMULATION';

  return {state,dimensions:{support,responsibility,growth,friction,transition},numericScoreUsed:false,percentConfidenceUsed:false};
}

const STATE_COPY=Object.freeze({
  STEADY_ACCUMULATION:{
    direct:'最近工作整体偏稳定，更适合把现有位置做实，而不是急着制造变化。',
    current:'当前时运没有形成明显的高压或强转折信号，工作主轴更像持续累积、完成职责与稳住成果。',
    development:'接下来可以把重点放在成果可见度、专业能力和可持续节奏上。',
    caution:'稳定不等于停滞，避免因为没有剧烈变化就低估正在累积的价值。'
  },
  RESPONSIBILITY_RISING:{
    direct:'最近工作正在进入责任上升期，职位、职责或被要求承担的范围容易增加。',
    current:'当前更明显的是组织角色与责任感被推到前台，工作量不一定只是在“变多”，也可能是在扩大你的承载范围。',
    development:'如果能把新增责任转成清楚的权限、成果和资源，这一阶段更容易沉淀职业位置。',
    caution:'不要只接责任却没有同步确认权限、资源与回报。'
  },
  DEVELOPMENT_CONSTRAINED:{
    direct:'最近工作有想推进的力量，但承接条件还不够顺，容易出现“想发展却卡住”的感觉。',
    current:'主动性、输出或变化意愿已经出现，但支持条件没有同步增强，因此容易出现努力增加、进展却不成比例。',
    development:'先找出卡点是在资源、权限、协作还是方向，再决定要内部调整还是寻找外部空间。',
    caution:'不要把暂时推进不顺直接理解成能力不足，也不要只靠加大投入解决结构性卡点。'
  },
  PRESSURE_IMBALANCED:{
    direct:'最近工作压力与摩擦偏重，当前重点是先处理失衡，而不是继续硬撑。',
    current:'高压、冲突或反复消耗的信号更突出，而支持与承接不足，工作体验容易出现“付出很多但恢复不回来”。',
    development:'先辨认压力来自职责、关系、组织变化还是资源不足，再做针对性调整。',
    caution:'压力很强时，避免把所有问题都归因于自己，也不要在最疲惫的时候做不可逆决定。'
  },
  TRANSITION_PREPARATION:{
    direct:'最近工作正在进入转折准备期，职责、环境或工作方式更容易出现重新调整。',
    current:'变化与重组信号已经比较明显，但这不等于必须马上换工作，更像旧结构开始松动、新结构正在形成。',
    development:'接下来适合观察哪些变化已经变成事实，并提前准备能力、资源与选择权。',
    caution:'不要把“变化很多”自动理解为“越快离开越好”，先确认变化最后会把你带向哪里。'
  }
});

function contextAction(contextId,state){
  const map={
    CTX_NONE:null,
    CTX_WORK_STABLE:'现实上如果工作确实稳定，可以把重点放在成果累积与下一阶段筹码。',
    CTX_RESPONSIBILITY_INCREASED:'现实上职责已经增加，优先确认新增责任是否伴随权限、资源与可见成果。',
    CTX_GROWTH_STALLED:'现实上已经感到卡住，先把“卡在哪里”具体化，再判断是岗位问题还是阶段性阻力。',
    CTX_PRESSURE_HIGH:'现实压力已经很高时，先处理负荷、边界与恢复，不必等命盘证明你“应该撑住”。',
    CTX_ORG_CHANGING:'组织正在调整时，先确认结构变化、汇报关系与岗位风险，这是现实优先事项。'
  };
  return map[contextId] ?? STATE_COPY[state].development;
}

export function renderCareerCurrentStateAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!CAREER_CURRENT_STATES.includes(state)) throw new Error(`Unknown CAREER_CURRENT_STATE state: ${state}`);
  const context=normalizeContext(contextId);
  const copy=STATE_COPY[state];
  const why=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER').slice().sort((a,b)=>MAGNITUDE_ORDER[b.magnitude]-MAGNITUDE_ORDER[a.magnitude]).slice(0,4).map(x=>x.plainMeaning);
  const actions=[contextAction(contextId,state),copy.development,'把最近两三个月最明显的工作变化记录下来，分清事实变化与主观感受。'].filter(Boolean).slice(0,3);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    development:copy.development,
    actions,
    caution:copy.caution,
    why,
    technicalBasis:evidence.filter(x=>x.magnitude!=='LOW').slice(0,8).flatMap(x=>(x.technicalBasis ?? []).map(b=>`${x.sourceKey}: ${b}`)),
    deepAwareness:'最近工作的真正主题，不只是“顺不顺”，而是你正在累积什么、承担什么、被什么消耗，以及哪些变化已经开始要求你重新选择工作方式。',
    realityBoundary:'现实中的工作量、组织变化、上级关系与身体负荷应直接核实，命盘不能替代这些事实。',
    certaintyLanguage:'NON_DETERMINISTIC'
  };
}

export function buildCareerCurrentStateEvidence(chart,timing){
  assertTiming(timing);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const timingResolution=resolveTimingRelations(chart,timing);
  const evidence=[...natalEvidence(strength,pattern),...timingLayerEvidence(timingResolution.activation),...patternActivationEvidence(timingResolution.activation),...relationEvidence(timingResolution)];
  return {
    version:CAREER_CURRENT_STATE_VERSION,
    questionId:CAREER_CURRENT_STATE_QUESTION.questionId,
    evidence,
    primary:evidence.filter(x=>x.role==='PRIMARY'),
    secondary:evidence.filter(x=>x.role==='SECONDARY'),
    timing:evidence.filter(x=>x.role==='TIMING'),
    modifiers:evidence.filter(x=>x.role==='MODIFIER'),
    sourceSnapshot:{
      strengthBand:strength.strengthBand,
      structureKey:pattern.baseStructure?.key ?? null,
      patternStage:pattern.stage,
      natalStrengthRewritten:timingResolution.natalInvariant.natalStrengthRewritten,
      natalStructureRewritten:timingResolution.natalInvariant.natalStructureRewritten
    }
  };
}

export function synthesizeCareerCurrentState(chart,timing,contextId='CTX_NONE'){
  const context=normalizeContext(contextId);
  const built=buildCareerCurrentStateEvidence(chart,timing);
  const resolution=resolveCareerCurrentState(built.evidence);
  const answer=renderCareerCurrentStateAnswer(resolution.state,contextId,built.evidence);
  return {
    version:CAREER_CURRENT_STATE_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:CAREER_CURRENT_STATE_QUESTION,
    context,
    evidenceStack:built,
    synthesis:{...resolution,contextChangedEvidenceState:false},
    answer,
    trace:[
      `QUESTION=${CAREER_CURRENT_STATE_QUESTION.questionId}`,
      `STRUCTURE=${built.sourceSnapshot.structureKey}`,
      `PATTERN_STAGE=${built.sourceSnapshot.patternStage}`,
      `STRENGTH=${built.sourceSnapshot.strengthBand}`,
      `STATE=${resolution.state}`,
      `SUPPORT=${resolution.dimensions.support}`,
      `RESPONSIBILITY=${resolution.dimensions.responsibility}`,
      `GROWTH=${resolution.dimensions.growth}`,
      `FRICTION=${resolution.dimensions.friction}`,
      `TRANSITION=${resolution.dimensions.transition}`,
      `CONTEXT=${contextId}`,
      'CONTEXT_REWRITES_EVIDENCE=NO',
      'CONTEXT_REWRITES_STATE=NO',
      'NUMERIC_SCORE=NO',
      'PERCENT_CONFIDENCE=NO'
    ]
  };
}
