import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';
import { resolveTimingRelations } from '../../src/timingRelationResolutionEngine.mjs';

export const CAREER_ENTREPRENEURSHIP_VERSION = 'GUANCHENG_CAREER_ENTREPRENEURSHIP_PROTO_V1_STEP02_I1';

export const CAREER_ENTREPRENEURSHIP_QUESTION = Object.freeze({
  questionId:'CAREER_ENTREPRENEURSHIP',
  domain:'CAREER',
  userText:'现在适不适合创业或独立发展？',
  intent:'ASSESS_ENTREPRENEURSHIP_AND_INDEPENDENT_DEVELOPMENT_WINDOW',
  timeHorizon:'CURRENT_TO_NEXT_12_MONTHS',
  evidenceRecipeId:'RECIPE_CAREER_ENTREPRENEURSHIP_V1',
  contextRequired:false,
  contextSetId:'CTX_CAREER_ENTREPRENEURSHIP_OPTIONAL',
  timingRequired:['DAYUN','YEAR'],
  outputTemplate:'CAREER_ENTREPRENEURSHIP_SYNTHESIS_V1'
});

export const CAREER_ENTREPRENEURSHIP_CONTEXTS = Object.freeze({
  CTX_NONE:{label:'不补充现实状态'},
  CTX_EMPLOYED_EXPLORING:{label:'目前有稳定工作，只是在探索独立发展'},
  CTX_SIDE_PROJECT:{label:'已经有副业／个人项目'},
  CTX_HAS_CUSTOMERS_REVENUE:{label:'已经有客户或稳定收入验证'},
  CTX_CAPITAL_PRESSURE:{label:'资金／现金流压力较大'},
  CTX_PARTNER_TEAM:{label:'已经有合伙人或小团队'},
  CTX_ALREADY_INDEPENDENT:{label:'已经全职独立发展／创业'}
});

export const CAREER_ENTREPRENEURSHIP_STATES = Object.freeze([
  'NOT_PRIMARY_WINDOW',
  'PREPARE_SIDE_PATH',
  'INDEPENDENT_GROWTH_WINDOW',
  'ENTREPRENEURIAL_WINDOW',
  'HIGH_RISK_CAUTION'
]);

const MAGNITUDE_ORDER={LOW:1,MODERATE:2,HIGH:3};

