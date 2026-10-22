import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';
import { resolveTimingRelations } from '../../src/timingRelationResolutionEngine.mjs';

export const WEALTH_CASHFLOW_VERSION = 'GUANCHENG_WEALTH_CASHFLOW_PROTO_V1_STEP02_M1';

export const WEALTH_CASHFLOW_QUESTION = Object.freeze({
  questionId:'WEALTH_CASHFLOW',
  domain:'WEALTH',
  userText:'为什么最近钱容易留不住？',
  intent:'ASSESS_CASHFLOW_RETENTION_PRESSURE',
  timeHorizon:'CURRENT_TO_NEXT_6_MONTHS',
  evidenceRecipeId:'RECIPE_WEALTH_CASHFLOW_V1',
  contextRequired:false,
  contextSetId:'CTX_WEALTH_CASHFLOW_OPTIONAL',
  timingRequired:['DAYUN','YEAR'],
  outputTemplate:'WEALTH_CASHFLOW_SYNTHESIS_V1'
});

export const WEALTH_CASHFLOW_CONTEXTS = Object.freeze({
  CTX_NONE:{label:'不补充现实支出原因'},
  CTX_FIXED_EXPENSES_HIGH:{label:'固定／必要支出近期偏高'},
  CTX_VARIABLE_SPENDING_HIGH:{label:'非固定支出或消费近期偏多'},
  CTX_DEBT_REPAYMENT:{label:'目前有债务／分期／固定还款'},
  CTX_BUSINESS_REINVESTMENT:{label:'近期把较多资金投入生意／工作／项目'},
  CTX_FAMILY_SUPPORT:{label:'近期家庭／照护／人情支出较多'},
  CTX_LARGE_ONE_OFF_EXPENSE:{label:'近期有一次性大额支出'},
  CTX_INCOME_VOLATILE:{label:'收入本身近期波动较明显'}
});

export const WEALTH_CASHFLOW_STATES = Object.freeze([
  'NO_CLEAR_RETENTION_PRESSURE',
  'OUTFLOW_PRESSURE_BUILDING',
  'RESOURCE_REALLOCATION_PHASE',
  'VOLATILE_CASHFLOW_CYCLE',
  'RETENTION_STRAIN_CAUTION'
]);

const MAGNITUDE_ORDER={LOW:1,MODERATE:2,HIGH:3};

