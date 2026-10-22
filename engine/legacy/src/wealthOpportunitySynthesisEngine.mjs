import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';
import { resolveTimingRelations } from '../../src/timingRelationResolutionEngine.mjs';

export const WEALTH_OPPORTUNITY_VERSION = 'GUANCHENG_WEALTH_OPPORTUNITY_PROTO_V1_STEP02_N3';

export const WEALTH_OPPORTUNITY_QUESTION = Object.freeze({
  questionId:'WEALTH_OPPORTUNITY',
  domain:'WEALTH',
  userText:'接下来有没有比较明显的财富机会？',
  intent:'ASSESS_WEALTH_OPPORTUNITY_WINDOW',
  timeHorizon:'CURRENT_TO_NEXT_6_MONTHS',
  evidenceRecipeId:'RECIPE_WEALTH_OPPORTUNITY_V1',
  contextRequired:false,
  contextSetId:'CTX_WEALTH_OPPORTUNITY_OPTIONAL',
  timingRequired:['DAYUN','YEAR'],
  outputTemplate:'WEALTH_OPPORTUNITY_SYNTHESIS_V1'
});

export const WEALTH_OPPORTUNITY_CONTEXTS = Object.freeze({
  CTX_NONE:{label:'不补充现实机会类型'},
  CTX_SALARIED:{label:'目前以固定薪资／主业为主'},
  CTX_SELF_EMPLOYED:{label:'目前以自营／接案为主'},
  CTX_BUSINESS_OWNER:{label:'目前经营生意／品牌／公司'},
  CTX_NEW_PROJECT:{label:'近期出现新项目／新客户／新渠道'},
  CTX_PARTNERSHIP_DEAL:{label:'近期出现合作／分成／联营机会'},
  CTX_CAPITAL_CONSTRAINED:{label:'现实现金流或可投入资金偏紧'},
  CTX_OPPORTUNITY_UNCLEAR:{label:'目前只有口头／初步机会，条件尚未清楚'}
});

export const WEALTH_OPPORTUNITY_STATES = Object.freeze([
  'NO_CLEAR_OPPORTUNITY_WINDOW',
  'OPPORTUNITY_SIGNAL_EMERGING',
  'RESOURCE_ACCESS_WINDOW',
  'MONETIZATION_WINDOW',
  'MIXED_OPPORTUNITY_CAUTION'
]);

const MAGNITUDE_ORDER={LOW:1,MODERATE:2,HIGH:3};