function assertTiming(timing){
  if(!timing?.dayun || !timing?.year){
    const e=new Error('CAREER_ENTREPRENEURSHIP requires active Dayun and Year from STEP 01 Core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}

function normalizeContext(contextId='CTX_NONE'){
  if(!CAREER_ENTREPRENEURSHIP_CONTEXTS[contextId]){
    const e=new Error(`Unknown CAREER_ENTREPRENEURSHIP context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:CAREER_ENTREPRENEURSHIP_CONTEXTS[contextId].label,rewritesEvidence:false,rewritesState:false};
}

function finding({id,role,category,sourceType,sourceKey,polarity='NEUTRAL',magnitude='LOW',timingScope='NATAL',certainty='CONFIRMED',tags=[],plainMeaning,technicalBasis=[]}){
  return {id,role,category,sourceType,sourceKey,domainTags:['CAREER'],polarity,magnitude,timingScope,certainty,tags:[...new Set(tags)],plainMeaning,technicalBasis};
}

function natalEvidence(strength,pattern){
  const stage=pattern.stage;
  const polarity=['FORMED','RESCUED'].includes(stage)?'SUPPORTIVE':stage==='BROKEN'?'CHALLENGING':'NEUTRAL';
  return [
    finding({
      id:'CAREER_ENTRE_NATAL_STRUCTURE',role:'PRIMARY',category:'STRUCTURAL',sourceType:'PATTERN_RESOLUTION',
      sourceKey:pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE',polarity,magnitude:polarity==='NEUTRAL'?'LOW':'MODERATE',timingScope:'NATAL',
      tags:['BASELINE','INDEPENDENCE_STRUCTURE'],
      plainMeaning:'原局结构说明长期更偏向组织内发展、个人输出或资源经营，但不能单独证明现在适合创业。',
      technicalBasis:[`StructureKey=${pattern.baseStructure?.key ?? 'NONE'}`,`PatternStage=${stage}`]
    }),
    finding({
      id:'CAREER_ENTRE_NATAL_STRENGTH',role:'SECONDARY',category:'STRUCTURAL',sourceType:'STRENGTH',
      sourceKey:strength.strengthBand,polarity:'NEUTRAL',magnitude:'LOW',timingScope:'NATAL',tags:['BASELINE','CAPACITY'],
      plainMeaning:'日主强弱只用于理解承压与资源需求，不直接等于创业能力或商业成功率。',
      technicalBasis:[`StrengthBand=${strength.strengthBand}`]
    })
  ];
}

const FAMILY_META={
  OUTPUT:{polarity:'SUPPORTIVE',tags:['INDEPENDENCE_DRIVE','MARKET_OUTPUT','PRODUCTIZATION'],plain:'表达、产品输出、专业能力变现与主动创造主题进入当前时运。'},
  WEALTH:{polarity:'SUPPORTIVE',tags:['COMMERCIALIZATION','RESOURCE_MOBILIZATION','MONETIZATION'],plain:'商业资源、交易、客户与现实回报主题进入当前时运。'},
  PEER:{polarity:'MIXED',tags:['INDEPENDENCE_DRIVE','AUTONOMY','COMPETITION'],plain:'自主性、独立决策、竞争与合伙边界更明显。'},
  RESOURCE:{polarity:'SUPPORTIVE',tags:['CAPABILITY_SUPPORT','KNOWLEDGE_SUPPORT','SYSTEM_SUPPORT'],plain:'知识、资历、方法与支撑条件增强，有利于把独立发展做得更稳。'},
  AUTHORITY:{polarity:'MIXED',tags:['ORGANIZATIONAL_DEPENDENCE','REGULATION','RESPONSIBILITY'],plain:'规则、组织责任与制度约束增强，既可能提供结构，也可能限制独立空间。'}
};

function timingLayerEvidence(activation){
  const out=[];
  for(const layer of activation.layers){
    const m=FAMILY_META[layer.stemFamily] ?? {polarity:'NEUTRAL',tags:[],plain:'新的时运主题进入。'};
    out.push(finding({
      id:`CAREER_ENTRE_${layer.layer}_${layer.stemGod}`,role:'TIMING',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.stemGod}_VISIBLE_ENTERED`,polarity:m.polarity,magnitude:'MODERATE',timingScope:layer.layer,tags:m.tags,
      plainMeaning:m.plain,technicalBasis:[`${layer.layer}=${layer.pillar}`,`VisibleTenGod=${layer.stemGod}`]
    }));
    if(layer.branchMainFamily==='OUTPUT') out.push(finding({
      id:`CAREER_ENTRE_${layer.layer}_BRANCH_OUTPUT`,role:'TIMING',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.branchMainGod}_BRANCH_MAIN_ENTERED`,polarity:'SUPPORTIVE',magnitude:'LOW',timingScope:layer.layer,
      tags:['INDEPENDENCE_DRIVE','MARKET_OUTPUT'],plainMeaning:'当前时运的地支主气也加强个人输出与市场表达。',
      technicalBasis:[`${layer.layer}=${layer.pillar}`,`BranchMainTenGod=${layer.branchMainGod}`]
    }));
    if(layer.branchMainFamily==='WEALTH') out.push(finding({
      id:`CAREER_ENTRE_${layer.layer}_BRANCH_WEALTH`,role:'TIMING',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.branchMainGod}_BRANCH_MAIN_ENTERED`,polarity:'SUPPORTIVE',magnitude:'LOW',timingScope:layer.layer,
      tags:['COMMERCIALIZATION','RESOURCE_MOBILIZATION'],plainMeaning:'当前时运的地支主气也加强交易、资源与现实回报主题。',
      technicalBasis:[`${layer.layer}=${layer.pillar}`,`BranchMainTenGod=${layer.branchMainGod}`]
    }));
    if(layer.branchMainFamily==='RESOURCE') out.push(finding({
      id:`CAREER_ENTRE_${layer.layer}_BRANCH_RESOURCE`,role:'SECONDARY',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.branchMainGod}_BRANCH_MAIN_ENTERED`,polarity:'SUPPORTIVE',magnitude:'LOW',timingScope:layer.layer,
      tags:['CAPABILITY_SUPPORT','SYSTEM_SUPPORT'],plainMeaning:'当前时运存在知识、方法或体系承接支持。',
      technicalBasis:[`${layer.layer}=${layer.pillar}`,`BranchMainTenGod=${layer.branchMainGod}`]
    }));
  }
  return out;
}

function patternActivationEvidence(activation){
  return activation.patternActivation.map((x,i)=>{
    let polarity='MIXED',magnitude='MODERATE',tags=['BUSINESS_STRUCTURE_ACTIVATED'];
    if(x.key==='OUTPUT_GENERATES_WEALTH_ACTIVATED'){
      polarity='SUPPORTIVE';magnitude='HIGH';tags.push('MARKET_OUTPUT','COMMERCIALIZATION','MONETIZATION');
    } else if(x.classification==='PATTERN_SUPPORT_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='HIGH';tags.push('CAPABILITY_SUPPORT','SYSTEM_SUPPORT');
    } else if(x.classification==='PATTERN_ROUTE_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='HIGH';tags.push('INDEPENDENCE_DRIVE','COMMERCIALIZATION');
    } else if(x.classification==='PATTERN_PRESSURE_CANDIDATE'){
      polarity='CHALLENGING';magnitude='HIGH';tags.push('FRICTION','RISK_LOAD','ORGANIZATIONAL_DEPENDENCE');
    } else if(x.classification==='PATTERN_COMPLEXITY_REVIEW'){
      polarity='MIXED';magnitude='MODERATE';tags.push('FRICTION','REVIEW');
    }
    return finding({
      id:`CAREER_ENTRE_PATTERN_${i}_${x.key}`,role:'PRIMARY',category:'TIMING',sourceType:'PATTERN_ACTIVATION',sourceKey:x.key,
      polarity,magnitude,timingScope:x.layer,certainty:'CONDITIONAL',tags,
      plainMeaning:polarity==='SUPPORTIVE'?'当前时运出现有利于个人输出、资源经营或独立承接的结构路线。':polarity==='CHALLENGING'?'当前时运更像责任、制度或摩擦增加，创业决策需要更强现实缓冲。':'当前结构进入复杂调整，独立发展与风险需要同时核实。',
      technicalBasis:[`Layer=${x.layer}`,`Activation=${x.key}`,`Class=${x.classification}`]
    });
  });
}

function relationEvidence(timingResolution){
  const out=[];let seq=0;
  for(const c of timingResolution.clashes.filter(x=>x.originLayer!=='NATAL')){
    if(c.status==='ACTIVE') out.push(finding({
      id:`CAREER_ENTRE_REL_${seq++}_CLASH`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_CLASH',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,tags:['TRANSITION','INDEPENDENCE_DRIVE'],
      plainMeaning:'现有职业环境或工作方式更容易出现调整，为独立发展带来变化空间，但变化本身不是创业成功信号。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
    else if(String(c.status).includes('REVIEW')) out.push(finding({
      id:`CAREER_ENTRE_REL_${seq++}_CLASH_REVIEW`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MULTI_RELATION_REVIEW',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,certainty:'CONDITIONAL',tags:['TRANSITION','FRICTION','REVIEW'],
      plainMeaning:'多个关系同时作用，独立发展的机会与风险需要分开核实。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
  }
  for(const p of timingResolution.punishments.filter(x=>x.originLayer!=='NATAL')){
    if(['ACTIVE','ACTIVE_COMPLETE'].includes(p.status)) out.push(finding({
      id:`CAREER_ENTRE_REL_${seq++}_PUNISHMENT`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_PUNISHMENT',
      polarity:'CHALLENGING',magnitude:p.status==='ACTIVE_COMPLETE'?'HIGH':'MODERATE',timingScope:p.originLayer,tags:['FRICTION','RISK_LOAD'],
      plainMeaning:'反复消耗或压力更容易增加，创业时尤其需要避免把压力推动误当成商业机会。',technicalBasis:[`Origin=${p.originLayer}`,`Status=${p.status}`]
    }));
  }
  for(const a of timingResolution.assemblies.filter(x=>x.originLayer!=='NATAL')){
    if(['FORMATION_COMPLETED_BY_TIMING','FORMATION_CONFIRMED'].includes(a.status)) out.push(finding({
      id:`CAREER_ENTRE_REL_${seq++}_ASSEMBLY`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_ASSEMBLY',sourceKey:a.type,
      polarity:'MIXED',magnitude:'MODERATE',timingScope:a.originLayer,tags:['RESOURCE_RECONFIGURATION','TRANSITION'],
      plainMeaning:'资源、合作方式或工作结构更容易重新组合，可作为独立发展准备，但仍要核实市场与资金。',technicalBasis:[`Origin=${a.originLayer}`,`Type=${a.type}`]
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

export function resolveCareerEntrepreneurshipState(evidence){
  const active=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER');
  const independence=band(active,['INDEPENDENCE_DRIVE','AUTONOMY','MARKET_OUTPUT']);
  const commercialization=band(active,['COMMERCIALIZATION','MONETIZATION','RESOURCE_MOBILIZATION'],{supportiveOnly:true});
  const support=band(active,['CAPABILITY_SUPPORT','KNOWLEDGE_SUPPORT','SYSTEM_SUPPORT'],{supportiveOnly:true});
  const transition=band(active,['TRANSITION','RESOURCE_RECONFIGURATION']);
  const friction=band(active,['FRICTION','RISK_LOAD'],{challengingOnly:true});

  let state='NOT_PRIMARY_WINDOW';
  if(friction==='STRONG' && (commercialization==='NONE' || support==='NONE')) state='HIGH_RISK_CAUTION';
  else if(independence==='STRONG' && commercialization==='STRONG' && support!=='NONE' && friction!=='STRONG') state='ENTREPRENEURIAL_WINDOW';
  else if(independence==='STRONG' && commercialization!=='NONE' && friction!=='STRONG') state='INDEPENDENT_GROWTH_WINDOW';
  else if(independence!=='NONE' || commercialization!=='NONE' || transition!=='NONE') state='PREPARE_SIDE_PATH';

  return {
    state,
    dimensions:{independence,commercialization,support,transition,friction},
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

const STATE_COPY=Object.freeze({
  NOT_PRIMARY_WINDOW:{
    direct:'目前还不是很明确的创业窗口，更适合先把专业能力、资源与现实条件做厚。',
    current:'当前独立驱动力、商业承接与资源支持没有形成足够清楚的组合，贸然全职创业的依据不足。',
    development:'可以继续观察市场、整理能力与可售卖价值，但不需要为了创业而创业。',
    caution:'没有明显创业信号不代表不能做生意，只代表现实验证比命理时机更重要。'
  },
  PREPARE_SIDE_PATH:{
    direct:'可以开始准备独立发展，但更适合先用副业、项目或小规模验证，而不是一次性全部切换。',
    current:'当前已经出现自主、变化或商业主题，但承接条件还没有同时成熟。',
    development:'先验证客户、产品、定价与现金流，再决定是否扩大投入。',
    caution:'独立意愿增强不等于商业模式已经成立。'
  },
  INDEPENDENT_GROWTH_WINDOW:{
    direct:'现在比较适合扩大独立发展的比重，但仍建议分阶段增加，而不是把所有风险集中到一次决定。',
    current:'个人输出与商业主题都有明显激活，独立发展的空间比单纯维持原状更值得经营。',
    development:'可以增加个人项目、客户来源或自主收入占比，并用现实数据判断是否继续放大。',
    caution:'适合独立发展不等于必须辞职注册公司；路径可以是副业、顾问、自由职业或逐步创业。'
  },
  ENTREPRENEURIAL_WINDOW:{
    direct:'当前确实进入较强的创业／独立发展窗口，但是否正式投入仍要由市场、资金与商业模型确认。',
    current:'自主输出、商业承接与支撑条件同时增强，具备把能力转成独立项目或业务的时运基础。',
    development:'如果已经有真实客户、产品验证和资金缓冲，可以认真评估扩大规模或正式独立。',
    caution:'命盘不能证明产品有市场、公司会盈利或融资一定成功，现实商业验证仍是最终依据。'
  },
  HIGH_RISK_CAUTION:{
    direct:'现在想脱离原有结构的力量可能很强，但更需要防止把压力、焦虑或冲突误当成创业机会。',
    current:'变化与摩擦较强，但商业承接或资源支持不足，直接全职创业的风险偏高。',
    development:'先保留现金流、降低固定成本，并用小规模测试确认真实需求，再决定是否放大。',
    caution:'不要因为当前工作难受，就自动把“自己做”理解成风险更低。'
  }
});

function contextAction(contextId,state){
  const map={
    CTX_NONE:null,
    CTX_EMPLOYED_EXPLORING:'目前有稳定工作时，优先用低成本方式测试需求，不必先切断现有现金流。',
    CTX_SIDE_PROJECT:'已经有副业时，把客户复购、利润、交付时间与个人精力记录下来，再判断是否扩大。',
    CTX_HAS_CUSTOMERS_REVENUE:'已经有客户或收入验证时，重点检查收入是否可重复、是否依赖少数客户，以及现金流能否覆盖固定成本。',
    CTX_CAPITAL_PRESSURE:'资金压力较大时，现实现金流优先级高于创业时机判断，先控制投入与生存周期。',
    CTX_PARTNER_TEAM:'已有合伙人或团队时，把股权、职责、决策权、退出机制与资金责任写清楚。',
    CTX_ALREADY_INDEPENDENT:'已经全职独立时，不再讨论“要不要辞职”，重点转向客户稳定、现金流与可持续运营。'
  };
  return Object.prototype.hasOwnProperty.call(map,contextId) ? map[contextId] : STATE_COPY[state].development;
}

export function renderCareerEntrepreneurshipAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!CAREER_ENTREPRENEURSHIP_STATES.includes(state)) throw new Error(`Unknown CAREER_ENTREPRENEURSHIP state: ${state}`);
  normalizeContext(contextId);
  const copy=STATE_COPY[state];
  const why=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER').slice().sort((a,b)=>MAGNITUDE_ORDER[b.magnitude]-MAGNITUDE_ORDER[a.magnitude]).slice(0,4).map(x=>x.plainMeaning);
  const actions=[contextAction(contextId,state),copy.development,'把客户需求、收入来源、成本、现金流与个人可承受风险分开验证，不要只看“想不想做”。'].filter(Boolean);
  const uniqueActions=[...new Set(actions)].slice(0,3);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    development:copy.development,
    actions:uniqueActions,
    caution:copy.caution,
    why,
    technicalBasis:evidence.filter(x=>x.magnitude!=='LOW').slice(0,8).flatMap(x=>(x.technicalBasis ?? []).map(b=>`${x.sourceKey}: ${b}`)),
    deepAwareness:'独立发展真正要区分的是“想拥有更多自主权”与“已经拥有可重复的商业承接”。前者可以推动探索，后者才决定是否值得扩大投入。',
    realityBoundary:'真实创业仍取决于市场需求、产品竞争力、客户、现金流、成本、法规、合同、团队与资金条件；命盘只能判断当前独立、输出与商业主题是否更容易被激活。',
    certaintyLanguage:'NON_DETERMINISTIC'
  };
}

export function buildCareerEntrepreneurshipEvidence(chart,timing){
  assertTiming(timing);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const timingResolution=resolveTimingRelations(chart,timing);
  const evidence=[...natalEvidence(strength,pattern),...timingLayerEvidence(timingResolution.activation),...patternActivationEvidence(timingResolution.activation),...relationEvidence(timingResolution)];
  return {
    version:CAREER_ENTREPRENEURSHIP_VERSION,
    questionId:CAREER_ENTREPRENEURSHIP_QUESTION.questionId,
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

export function synthesizeCareerEntrepreneurship(chart,timing,contextId='CTX_NONE'){
  const context=normalizeContext(contextId);
  const built=buildCareerEntrepreneurshipEvidence(chart,timing);
  const resolution=resolveCareerEntrepreneurshipState(built.evidence);
  const answer=renderCareerEntrepreneurshipAnswer(resolution.state,contextId,built.evidence);
  return {
    version:CAREER_ENTREPRENEURSHIP_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:CAREER_ENTREPRENEURSHIP_QUESTION,
    context,
    evidenceStack:built,
    synthesis:{...resolution,contextChangedEvidenceState:false},
    answer,
    trace:[
      `QUESTION=${CAREER_ENTREPRENEURSHIP_QUESTION.questionId}`,
      `STRUCTURE=${built.sourceSnapshot.structureKey}`,
      `PATTERN_STAGE=${built.sourceSnapshot.patternStage}`,
      `STRENGTH=${built.sourceSnapshot.strengthBand}`,
      `STATE=${resolution.state}`,
      `INDEPENDENCE=${resolution.dimensions.independence}`,
      `COMMERCIALIZATION=${resolution.dimensions.commercialization}`,
      `SUPPORT=${resolution.dimensions.support}`,
      `TRANSITION=${resolution.dimensions.transition}`,
      `FRICTION=${resolution.dimensions.friction}`,
      `CONTEXT=${contextId}`,
      'CONTEXT_REWRITES_EVIDENCE=NO',
      'CONTEXT_REWRITES_STATE=NO',
      'INDEPENDENT_DEVELOPMENT_IS_NOT_AUTO_RESIGNATION=YES',
      'WEALTH_STAR_IS_NOT_BUSINESS_SUCCESS=YES',
      'NUMERIC_SCORE=NO',
      'PERCENT_CONFIDENCE=NO'
    ]
  };
}
