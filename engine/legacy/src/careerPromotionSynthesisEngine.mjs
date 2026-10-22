import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';
import { resolveTimingRelations } from '../../src/timingRelationResolutionEngine.mjs';

export const CAREER_PROMOTION_VERSION = 'GUANCHENG_CAREER_PROMOTION_PROTO_V1_STEP02_H1';

export const CAREER_PROMOTION_QUESTION = Object.freeze({
  questionId:'CAREER_PROMOTION',
  domain:'CAREER',
  userText:'近期有没有升职／承担更大职责的机会？',
  intent:'ASSESS_ROLE_UPGRADE_AND_RESPONSIBILITY_WINDOW',
  timeHorizon:'CURRENT_TO_NEXT_12_MONTHS',
  evidenceRecipeId:'RECIPE_CAREER_PROMOTION_V1',
  contextRequired:false,
  contextSetId:'CTX_CAREER_PROMOTION_OPTIONAL',
  timingRequired:['DAYUN','YEAR'],
  outputTemplate:'CAREER_PROMOTION_SYNTHESIS_V1'
});

export const CAREER_PROMOTION_CONTEXTS = Object.freeze({
  CTX_NONE:{label:'不补充现实状态'},
  CTX_MANAGER_MENTIONED_GROWTH:{label:'主管已经提过升职或扩大职责'},
  CTX_REVIEW_PENDING:{label:'即将进行绩效／晋升评审'},
  CTX_MORE_RESPONSIBILITY_ALREADY:{label:'已经开始承担更多职责'},
  CTX_TITLE_ONLY_CHANGE:{label:'有头衔变化，但权限／薪资未确认'},
  CTX_RESOURCE_NOT_MATCHING:{label:'责任增加，但资源或权限没有跟上'},
  CTX_ORG_RESTRUCTURING:{label:'团队／公司正在重组'}
});

export const CAREER_PROMOTION_STATES = Object.freeze([
  'NO_CLEAR_UPGRADE_SIGNAL',
  'RESPONSIBILITY_EXPANDING',
  'RECOGNITION_BUILDING',
  'FORMAL_UPGRADE_WINDOW',
  'RESPONSIBILITY_WITHOUT_SUPPORT_CAUTION'
]);

const MAGNITUDE_ORDER={LOW:1,MODERATE:2,HIGH:3};