function assertTiming(timing){
  if(!timing?.dayun || !timing?.year){
    const e=new Error('WEALTH_CASHFLOW requires active Dayun and Year from STEP 01 Core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}

function normalizeContext(contextId='CTX_NONE'){
  if(!WEALTH_CASHFLOW_CONTEXTS[contextId]){
    const e=new Error(`Unknown WEALTH_CASHFLOW context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:WEALTH_CASHFLOW_CONTEXTS[contextId].label,rewritesEvidence:false,rewritesState:false};
}

function finding({id,role,category,sourceType,sourceKey,polarity='NEUTRAL',magnitude='LOW',timingScope='NATAL',certainty='CONFIRMED',tags=[],plainMeaning,technicalBasis=[]}){
  return {id,role,category,sourceType,sourceKey,domainTags:['WEALTH'],polarity,magnitude,timingScope,certainty,tags:[...new Set(tags)],plainMeaning,technicalBasis};
}

function natalEvidence(strength,pattern){
  const stage=pattern.stage;
  const patternPolarity=['FORMED','RESCUED'].includes(stage)?'SUPPORTIVE':stage==='BROKEN'?'CHALLENGING':'NEUTRAL';
  return [
    finding({
      id:'WEALTH_CASHFLOW_NATAL_STRUCTURE',role:'PRIMARY',category:'STRUCTURAL',sourceType:'PATTERN_RESOLUTION',
      sourceKey:pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE',polarity:patternPolarity,magnitude:patternPolarity==='NEUTRAL'?'LOW':'MODERATE',timingScope:'NATAL',tags:['BASELINE','RESOURCE_STEWARDSHIP'],
      plainMeaning:'原局结构只用于理解长期资源管理与承接方式，不单独证明现实中“存不住钱”或具体支出原因。',
      technicalBasis:[`StructureKey=${pattern.baseStructure?.key ?? 'NONE'}`,`PatternStage=${stage}`]
    }),
    finding({
      id:'WEALTH_CASHFLOW_NATAL_STRENGTH',role:'SECONDARY',category:'STRUCTURAL',sourceType:'STRENGTH',
      sourceKey:strength.strengthBand,polarity:'NEUTRAL',magnitude:'LOW',timingScope:'NATAL',tags:['BASELINE','CAPACITY'],
      plainMeaning:'日主强弱用于理解承载资源变化时的需求，不等于现实现金流、储蓄率或账户余额。',
      technicalBasis:[`StrengthBand=${strength.strengthBand}`]
    })
  ];
}

const FAMILY_META={
  WEALTH:{polarity:'MIXED',tags:['RESOURCE_MOBILIZATION','RESOURCE_REALLOCATION','CASHFLOW_ATTENTION'],plain:'现实资源、交易与回报主题进入当前时运，资金配置与进出更值得核对。'},
  OUTPUT:{polarity:'MIXED',tags:['ACTIVE_OUTPUT','RESOURCE_REALLOCATION','OUTFLOW_PRESSURE'],plain:'输出、项目或成果形成主题增强，现实上可能伴随时间与资源投入，但具体支出必须直接核对。'},
  RESOURCE:{polarity:'SUPPORTIVE',tags:['RETENTION_SUPPORT','STRUCTURAL_SUPPORT'],plain:'支撑、方法与准备主题增强，有利于提高资源安排的稳定性，但不等于账户余额一定增加。'},
  AUTHORITY:{polarity:'NEUTRAL',tags:['COMMITMENT_LOAD','OUTFLOW_PRESSURE','STRUCTURED_OBLIGATION'],plain:'责任、制度与固定承诺主题增强，现实上应检查是否有持续性义务或固定支出，但命盘不能替你确认。'},
  PEER:{polarity:'MIXED',tags:['RESOURCE_SHARING','VOLATILITY','OUTFLOW_PRESSURE'],plain:'竞争、自主配置与资源共享主题增强，现金流更需要边界与记录；不能据此归因给朋友、家人或任何特定对象。'}
};

function timingLayerEvidence(activation){
  const out=[];
  for(const layer of activation.layers){
    const meta=FAMILY_META[layer.stemFamily] ?? {polarity:'NEUTRAL',tags:[],plain:'新的资源配置时运主题进入。'};
    out.push(finding({
      id:`WEALTH_CASHFLOW_${layer.layer}_${layer.stemGod}`,role:'TIMING',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.stemGod}_VISIBLE_ENTERED`,polarity:meta.polarity,magnitude:'MODERATE',timingScope:layer.layer,tags:meta.tags,
      plainMeaning:meta.plain,technicalBasis:[`${layer.layer}=${layer.pillar}`,`VisibleTenGod=${layer.stemGod}`]
    }));
    if(layer.branchMainFamily==='WEALTH') out.push(finding({
      id:`WEALTH_CASHFLOW_${layer.layer}_BRANCH_WEALTH`,role:'TIMING',category:'TIMING',sourceType:'BRANCH_MAIN_TEN_GOD',
      sourceKey:`${layer.branchMainGod}_BRANCH_MAIN_ENTERED`,polarity:'MIXED',magnitude:'MODERATE',timingScope:layer.layer,tags:['RESOURCE_MOBILIZATION','RESOURCE_REALLOCATION','CASHFLOW_ATTENTION'],
      plainMeaning:'地支主气带入资源与现实回报主题，适合把资金进出、成本和留存一起核对。',technicalBasis:[`${layer.layer}=${layer.pillar}`,`BranchMainTenGod=${layer.branchMainGod}`]
    }));
  }
  return out;
}

function patternActivationEvidence(activation){
  return activation.patternActivation.map((x,i)=>{
    let polarity='MIXED',magnitude='MODERATE',tags=['CASHFLOW_STRUCTURE_ACTIVATED'];
    if(x.classification==='PATTERN_SUPPORT_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='HIGH';tags.push('RETENTION_SUPPORT','STRUCTURAL_SUPPORT');
    } else if(x.classification==='PATTERN_ROUTE_CANDIDATE'){
      polarity='MIXED';magnitude='MODERATE';tags.push('RESOURCE_REALLOCATION','RESOURCE_MOBILIZATION');
    } else if(x.classification==='PATTERN_PRESSURE_CANDIDATE'){
      polarity='CHALLENGING';magnitude='HIGH';tags.push('OUTFLOW_PRESSURE','COMMITMENT_LOAD','FRICTION');
    } else if(x.classification==='PATTERN_COMPLEXITY_REVIEW'){
      polarity='MIXED';magnitude='MODERATE';tags.push('VOLATILITY','RESOURCE_REALLOCATION','REVIEW');
    }
    const key=String(x.key);
    if(/OUTPUT_GENERATES_WEALTH|WEALTH_ROUTE_FROM_EATING_GOD|HURTING_OFFICER_WEALTH_ROUTE/.test(key)) tags.push('RESOURCE_REALLOCATION','CASHFLOW_CYCLING');
    if(/WEALTH_SUPPORTS_OFFICER/.test(key)) tags.push('COMMITMENT_LOAD','STRUCTURED_OBLIGATION','RESOURCE_REALLOCATION');
    if(/PEER_PRESSURE_ON_WEALTH|WEALTH_PRESSURES_RESOURCE|WEALTH_FEEDS_KILLING/.test(key)) tags.push('OUTFLOW_PRESSURE','VOLATILITY','FRICTION');
    return finding({
      id:`WEALTH_CASHFLOW_PATTERN_${i}_${x.key}`,role:'PRIMARY',category:'TIMING',sourceType:'PATTERN_ACTIVATION',sourceKey:x.key,
      polarity,magnitude,timingScope:x.layer,certainty:'CONDITIONAL',tags,
      plainMeaning:polarity==='SUPPORTIVE'?'当前结构对资源安排与留存提供较明显支撑。':polarity==='CHALLENGING'?'当前资源承接压力较明显，现实上应优先检查固定承诺、成本与现金缓冲。':'当前资源配置或现金流结构进入调整阶段，更适合先把真实资金流向拆开确认。',
      technicalBasis:[`Layer=${x.layer}`,`Activation=${x.key}`,`Class=${x.classification}`]
    });
  });
}

function relationEvidence(timingResolution){
  const out=[]; let seq=0;
  for(const c of timingResolution.clashes.filter(x=>x.originLayer!=='NATAL')){
    if(c.status==='ACTIVE') out.push(finding({
      id:`WEALTH_CASHFLOW_REL_${seq++}_CLASH`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_CLASH',
      polarity:'MIXED',magnitude:'HIGH',timingScope:c.originLayer,tags:['VOLATILITY','RESOURCE_REALLOCATION','CASHFLOW_STRUCTURE_CHANGE'],
      plainMeaning:'资源配置与现金流结构更容易出现变化，实际支出与收入节奏需要分开记录。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`,`Reason=${c.reason}`]
    }));
    else if(c.status==='MEDIATED_CONFIRMED') out.push(finding({
      id:`WEALTH_CASHFLOW_REL_${seq++}_CLASH_MEDIATED`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MEDIATED_CLASH',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,tags:['VOLATILITY','RESOURCE_REALLOCATION','MEDIATED'],
      plainMeaning:'资源结构有调整信号，但同时存在缓和因素，宜用真实账目确认影响大小。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
    else if(String(c.status).includes('REVIEW')) out.push(finding({
      id:`WEALTH_CASHFLOW_REL_${seq++}_CLASH_REVIEW`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MULTI_RELATION_REVIEW',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,certainty:'CONDITIONAL',tags:['VOLATILITY','REVIEW'],
      plainMeaning:'多个关系同时作用，不能把“钱留不住”归因到单一命理因素。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
  }
  for(const p of timingResolution.punishments.filter(x=>x.originLayer!=='NATAL')){
    if(['ACTIVE','ACTIVE_COMPLETE'].includes(p.status)) out.push(finding({
      id:`WEALTH_CASHFLOW_REL_${seq++}_PUNISHMENT`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_PUNISHMENT',
      polarity:'CHALLENGING',magnitude:p.status==='ACTIVE_COMPLETE'?'HIGH':'MODERATE',timingScope:p.originLayer,tags:['OUTFLOW_PRESSURE','COMMITMENT_LOAD','FRICTION'],
      plainMeaning:'承诺、成本或持续性压力更值得关注，但具体是哪一项支出必须用现实记录确认。',technicalBasis:[`Origin=${p.originLayer}`,`Status=${p.status}`]
    }));
  }
  for(const a of timingResolution.assemblies.filter(x=>x.originLayer!=='NATAL')){
    if(['FORMATION_COMPLETED_BY_TIMING','FORMATION_CONFIRMED'].includes(a.status)) out.push(finding({
      id:`WEALTH_CASHFLOW_REL_${seq++}_ASSEMBLY`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_ASSEMBLY',sourceKey:a.type,
      polarity:'MIXED',magnitude:'MODERATE',timingScope:a.originLayer,tags:['RESOURCE_REALLOCATION','CASHFLOW_STRUCTURE_CHANGE'],
      plainMeaning:'新的组合结构形成，资源用途与现金流分配更可能重新组合。',technicalBasis:[`Origin=${a.originLayer}`,`Type=${a.type}`]
    }));
  }
  for(const s of timingResolution.crossLayerSignals ?? []){
    if(s.key==='STACKED_CLASH_ON_SAME_NATAL_POSITION') out.push(finding({
      id:`WEALTH_CASHFLOW_REL_${seq++}_STACKED_CLASH`,role:'PRIMARY',category:'TIMING',sourceType:'CROSS_LAYER_SIGNAL',sourceKey:s.key,
      polarity:'MIXED',magnitude:'HIGH',timingScope:'PERIOD',tags:['VOLATILITY','CASHFLOW_STRUCTURE_CHANGE','RESOURCE_REALLOCATION'],
      plainMeaning:'大运与流年同时强调资源结构变化，短期更需要保留流动性并核对真实资金流。',technicalBasis:[`Signal=${s.key}`,`Target=${s.target ?? 'UNKNOWN'}`]
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

export function resolveWealthCashflowState(evidence){
  const active=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER');
  const retentionSupport=dimension(active,['RETENTION_SUPPORT','STRUCTURAL_SUPPORT'],{supportiveOnly:true});
  const outflowPressure=dimension(active,['OUTFLOW_PRESSURE','FRICTION']);
  const resourceReallocation=dimension(active,['RESOURCE_REALLOCATION','RESOURCE_MOBILIZATION','CASHFLOW_CYCLING','CASHFLOW_STRUCTURE_CHANGE']);
  const volatility=dimension(active,['VOLATILITY','CASHFLOW_STRUCTURE_CHANGE']);
  const commitmentLoad=dimension(active,['COMMITMENT_LOAD','STRUCTURED_OBLIGATION']);

  let state='NO_CLEAR_RETENTION_PRESSURE';
  if(outflowPressure==='STRONG' && (commitmentLoad==='STRONG' || retentionSupport==='NONE')) state='RETENTION_STRAIN_CAUTION';
  else if(volatility==='STRONG') state='VOLATILE_CASHFLOW_CYCLE';
  else if(resourceReallocation==='STRONG' && outflowPressure!=='STRONG') state='RESOURCE_REALLOCATION_PHASE';
  else if(outflowPressure!=='NONE' || commitmentLoad!=='NONE' || resourceReallocation!=='NONE') state='OUTFLOW_PRESSURE_BUILDING';

  return {state,dimensions:{retentionSupport,outflowPressure,resourceReallocation,volatility,commitmentLoad},numericScoreUsed:false,percentConfidenceUsed:false};
}

const STATE_COPY=Object.freeze({
  NO_CLEAR_RETENTION_PRESSURE:{
    direct:'从当前命理时序看，没有足够强的信号可以解释为明显的“留财压力”，真实原因更应该先从账目里找。',
    current:'命盘没有提供足够证据去断定近期一定存在特殊破耗机制，因此不应为了回答问题而强行归因。',
    development:'先把最近三个月的收入、固定支出、可变支出、债务与一次性支出分类，再看真正让余额下降的项目。',
    caution:'没有明显命理压力不等于现实现金流一定健康；账户余额与实际支出必须直接核对。'
  },
  OUTFLOW_PRESSURE_BUILDING:{
    direct:'近期更像是资源承诺与支出压力在增加，所以“钱留不住”的感觉可能更明显。',
    current:'当前时运出现资源投入、责任或支出承接主题，但命盘不能判断现实中究竟花在什么地方。',
    development:'把持续性支出和一次性支出分开，先确认哪些项目正在形成长期现金流压力。',
    caution:'这里描述的是压力结构，不代表你一定乱花钱，也不能据此把原因归到某个人或某一类消费。'
  },
  RESOURCE_REALLOCATION_PHASE:{
    direct:'近期更像处在资源重新配置阶段，钱可能更频繁地在不同用途之间流动，而不一定只是单纯“花掉”。',
    current:'项目、工作、资源或现实回报主题同时活跃，重点在于确认资金是否被重新投入、转移或占用。',
    development:'把消费、经营投入、设备／学习、资产配置与普通生活支出分开记录，确认哪些资金仍然形成可追踪的价值。',
    caution:'资源重新配置不等于投资一定有效，也不等于所有支出都有回报；效果必须用真实账目和结果核对。'
  },
  VOLATILE_CASHFLOW_CYCLE:{
    direct:'近期现金流更容易呈现进出都快、节奏不稳定的状态，重点不是只看赚多少，而是看什么时候进、什么时候出。',
    current:'时运关系强调资源结构变化与波动，收入与支出的时间差更值得关注。',
    development:'用周／月现金流而不是单笔金额判断状况，同时保留必要缓冲，避免把短期高收入当成长期可用资金。',
    caution:'波动信号不能证明未来会亏损，也不能代替对真实收入周期、回款和支出的检查。'
  },
  RETENTION_STRAIN_CAUTION:{
    direct:'近期资源留存压力偏强，优先目标应该是守住流动性与必要缓冲，而不是继续扩大固定承诺。',
    current:'多项压力或持续性义务主题同时增强，资源承接比单纯增加收入更值得先处理。',
    development:'先找出固定承诺、债务、经营成本与一次性大额支出中哪一项真正占用现金，再决定哪里需要调整。',
    caution:'命盘不能证明你一定会破财、负债或亏损；这些都必须用银行记录、合同、账单和真实财务资料确认。'
  }
});

function contextAction(contextId,state){
  const map={
    CTX_NONE:null,
    CTX_FIXED_EXPENSES_HIGH:'固定／必要支出偏高时，把房租、保险、订阅、贷款、家庭固定费用等列成月度清单，先看哪些承诺正在长期占用现金。',
    CTX_VARIABLE_SPENDING_HIGH:'非固定支出偏多时，用实际消费记录找出高频类别与触发场景，不用“命盘破财”代替消费审计。',
    CTX_DEBT_REPAYMENT:'有债务或分期时，直接核对本金、利率、还款日与每月现金需求；是否提前偿还或重组应依据真实条款和专业意见。',
    CTX_BUSINESS_REINVESTMENT:'资金投入生意／项目时，把营业额、毛利、回款、库存、设备与投入后的实际结果分开记录，确认资金是否形成可追踪价值。',
    CTX_FAMILY_SUPPORT:'家庭／照护／人情支出较多时，先把必要责任、可协商支出与临时帮助分开，并明确自己可持续承担的边界。',
    CTX_LARGE_ONE_OFF_EXPENSE:'有一次性大额支出时，把它与日常现金流分开看，避免因为单月余额下降就判断长期“守不住钱”。',
    CTX_INCOME_VOLATILE:'收入本身波动时，用较长周期的平均可用收入来安排固定支出，并预留现金缓冲，不把高收入月份当成常态。'
  };
  return map[contextId] ?? STATE_COPY[state].development;
}

export function renderWealthCashflowAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!WEALTH_CASHFLOW_STATES.includes(state)) throw new Error(`Unknown WEALTH_CASHFLOW state: ${state}`);
  normalizeContext(contextId);
  const copy=STATE_COPY[state];
  const why=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER').slice().sort((a,b)=>MAGNITUDE_ORDER[b.magnitude]-MAGNITUDE_ORDER[a.magnitude]).slice(0,4).map(x=>x.plainMeaning);
  const actions=[contextAction(contextId,state),copy.development,'把收入、固定支出、可变支出、债务／承诺与一次性支出分开记录，先确认真实资金流向。'].filter(Boolean);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    development:copy.development,
    actions:[...new Set(actions)].slice(0,3),
    caution:copy.caution,
    why,
    technicalBasis:evidence.filter(x=>x.magnitude!=='LOW').slice(0,8).flatMap(x=>(x.technicalBasis ?? []).map(b=>`${x.sourceKey}: ${b}`)),
    deepAwareness:'“钱留不住”不一定等于消费过度，也可能来自收入波动、固定承诺、经营投入、一次性支出或资金被重新配置。命理只能提供观察角度，真实原因仍要回到账目。',
    realityBoundary:'真实现金流、储蓄率、债务、消费类别、经营投入与账户余额必须用银行流水、账单、合同和账目直接核对；命盘不能证明实际破财、某个人导致你花钱，或任何投资与支出一定有回报。',
    certaintyLanguage:'NON_DETERMINISTIC'
  };
}

export function buildWealthCashflowEvidence(chart,timing){
  assertTiming(timing);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const timingResolution=resolveTimingRelations(chart,timing);
  const evidence=[...natalEvidence(strength,pattern),...timingLayerEvidence(timingResolution.activation),...patternActivationEvidence(timingResolution.activation),...relationEvidence(timingResolution)];
  return {
    version:WEALTH_CASHFLOW_VERSION,
    questionId:WEALTH_CASHFLOW_QUESTION.questionId,
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

export function synthesizeWealthCashflow(chart,timing,contextId='CTX_NONE'){
  const context=normalizeContext(contextId);
  const built=buildWealthCashflowEvidence(chart,timing);
  const resolution=resolveWealthCashflowState(built.evidence);
  const answer=renderWealthCashflowAnswer(resolution.state,contextId,built.evidence);
  return {
    version:WEALTH_CASHFLOW_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:WEALTH_CASHFLOW_QUESTION,
    context,
    evidenceStack:built,
    synthesis:{...resolution,contextChangedEvidenceState:false},
    answer,
    trace:[
      `QUESTION=${WEALTH_CASHFLOW_QUESTION.questionId}`,
      `STRUCTURE=${built.sourceSnapshot.structureKey}`,
      `PATTERN_STAGE=${built.sourceSnapshot.patternStage}`,
      `STRENGTH=${built.sourceSnapshot.strengthBand}`,
      `STATE=${resolution.state}`,
      `RETENTION_SUPPORT=${resolution.dimensions.retentionSupport}`,
      `OUTFLOW_PRESSURE=${resolution.dimensions.outflowPressure}`,
      `RESOURCE_REALLOCATION=${resolution.dimensions.resourceReallocation}`,
      `VOLATILITY=${resolution.dimensions.volatility}`,
      `COMMITMENT_LOAD=${resolution.dimensions.commitmentLoad}`,
      `CONTEXT=${contextId}`,
      'CONTEXT_REWRITES_EVIDENCE=NO',
      'CONTEXT_REWRITES_STATE=NO',
      'ACTUAL_CASHFLOW_INFERRED=NO',
      'ACTUAL_SPENDING_CAUSE_INFERRED=NO',
      'ACTUAL_DEBT_INFERRED=NO',
      'INVESTMENT_RETURN_GUARANTEE=NO',
      'NUMERIC_SCORE=NO',
      'PERCENT_CONFIDENCE=NO'
    ]
  };
}