function assertTiming(timing){
  if(!timing?.dayun || !timing?.year){
    const e=new Error('WEALTH_OPPORTUNITY requires active Dayun and Year from STEP 01 Core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}

function normalizeContext(contextId='CTX_NONE'){
  if(!WEALTH_OPPORTUNITY_CONTEXTS[contextId]){
    const e=new Error(`Unknown WEALTH_OPPORTUNITY context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:WEALTH_OPPORTUNITY_CONTEXTS[contextId].label,rewritesEvidence:false,rewritesState:false};
}

function finding({id,role,category,sourceType,sourceKey,polarity='NEUTRAL',magnitude='LOW',timingScope='NATAL',certainty='CONFIRMED',tags=[],plainMeaning,technicalBasis=[]}){
  return {id,role,category,sourceType,sourceKey,domainTags:['WEALTH'],polarity,magnitude,timingScope,certainty,tags:[...new Set(tags)],plainMeaning,technicalBasis};
}

function natalEvidence(strength,pattern){
  const stage=pattern.stage;
  const patternPolarity=['FORMED','RESCUED'].includes(stage)?'SUPPORTIVE':stage==='BROKEN'?'CHALLENGING':'NEUTRAL';
  return [
    finding({
      id:'WEALTH_OPPORTUNITY_NATAL_STRUCTURE',role:'PRIMARY',category:'STRUCTURAL',sourceType:'PATTERN_RESOLUTION',
      sourceKey:pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE',polarity:patternPolarity,magnitude:patternPolarity==='NEUTRAL'?'LOW':'MODERATE',timingScope:'NATAL',tags:['BASELINE','OPPORTUNITY_MODEL'],
      plainMeaning:'原局结构只用于理解长期资源承接与变现路径，不单独证明现实中一定会出现赚钱机会。',
      technicalBasis:[`StructureKey=${pattern.baseStructure?.key ?? 'NONE'}`,`PatternStage=${stage}`]
    }),
    finding({
      id:'WEALTH_OPPORTUNITY_NATAL_STRENGTH',role:'SECONDARY',category:'STRUCTURAL',sourceType:'STRENGTH',
      sourceKey:strength.strengthBand,polarity:'NEUTRAL',magnitude:'LOW',timingScope:'NATAL',tags:['BASELINE','CAPACITY'],
      plainMeaning:'日主强弱用于理解承接机会时的容量与资源需求，不等于现实获利能力或资金规模。',
      technicalBasis:[`StrengthBand=${strength.strengthBand}`]
    })
  ];
}

const FAMILY_META={
  WEALTH:{polarity:'SUPPORTIVE',tags:['OPPORTUNITY_ACTIVATION','RESOURCE_ACCESS','MONETIZATION'],plain:'现实资源、交易、回报与变现主题进入当前时运，财富机会值得提高关注。'},
  OUTPUT:{polarity:'MIXED',tags:['EXECUTION_SUPPORT','ACTIVE_OUTPUT','MONETIZATION'],plain:'输出、产品、服务与成果转化主题增强，有利于形成可验证的变现路径。'},
  RESOURCE:{polarity:'SUPPORTIVE',tags:['RESOURCE_ACCESS','EXECUTION_SUPPORT','CAPABILITY_SUPPORT'],plain:'知识、方法、支持与资源取得条件增强，有利于承接机会，但不等于机会已经成交。'},
  AUTHORITY:{polarity:'NEUTRAL',tags:['STRUCTURED_ACCESS','EXECUTION_SUPPORT','COMMITMENT'],plain:'制度、责任与正式渠道主题增强，可能带来更结构化的资源入口，也可能同步增加承诺。'},
  PEER:{polarity:'MIXED',tags:['COLLABORATION_ACCESS','COMPETITION','VOLATILITY'],plain:'合作、同业、自主配置与竞争主题增强，机会可能来自连接与协作，但需要看清分配和风险。'}
};

function timingLayerEvidence(activation){
  const out=[];
  for(const layer of activation.layers){
    const meta=FAMILY_META[layer.stemFamily] ?? {polarity:'NEUTRAL',tags:[],plain:'新的财富机会相关时运主题进入。'};
    out.push(finding({
      id:`WEALTH_OPPORTUNITY_${layer.layer}_${layer.stemGod}`,role:'TIMING',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.stemGod}_VISIBLE_ENTERED`,polarity:meta.polarity,magnitude:'MODERATE',timingScope:layer.layer,tags:meta.tags,
      plainMeaning:meta.plain,technicalBasis:[`${layer.layer}=${layer.pillar}`,`VisibleTenGod=${layer.stemGod}`]
    }));
    if(layer.branchMainFamily==='WEALTH') out.push(finding({
      id:`WEALTH_OPPORTUNITY_${layer.layer}_BRANCH_WEALTH`,role:'TIMING',category:'TIMING',sourceType:'BRANCH_MAIN_TEN_GOD',
      sourceKey:`${layer.branchMainGod}_BRANCH_MAIN_ENTERED`,polarity:'SUPPORTIVE',magnitude:'MODERATE',timingScope:layer.layer,tags:['OPPORTUNITY_ACTIVATION','RESOURCE_ACCESS','MONETIZATION'],
      plainMeaning:'地支主气带入财富与现实回报主题，可留意可承接、可验证的资源或变现入口。',technicalBasis:[`${layer.layer}=${layer.pillar}`,`BranchMainTenGod=${layer.branchMainGod}`]
    }));
  }
  return out;
}

function patternActivationEvidence(activation){
  return activation.patternActivation.map((x,i)=>{
    let polarity='MIXED',magnitude='MODERATE',tags=['WEALTH_OPPORTUNITY_STRUCTURE_ACTIVATED'];
    if(x.classification==='PATTERN_SUPPORT_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='HIGH';tags.push('RESOURCE_ACCESS','EXECUTION_SUPPORT');
    } else if(x.classification==='PATTERN_ROUTE_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='MODERATE';tags.push('OPPORTUNITY_ACTIVATION','MONETIZATION');
    } else if(x.classification==='PATTERN_PRESSURE_CANDIDATE'){
      polarity='CHALLENGING';magnitude='HIGH';tags.push('PRESSURE','FRICTION');
    } else if(x.classification==='PATTERN_COMPLEXITY_REVIEW'){
      polarity='MIXED';magnitude='MODERATE';tags.push('VOLATILITY','REVIEW');
    }
    const key=String(x.key);
    if(/OUTPUT_GENERATES_WEALTH|WEALTH_ROUTE_FROM_EATING_GOD|HURTING_OFFICER_WEALTH_ROUTE/.test(key)) tags.push('MONETIZATION','OPPORTUNITY_ACTIVATION','EXECUTION_SUPPORT');
    if(/WEALTH_SUPPORTS_OFFICER/.test(key)) tags.push('STRUCTURED_ACCESS','OPPORTUNITY_ACTIVATION');
    if(/PEER_PRESSURE_ON_WEALTH|WEALTH_PRESSURES_RESOURCE|WEALTH_FEEDS_KILLING/.test(key)) tags.push('PRESSURE','COMPETITION','VOLATILITY');
    return finding({
      id:`WEALTH_OPPORTUNITY_PATTERN_${i}_${x.key}`,role:'PRIMARY',category:'TIMING',sourceType:'PATTERN_ACTIVATION',sourceKey:x.key,
      polarity,magnitude,timingScope:x.layer,certainty:'CONDITIONAL',tags,
      plainMeaning:polarity==='SUPPORTIVE'?'当前结构对资源进入、成果变现或机会承接形成较明显支持。':polarity==='CHALLENGING'?'当前机会主题伴随较明显压力，不能把“有机会”直接解释成“值得投入”或“会获利”。':'当前资源与机会结构正在变化，需要把机会本身与真实成本、条款和现金流分开判断。',
      technicalBasis:[`Layer=${x.layer}`,`Activation=${x.key}`,`Class=${x.classification}`]
    });
  });
}

function relationEvidence(timingResolution){
  const out=[]; let seq=0;
  for(const c of timingResolution.clashes.filter(x=>x.originLayer!=='NATAL')){
    if(c.status==='ACTIVE') out.push(finding({
      id:`WEALTH_OPPORTUNITY_REL_${seq++}_CLASH`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_CLASH',
      polarity:'MIXED',magnitude:'HIGH',timingScope:c.originLayer,tags:['VOLATILITY','OPPORTUNITY_ENVIRONMENT_CHANGE'],
      plainMeaning:'现实环境与资源配置变化较明显，可能带来新入口，也可能增加不确定性，机会质量要另外核对。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`,`Reason=${c.reason}`]
    }));
    else if(c.status==='MEDIATED_CONFIRMED') out.push(finding({
      id:`WEALTH_OPPORTUNITY_REL_${seq++}_CLASH_MEDIATED`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MEDIATED_CLASH',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,tags:['VOLATILITY','OPPORTUNITY_ENVIRONMENT_CHANGE','MEDIATED'],
      plainMeaning:'机会环境存在变化，但同时有缓和因素，更适合小步验证而不是一次性重押。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
    else if(String(c.status).includes('REVIEW')) out.push(finding({
      id:`WEALTH_OPPORTUNITY_REL_${seq++}_CLASH_REVIEW`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MULTI_RELATION_REVIEW',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,certainty:'CONDITIONAL',tags:['VOLATILITY','REVIEW'],
      plainMeaning:'多个关系同时作用，不能把单一变化信号直接包装成确定的财富机会。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
  }
  for(const p of timingResolution.punishments.filter(x=>x.originLayer!=='NATAL')){
    if(['ACTIVE','ACTIVE_COMPLETE'].includes(p.status)) out.push(finding({
      id:`WEALTH_OPPORTUNITY_REL_${seq++}_PUNISHMENT`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_PUNISHMENT',
      polarity:'CHALLENGING',magnitude:p.status==='ACTIVE_COMPLETE'?'HIGH':'MODERATE',timingScope:p.originLayer,tags:['PRESSURE','FRICTION','COMMITMENT'],
      plainMeaning:'承接机会时的责任、成本或摩擦更值得关注，现实上要先确认自己是否承受得起。',technicalBasis:[`Origin=${p.originLayer}`,`Status=${p.status}`]
    }));
  }
  for(const a of timingResolution.assemblies.filter(x=>x.originLayer!=='NATAL')){
    if(['FORMATION_COMPLETED_BY_TIMING','FORMATION_CONFIRMED'].includes(a.status)) out.push(finding({
      id:`WEALTH_OPPORTUNITY_REL_${seq++}_ASSEMBLY`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_ASSEMBLY',sourceKey:a.type,
      polarity:'MIXED',magnitude:'MODERATE',timingScope:a.originLayer,tags:['RESOURCE_ACCESS','OPPORTUNITY_ENVIRONMENT_CHANGE'],
      plainMeaning:'新的组合结构形成，资源来源、合作方式或机会入口更容易重新组合。',technicalBasis:[`Origin=${a.originLayer}`,`Type=${a.type}`]
    }));
  }
  for(const s of timingResolution.crossLayerSignals ?? []){
    if(s.key==='STACKED_CLASH_ON_SAME_NATAL_POSITION') out.push(finding({
      id:`WEALTH_OPPORTUNITY_REL_${seq++}_STACKED_CLASH`,role:'PRIMARY',category:'TIMING',sourceType:'CROSS_LAYER_SIGNAL',sourceKey:s.key,
      polarity:'MIXED',magnitude:'HIGH',timingScope:'PERIOD',tags:['VOLATILITY','OPPORTUNITY_ENVIRONMENT_CHANGE'],
      plainMeaning:'大运与流年同时强调环境变化，财富机会可能更活跃，但机会质量与风险也必须现实核对。',technicalBasis:[`Signal=${s.key}`,`Target=${s.target ?? 'UNKNOWN'}`]
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

export function resolveWealthOpportunityState(evidence){
  const active=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER');
  const resourceAccess=dimension(active,['RESOURCE_ACCESS','STRUCTURED_ACCESS','COLLABORATION_ACCESS']);
  const monetization=dimension(active,['MONETIZATION']);
  const executionSupport=dimension(active,['EXECUTION_SUPPORT','CAPABILITY_SUPPORT'],{supportiveOnly:true});
  const activation=dimension(active,['OPPORTUNITY_ACTIVATION']);
  const pressure=dimension(active,['PRESSURE','FRICTION','COMPETITION'],{challengingOnly:true});
  const volatility=dimension(active,['VOLATILITY','OPPORTUNITY_ENVIRONMENT_CHANGE']);

  let state='NO_CLEAR_OPPORTUNITY_WINDOW';
  // N3 full-pipeline calibration: a single PRESENT resource/support trace can be
  // too generic to call an opportunity signal. Keep strong resource access,
  // activation, monetization, or strong execution support as the minimum
  // evidence floor for an emerging opportunity.
  const hasOpportunity=activation!=='NONE' || monetization!=='NONE' || resourceAccess==='STRONG';
  if((pressure==='STRONG' || volatility==='STRONG') && hasOpportunity) state='MIXED_OPPORTUNITY_CAUTION';
  else if(activation==='STRONG' && monetization==='STRONG' && (resourceAccess!=='NONE' || executionSupport!=='NONE')) state='MONETIZATION_WINDOW';
  else if(resourceAccess==='STRONG' && (activation!=='NONE' || executionSupport!=='NONE')) state='RESOURCE_ACCESS_WINDOW';
  else if(hasOpportunity || executionSupport==='STRONG') state='OPPORTUNITY_SIGNAL_EMERGING';

  return {state,dimensions:{resourceAccess,monetization,executionSupport,activation,pressure,volatility},numericScoreUsed:false,percentConfidenceUsed:false};
}

const STATE_COPY=Object.freeze({
  NO_CLEAR_OPPORTUNITY_WINDOW:{
    direct:'接下来暂时没有足够强、足够一致的财富机会信号，更适合先把现有资源与现实条件整理好。',
    current:'当前未形成明确的资源进入与变现共振，机会可能存在，但还不足以被解释成明显窗口。',
    development:'先把可变现能力、渠道、客户来源与资金缓冲做实，再观察哪些机会开始具备现实承接条件。',
    caution:'没有明显窗口不等于没有任何机会，也不代表现实中的好项目应该被忽略。'
  },
  OPPORTUNITY_SIGNAL_EMERGING:{
    direct:'接下来财富机会信号正在出现，但更像形成期，适合主动观察与小步验证。',
    current:'资源、输出或变现主题开始增强，不过目前仍缺少足够的多来源确认，不适合直接等同于赚钱窗口。',
    development:'优先验证已有客户、项目、产品、渠道或岗位资源，确认哪些真的能形成可重复回报。',
    caution:'信号出现不代表会成交、会获利，也不能据此增加无法承受的投入。'
  },
  RESOURCE_ACCESS_WINDOW:{
    direct:'接下来有较明显的资源承接窗口，机会更可能先以渠道、客户、合作、支持或正式入口出现。',
    current:'资源取得与承接条件较活跃，但是否能顺利变现仍取决于真实需求、执行、条款和成本。',
    development:'把新增资源逐一转成可验证的客户、合同、项目或渠道结果，再决定是否扩大投入。',
    caution:'资源变多不等于利润变多；合作、人脉或渠道价值必须用真实结果确认。'
  },
  MONETIZATION_WINDOW:{
    direct:'接下来存在较明显的成果变现窗口，可以主动推进成熟机会，但仍要先确认现实经济性。',
    current:'机会激活、变现路径与承接支持同时增强，更适合把已经成熟的能力、项目、产品或资源转成现实回报。',
    development:'优先推进需求已验证、条款清楚、成本可控且回款路径明确的机会，不追逐只靠想象成立的收益。',
    caution:'变现窗口只代表条件较集中，不代表项目一定赚钱，更不代表任何投资、合作或生意会保证收益。'
  },
  MIXED_OPPORTUNITY_CAUTION:{
    direct:'接下来机会与压力／波动同时增强，可以看到入口，但不适合把“有机会”直接当成“值得重押”。',
    current:'资源与变现主题活跃，同时伴随明显摩擦、竞争、承诺或环境变化，机会质量差异可能很大。',
    development:'把每个机会拆成收入来源、成本、现金流、合同、退出条件与最坏情况，再决定是否承接。',
    caution:'波动或压力期尤其不能用命盘替代尽调，也不应因为“机会窗口”忽略现实损失能力。'
  }
});

function contextAction(contextId,state){
  const map={
    CTX_NONE:null,
    CTX_SALARIED:'固定薪资为主时，把机会拆成职责、薪酬结构、奖金条件、成长空间与稳定性，不把“财富机会”直接理解成一定加薪。',
    CTX_SELF_EMPLOYED:'自营或接案时，优先核对客户需求、客单价、毛利、回款周期与复购，再决定是否扩大承接。',
    CTX_BUSINESS_OWNER:'经营生意时，先核对销量、毛利、固定成本、库存／产能、现金转换周期与扩张资金，再判断机会是否真的可承接。',
    CTX_NEW_PROJECT:'新项目出现时，先确认付款方、范围、成本、交付责任、回款节点与最坏情况，不只看表面金额。',
    CTX_PARTNERSHIP_DEAL:'合作或分成机会出现时，把权责、分配、资金投入、退出机制与违约处理写进合同，再判断是否值得承接。',
    CTX_CAPITAL_CONSTRAINED:'现实现金流偏紧时，优先守住必要支出与资金缓冲；即使机会信号明显，也不要增加超出承受能力的承诺。',
    CTX_OPPORTUNITY_UNCLEAR:'条件尚未清楚时，先拿到书面范围、价格／回报结构、成本、期限与责任，再进行现实评估。'
  };
  return map[contextId] ?? STATE_COPY[state].development;
}

export function renderWealthOpportunityAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!WEALTH_OPPORTUNITY_STATES.includes(state)) throw new Error(`Unknown WEALTH_OPPORTUNITY state: ${state}`);
  normalizeContext(contextId);
  const copy=STATE_COPY[state];
  const why=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER').slice().sort((a,b)=>MAGNITUDE_ORDER[b.magnitude]-MAGNITUDE_ORDER[a.magnitude]).slice(0,4).map(x=>x.plainMeaning);
  const actions=[contextAction(contextId,state),copy.development,'现实层请同时核对收入模式、成本、现金流、合同条款、风险承担与退出条件。'].filter(Boolean);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    development:copy.development,
    actions:[...new Set(actions)].slice(0,3),
    caution:copy.caution,
    why,
    technicalBasis:evidence.filter(x=>x.magnitude!=='LOW').slice(0,8).flatMap(x=>(x.technicalBasis ?? []).map(b=>`${x.sourceKey}: ${b}`)),
    deepAwareness:'财富机会不是“未来一定有一笔钱”，而是资源、需求、输出与承接条件是否更容易在同一阶段碰到一起；真正价值仍取决于现实执行与经济性。',
    realityBoundary:'实际获利必须直接核对真实收入模式、客户／需求、成本、现金流、合同、税务、风险与退出条件；命盘不能证明某个项目会赚钱，也不能给出具体投资标的、价格、收益率、买卖时点或保证收益。',
    certaintyLanguage:'NON_DETERMINISTIC'
  };
}

export function buildWealthOpportunityEvidence(chart,timing){
  assertTiming(timing);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const timingResolution=resolveTimingRelations(chart,timing);
  const evidence=[...natalEvidence(strength,pattern),...timingLayerEvidence(timingResolution.activation),...patternActivationEvidence(timingResolution.activation),...relationEvidence(timingResolution)];
  return {
    version:WEALTH_OPPORTUNITY_VERSION,
    questionId:WEALTH_OPPORTUNITY_QUESTION.questionId,
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

export function synthesizeWealthOpportunity(chart,timing,contextId='CTX_NONE'){
  const context=normalizeContext(contextId);
  const built=buildWealthOpportunityEvidence(chart,timing);
  const resolution=resolveWealthOpportunityState(built.evidence);
  const answer=renderWealthOpportunityAnswer(resolution.state,contextId,built.evidence);
  return {
    version:WEALTH_OPPORTUNITY_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:WEALTH_OPPORTUNITY_QUESTION,
    context,
    evidenceStack:built,
    synthesis:{...resolution,contextChangedEvidenceState:false},
    answer,
    trace:[
      `QUESTION=${WEALTH_OPPORTUNITY_QUESTION.questionId}`,
      `STRUCTURE=${built.sourceSnapshot.structureKey}`,
      `PATTERN_STAGE=${built.sourceSnapshot.patternStage}`,
      `STRENGTH=${built.sourceSnapshot.strengthBand}`,
      `STATE=${resolution.state}`,
      `RESOURCE_ACCESS=${resolution.dimensions.resourceAccess}`,
      `MONETIZATION=${resolution.dimensions.monetization}`,
      `EXECUTION_SUPPORT=${resolution.dimensions.executionSupport}`,
      `ACTIVATION=${resolution.dimensions.activation}`,
      `PRESSURE=${resolution.dimensions.pressure}`,
      `VOLATILITY=${resolution.dimensions.volatility}`,
      `CONTEXT=${contextId}`,
      'CONTEXT_REWRITES_EVIDENCE=NO',
      'CONTEXT_REWRITES_STATE=NO',
      'TIMING_REWRITES_NATAL_STRENGTH=NO',
      'TIMING_REWRITES_NATAL_STRUCTURE=NO',
      'SHENSHA_PRIMARY_EVIDENCE=NO',
      'ACTUAL_PROFIT_INFERRED=NO',
      'SPECIFIC_INVESTMENT_TARGET=NO',
      'RETURN_RATE_PREDICTION=NO',
      'BUY_SELL_TIMING=NO',
      'INVESTMENT_RETURN_GUARANTEE=NO',
      'NUMERIC_SCORE=NO',
      'PERCENT_CONFIDENCE=NO'
    ]
  };
}