function assertTiming(timing){
  if(!timing?.dayun || !timing?.year){
    const e=new Error('CAREER_PROMOTION requires active Dayun and Year from STEP 01 Core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}
function normalizeContext(contextId='CTX_NONE'){
  if(!CAREER_PROMOTION_CONTEXTS[contextId]){
    const e=new Error(`Unknown CAREER_PROMOTION context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:CAREER_PROMOTION_CONTEXTS[contextId].label,rewritesEvidence:false,rewritesState:false};
}
function finding({id,role,category,sourceType,sourceKey,polarity='NEUTRAL',magnitude='LOW',timingScope='NATAL',certainty='CONFIRMED',tags=[],plainMeaning,technicalBasis=[]}){
  return {id,role,category,sourceType,sourceKey,domainTags:['CAREER'],polarity,magnitude,timingScope,certainty,tags:[...new Set(tags)],plainMeaning,technicalBasis};
}

function natalEvidence(strength,pattern){
  const stage=pattern.stage;
  const polarity=['FORMED','RESCUED'].includes(stage)?'SUPPORTIVE':stage==='BROKEN'?'CHALLENGING':'NEUTRAL';
  return [
    finding({
      id:'CAREER_PROMOTION_NATAL_STRUCTURE',role:'PRIMARY',category:'STRUCTURAL',sourceType:'PATTERN_RESOLUTION',
      sourceKey:pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE',polarity,magnitude:polarity==='NEUTRAL'?'LOW':'MODERATE',timingScope:'NATAL',
      tags:['BASELINE','ROLE_STRUCTURE'],
      plainMeaning:'原局结构说明长期承担职责与进入组织角色的方式，但不能单独证明近期一定升职。',
      technicalBasis:[`StructureKey=${pattern.baseStructure?.key ?? 'NONE'}`,`PatternStage=${stage}`]
    }),
    finding({
      id:'CAREER_PROMOTION_NATAL_STRENGTH',role:'SECONDARY',category:'STRUCTURAL',sourceType:'STRENGTH',
      sourceKey:strength.strengthBand,polarity:'NEUTRAL',magnitude:'LOW',timingScope:'NATAL',tags:['BASELINE','CAPACITY'],
      plainMeaning:'日主强弱只用于理解承压与资源需求，不直接等同升职机会。',
      technicalBasis:[`StrengthBand=${strength.strengthBand}`]
    })
  ];
}

const FAMILY_META={
  AUTHORITY:{polarity:'SUPPORTIVE',tags:['RESPONSIBILITY','ROLE_VISIBILITY','FORMAL_ROLE_SIGNAL'],plain:'职位、职责、规则或组织角色主题进入当前时运。'},
  RESOURCE:{polarity:'SUPPORTIVE',tags:['ORGANIZATIONAL_SUPPORT','CREDENTIAL_SUPPORT','RECOGNITION_SUPPORT'],plain:'支持、资历、学习与被体系承接的条件增强。'},
  WEALTH:{polarity:'SUPPORTIVE',tags:['MATERIAL_SUPPORT','RESULT_SUPPORT'],plain:'资源、成果与现实回报主题进入当前时运。'},
  OUTPUT:{polarity:'MIXED',tags:['VISIBILITY','PERFORMANCE_EXPOSURE'],plain:'表达、输出、成果呈现与主动争取更容易被看见。'},
  PEER:{polarity:'MIXED',tags:['COMPETITION','VISIBILITY'],plain:'同侪竞争、自主性与自我主张更明显。'}
};

function timingLayerEvidence(activation){
  const out=[];
  for(const layer of activation.layers){
    const m=FAMILY_META[layer.stemFamily] ?? {polarity:'NEUTRAL',tags:[],plain:'新的时运主题进入。'};
    out.push(finding({
      id:`CAREER_PROMOTION_${layer.layer}_${layer.stemGod}`,role:'TIMING',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.stemGod}_VISIBLE_ENTERED`,polarity:m.polarity,magnitude:'MODERATE',timingScope:layer.layer,tags:m.tags,
      plainMeaning:m.plain,technicalBasis:[`${layer.layer}=${layer.pillar}`,`VisibleTenGod=${layer.stemGod}`]
    }));
    if(layer.branchMainFamily==='AUTHORITY') out.push(finding({
      id:`CAREER_PROMOTION_${layer.layer}_BRANCH_AUTHORITY`,role:'TIMING',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.branchMainGod}_BRANCH_MAIN_ENTERED`,polarity:'SUPPORTIVE',magnitude:'MODERATE',timingScope:layer.layer,
      tags:['RESPONSIBILITY','FORMAL_ROLE_SIGNAL'],plainMeaning:'当前时运的地支主气也强调职位、规则或责任主题。',
      technicalBasis:[`${layer.layer}=${layer.pillar}`,`BranchMainTenGod=${layer.branchMainGod}`]
    }));
    if(layer.branchMainFamily==='RESOURCE') out.push(finding({
      id:`CAREER_PROMOTION_${layer.layer}_BRANCH_RESOURCE`,role:'SECONDARY',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.branchMainGod}_BRANCH_MAIN_ENTERED`,polarity:'SUPPORTIVE',magnitude:'LOW',timingScope:layer.layer,
      tags:['ORGANIZATIONAL_SUPPORT','RECOGNITION_SUPPORT'],plainMeaning:'当前时运存在体系承接、学习或资历支持。',
      technicalBasis:[`${layer.layer}=${layer.pillar}`,`BranchMainTenGod=${layer.branchMainGod}`]
    }));
  }
  return out;
}

function patternActivationEvidence(activation){
  return activation.patternActivation.map((x,i)=>{
    let polarity='MIXED',magnitude='MODERATE',tags=['ROLE_STRUCTURE_ACTIVATED'];
    if(x.classification==='PATTERN_SUPPORT_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='HIGH';tags.push('ORGANIZATIONAL_SUPPORT','RECOGNITION_SUPPORT');
    } else if(x.classification==='PATTERN_ROUTE_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='HIGH';tags.push('RESPONSIBILITY','FORMAL_ROLE_SIGNAL','ROLE_VISIBILITY');
    } else if(x.classification==='PATTERN_PRESSURE_CANDIDATE'){
      polarity='CHALLENGING';magnitude='HIGH';tags.push('FRICTION','PRESSURE_WITHOUT_SUPPORT');
    } else if(x.classification==='PATTERN_COMPLEXITY_REVIEW'){
      polarity='MIXED';magnitude='MODERATE';tags.push('FRICTION','REVIEW');
    }
    return finding({
      id:`CAREER_PROMOTION_PATTERN_${i}_${x.key}`,role:'PRIMARY',category:'TIMING',sourceType:'PATTERN_ACTIVATION',sourceKey:x.key,
      polarity,magnitude,timingScope:x.layer,certainty:'CONDITIONAL',tags,
      plainMeaning:polarity==='SUPPORTIVE'?'当前时运对职位、责任或组织承接形成可利用的支持路线。':polarity==='CHALLENGING'?'当前时运更像责任或压力增加，不能直接当成实质升职。':'当前职位结构进入复杂调整，需要现实核实权限、资源与正式职级。',
      technicalBasis:[`Layer=${x.layer}`,`Activation=${x.key}`,`Class=${x.classification}`]
    });
  });
}

function relationEvidence(timingResolution){
  const out=[];let seq=0;
  for(const c of timingResolution.clashes.filter(x=>x.originLayer!=='NATAL')){
    if(c.status==='ACTIVE') out.push(finding({
      id:`CAREER_PROMOTION_REL_${seq++}_CLASH`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_CLASH',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,tags:['ROLE_CHANGE','VISIBILITY'],
      plainMeaning:'工作角色或组织环境更容易发生调整，但变化本身不等于升职。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
    else if(String(c.status).includes('REVIEW')) out.push(finding({
      id:`CAREER_PROMOTION_REL_${seq++}_CLASH_REVIEW`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MULTI_RELATION_REVIEW',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,certainty:'CONDITIONAL',tags:['ROLE_CHANGE','FRICTION','REVIEW'],
      plainMeaning:'多个关系同时作用，职位变化与压力需要分开核实。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
  }
  for(const p of timingResolution.punishments.filter(x=>x.originLayer!=='NATAL')){
    if(['ACTIVE','ACTIVE_COMPLETE'].includes(p.status)) out.push(finding({
      id:`CAREER_PROMOTION_REL_${seq++}_PUNISHMENT`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_PUNISHMENT',
      polarity:'CHALLENGING',magnitude:p.status==='ACTIVE_COMPLETE'?'HIGH':'MODERATE',timingScope:p.originLayer,tags:['FRICTION','PRESSURE_WITHOUT_SUPPORT'],
      plainMeaning:'责任、摩擦或反复消耗更容易增加，不能把“更忙”直接理解为升职。',technicalBasis:[`Origin=${p.originLayer}`,`Status=${p.status}`]
    }));
  }
  for(const a of timingResolution.assemblies.filter(x=>x.originLayer!=='NATAL')){
    if(['FORMATION_COMPLETED_BY_TIMING','FORMATION_CONFIRMED'].includes(a.status)) out.push(finding({
      id:`CAREER_PROMOTION_REL_${seq++}_ASSEMBLY`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_ASSEMBLY',sourceKey:a.type,
      polarity:'MIXED',magnitude:'MODERATE',timingScope:a.originLayer,tags:['ROLE_CHANGE','ORGANIZATIONAL_RECONFIGURATION'],
      plainMeaning:'组织资源或职责配置更容易重新组合，需要确认是否形成真正的职级与权限升级。',technicalBasis:[`Origin=${a.originLayer}`,`Type=${a.type}`]
    }));
  }
  return out;
}

function srcCount(items){return new Set(items.map(x=>`${x.sourceType}:${x.sourceKey}`)).size;}
function band(evidence,tags,{supportiveOnly=false,challengingOnly=false}={}){
  const xs=evidence.filter(x=>tags.some(t=>x.tags.includes(t)) && (!supportiveOnly || x.polarity==='SUPPORTIVE') && (!challengingOnly || x.polarity==='CHALLENGING'));
  const high=xs.some(x=>x.magnitude==='HIGH');
  if(high || srcCount(xs)>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveCareerPromotionState(evidence){
  const active=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER');
  const responsibility=band(active,['RESPONSIBILITY','FORMAL_ROLE_SIGNAL']);
  const visibility=band(active,['ROLE_VISIBILITY','VISIBILITY','PERFORMANCE_EXPOSURE']);
  const recognition=band(active,['RECOGNITION_SUPPORT','ORGANIZATIONAL_SUPPORT','CREDENTIAL_SUPPORT'],{supportiveOnly:true});
  const material=band(active,['MATERIAL_SUPPORT','RESULT_SUPPORT'],{supportiveOnly:true});
  const friction=band(active,['FRICTION','PRESSURE_WITHOUT_SUPPORT'],{challengingOnly:true});

  let state='NO_CLEAR_UPGRADE_SIGNAL';
  if(responsibility==='STRONG' && recognition!=='NONE' && friction!=='STRONG') state='FORMAL_UPGRADE_WINDOW';
  else if(responsibility!=='NONE' && friction==='STRONG' && recognition==='NONE') state='RESPONSIBILITY_WITHOUT_SUPPORT_CAUTION';
  else if((visibility==='STRONG' || recognition==='STRONG') && responsibility!=='NONE') state='RECOGNITION_BUILDING';
  else if(responsibility!=='NONE') state='RESPONSIBILITY_EXPANDING';
  else if(visibility==='STRONG' && recognition!=='NONE') state='RECOGNITION_BUILDING';

  return {state,dimensions:{responsibility,visibility,recognition,material,friction},numericScoreUsed:false,percentConfidenceUsed:false};
}

const STATE_COPY=Object.freeze({
  NO_CLEAR_UPGRADE_SIGNAL:{
    direct:'近期还没有形成很清楚的升职信号，更适合先把成果、可见度与筹码做实。',
    current:'当前时运没有同时形成“职责上升 + 组织承接”的完整组合，所以不宜仅凭忙碌或变化就判断要升职。',
    development:'先让成果、职责边界与组织认可变得更明确，再观察是否出现正式评审、职级或权限变化。',
    caution:'没有明显升职信号不等于没有成长，重点是把正在做的价值转成可被组织看见的成果。'
  },
  RESPONSIBILITY_EXPANDING:{
    direct:'近期更明显的是职责扩大，可能先承担更多，再观察是否转成正式职级升级。',
    current:'责任主题已经进入，但组织认可、权限或资源未必同步到位，因此更像“先做更大的事”。',
    development:'把新增职责写清楚，确认目标、权限、资源和评审节点，避免长期只增加工作量。',
    caution:'职责增加不等于升职，尤其要区分“被交更多工作”与“正式扩大角色”。'
  },
  RECOGNITION_BUILDING:{
    direct:'近期有被看见与被认可的累积机会，但正式升职更像是在形成中。',
    current:'成果可见度、组织支持或职责主题开始互相配合，适合把表现转成更明确的角色讨论。',
    development:'主动确认评价标准、晋升路径和下一层级需要证明的成果，让认可有机会落到正式机制。',
    caution:'被认可、被依赖和真正升职是三件不同的事，仍需现实确认职级、权限与回报。'
  },
  FORMAL_UPGRADE_WINDOW:{
    direct:'近期存在较明确的职责／职级升级窗口，可以认真推进正式的升职或角色升级讨论。',
    current:'职责主题与组织承接同时增强，当前更有条件把新增责任转成正式职位、权限或职级变化。',
    development:'把成果、职责范围、权限、薪资与生效时间一起谈清楚，避免只得到模糊承诺。',
    caution:'即使时机支持，也不能替代公司的晋升制度、预算、岗位空缺与正式批准。'
  },
  RESPONSIBILITY_WITHOUT_SUPPORT_CAUTION:{
    direct:'近期责任可能增加，但承接与支持不足，要小心“工作升级了，职位却没有升级”。',
    current:'压力与责任信号较强，但组织认可、资源或正式承接没有同步增强，因此更像负荷上升。',
    development:'先确认权限、资源、汇报关系与回报，再决定是否继续承接更多职责。',
    caution:'不要把高负荷、救火或临时接盘误认为正式升职机会。'
  }
});

function contextAction(contextId,state){
  const map={
    CTX_NONE:null,
    CTX_MANAGER_MENTIONED_GROWTH:'主管已经提过成长空间时，要求把下一步条件、时间点和评审标准说清楚。',
    CTX_REVIEW_PENDING:'即将评审时，优先整理可量化成果、职责变化和对组织产生的实际价值。',
    CTX_MORE_RESPONSIBILITY_ALREADY:'已经承担更多职责时，把新增范围、持续时间、权限和对应回报明确记录下来。',
    CTX_TITLE_ONLY_CHANGE:'只有头衔变化时，继续确认薪资、权限、团队资源与职责是否同步升级。',
    CTX_RESOURCE_NOT_MATCHING:'责任增加但资源不足时，先谈资源与权限，不要把单纯加压当成晋升。',
    CTX_ORG_RESTRUCTURING:'组织重组时，先核实岗位是否真实保留、汇报线怎么变、职级调整是否正式批准。'
  };
  return Object.prototype.hasOwnProperty.call(map,contextId) ? map[contextId] : STATE_COPY[state].development;
}

export function renderCareerPromotionAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!CAREER_PROMOTION_STATES.includes(state)) throw new Error(`Unknown CAREER_PROMOTION state: ${state}`);
  normalizeContext(contextId);
  const copy=STATE_COPY[state];
  const why=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER').slice().sort((a,b)=>MAGNITUDE_ORDER[b.magnitude]-MAGNITUDE_ORDER[a.magnitude]).slice(0,4).map(x=>x.plainMeaning);
  const actions=[contextAction(contextId,state),copy.development,'把“新增工作量、正式职责、权限、职级、薪资”分开记录，避免把它们混成同一件事。'].filter(Boolean).slice(0,3);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    development:copy.development,
    actions,
    caution:copy.caution,
    why,
    technicalBasis:evidence.filter(x=>x.magnitude!=='LOW').slice(0,8).flatMap(x=>(x.technicalBasis ?? []).map(b=>`${x.sourceKey}: ${b}`)),
    deepAwareness:'升职真正需要观察的，不只是“有没有更多责任”，而是责任、认可、权限、资源与回报是否一起向上移动。',
    realityBoundary:'真实升职仍取决于公司的岗位、预算、评审制度、上级决定与正式文件；命盘只能判断当前职责与组织角色主题是否更容易被激活。',
    certaintyLanguage:'NON_DETERMINISTIC'
  };
}

export function buildCareerPromotionEvidence(chart,timing){
  assertTiming(timing);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const timingResolution=resolveTimingRelations(chart,timing);
  const evidence=[...natalEvidence(strength,pattern),...timingLayerEvidence(timingResolution.activation),...patternActivationEvidence(timingResolution.activation),...relationEvidence(timingResolution)];
  return {
    version:CAREER_PROMOTION_VERSION,
    questionId:CAREER_PROMOTION_QUESTION.questionId,
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

export function synthesizeCareerPromotion(chart,timing,contextId='CTX_NONE'){
  const context=normalizeContext(contextId);
  const built=buildCareerPromotionEvidence(chart,timing);
  const resolution=resolveCareerPromotionState(built.evidence);
  const answer=renderCareerPromotionAnswer(resolution.state,contextId,built.evidence);
  return {
    version:CAREER_PROMOTION_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:CAREER_PROMOTION_QUESTION,
    context,
    evidenceStack:built,
    synthesis:{...resolution,contextChangedEvidenceState:false},
    answer,
    trace:[
      `QUESTION=${CAREER_PROMOTION_QUESTION.questionId}`,
      `STRUCTURE=${built.sourceSnapshot.structureKey}`,
      `PATTERN_STAGE=${built.sourceSnapshot.patternStage}`,
      `STRENGTH=${built.sourceSnapshot.strengthBand}`,
      `STATE=${resolution.state}`,
      `RESPONSIBILITY=${resolution.dimensions.responsibility}`,
      `VISIBILITY=${resolution.dimensions.visibility}`,
      `RECOGNITION=${resolution.dimensions.recognition}`,
      `MATERIAL=${resolution.dimensions.material}`,
      `FRICTION=${resolution.dimensions.friction}`,
      `CONTEXT=${contextId}`,
      'CONTEXT_REWRITES_EVIDENCE=NO',
      'CONTEXT_REWRITES_STATE=NO',
      'RESPONSIBILITY_IS_NOT_PROMOTION=YES',
      'TITLE_IS_NOT_SUBSTANTIVE_UPGRADE=YES',
      'NUMERIC_SCORE=NO',
      'PERCENT_CONFIDENCE=NO'
    ]
  };
}
