import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';

export const WEALTH_INVESTMENT_STYLE_VERSION = 'GUANCHENG_WEALTH_INVESTMENT_STYLE_PROTO_V1_STEP02_O1';

export const WEALTH_INVESTMENT_STYLE_QUESTION = Object.freeze({
  questionId:'WEALTH_INVESTMENT_STYLE',
  domain:'WEALTH',
  userText:'我更适合怎样的理财／资金安排方式？',
  intent:'ASSESS_LONG_TERM_CAPITAL_ARRANGEMENT_STYLE',
  timeHorizon:'LONG_TERM_BASELINE',
  evidenceRecipeId:'RECIPE_WEALTH_INVESTMENT_STYLE_V1',
  contextRequired:false,
  contextSetId:'CTX_WEALTH_INVESTMENT_STYLE_OPTIONAL',
  timingRequired:[],
  timingPolicy:'NATAL_PRIMARY_TIMING_NOT_REQUIRED',
  outputTemplate:'WEALTH_INVESTMENT_STYLE_SYNTHESIS_V1'
});

export const WEALTH_INVESTMENT_STYLE_CONTEXTS = Object.freeze({
  CTX_NONE:{label:'不补充现实资金状态'},
  CTX_STABLE_SALARY:{label:'目前以稳定薪资为主'},
  CTX_VARIABLE_INCOME:{label:'收入波动较大／佣金或项目制'},
  CTX_SELF_EMPLOYED:{label:'目前自营／接案'},
  CTX_BUSINESS_OWNER:{label:'目前经营生意／公司'},
  CTX_HIGH_FIXED_OBLIGATIONS:{label:'固定支出／偿还责任较高'},
  CTX_SHORT_TERM_GOAL:{label:'近期有明确的大额资金目标'},
  CTX_BUFFER_THIN:{label:'目前应急资金缓冲偏薄'}
});

export const WEALTH_INVESTMENT_STYLE_STATES = Object.freeze([
  'LIQUIDITY_AND_BUFFER_FIRST',
  'RULE_BASED_BUCKETS',
  'BALANCED_CORE_AND_FLEX',
  'ACTIVE_BUT_CAPPED_ALLOCATION',
  'SIMPLIFY_AND_CONTAIN_RISK'
]);

function normalizeContext(contextId='CTX_NONE'){
  if(!WEALTH_INVESTMENT_STYLE_CONTEXTS[contextId]){
    const e=new Error(`Unknown WEALTH_INVESTMENT_STYLE context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:WEALTH_INVESTMENT_STYLE_CONTEXTS[contextId].label,rewritesEvidence:false,rewritesState:false};
}

function finding({id,role='PRIMARY',sourceType,sourceKey,tags=[],plainMeaning,technicalBasis=[],magnitude='MODERATE',polarity='NEUTRAL'}){
  return {
    id,role,category:'STRUCTURAL',sourceType,sourceKey,domainTags:['WEALTH'],polarity,magnitude,
    timingScope:'NATAL',certainty:'CONFIRMED',tags:[...new Set(tags)],plainMeaning,technicalBasis
  };
}

const STRONG_BANDS=new Set(['BALANCED_STRONG','STRONG','VERY_STRONG']);
const WEAK_BANDS=new Set(['VERY_WEAK','WEAK','BALANCED_WEAK']);
const RESOURCE_STRUCTURES=new Set(['DIRECT_RESOURCE','INDIRECT_RESOURCE']);
const AUTHORITY_STRUCTURES=new Set(['DIRECT_OFFICER','SEVEN_KILLINGS']);
const WEALTH_OUTPUT_STRUCTURES=new Set(['DIRECT_WEALTH','INDIRECT_WEALTH','EATING_GOD','HURTING_OFFICER']);
const PEER_STRUCTURES=new Set(['JIAN_LU','YUE_JIE','YANG_REN']);
const COMPLEX_STAGES=new Set(['BROKEN','REVIEW','FORMED_WITH_FLAW']);

function natalEvidence(strength,pattern){
  const structureKey=pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE';
  const stage=pattern.stage ?? 'UNKNOWN';
  const evidence=[];

  const strengthTags=['CAPACITY_BASELINE'];
  if(WEAK_BANDS.has(strength.strengthBand)) strengthTags.push('LIQUIDITY_NEED','BUFFER_NEED');
  if(STRONG_BANDS.has(strength.strengthBand)) strengthTags.push('DEPLOYMENT_CAPACITY');
  if(strength.strengthBand==='BALANCED') strengthTags.push('BALANCE_CAPACITY');
  evidence.push(finding({
    id:'WEALTH_INVESTMENT_STYLE_NATAL_STRENGTH',role:'PRIMARY',sourceType:'STRENGTH',sourceKey:strength.strengthBand,
    tags:strengthTags,
    magnitude:new Set(['VERY_WEAK','WEAK']).has(strength.strengthBand)?'HIGH':'MODERATE',
    plainMeaning:'日主强弱只用于理解长期承载、资源需求与资金安排节奏，不等于现实资产规模、风险承受能力或可投资金额。',
    technicalBasis:[`StrengthBand=${strength.strengthBand}`]
  }));

  const structureTags=['STRUCTURE_BASELINE'];
  if(RESOURCE_STRUCTURES.has(structureKey)) structureTags.push('RULE_STRUCTURE_NEED','RESERVE_ORIENTATION');
  if(AUTHORITY_STRUCTURES.has(structureKey)) structureTags.push('RULE_STRUCTURE_NEED','COMMITMENT_AWARENESS');
  if(WEALTH_OUTPUT_STRUCTURES.has(structureKey)) structureTags.push('FLEXIBILITY_NEED','RESOURCE_DEPLOYMENT');
  if(PEER_STRUCTURES.has(structureKey)) structureTags.push('CONCENTRATION_CONTROL','BOUNDARY_NEED');
  evidence.push(finding({
    id:'WEALTH_INVESTMENT_STYLE_NATAL_STRUCTURE',role:'PRIMARY',sourceType:'PATTERN_RESOLUTION',sourceKey:structureKey,
    tags:structureTags,
    magnitude:(RESOURCE_STRUCTURES.has(structureKey) || AUTHORITY_STRUCTURES.has(structureKey))?'HIGH':'MODERATE',
    plainMeaning:'原局结构用于理解资源组织、规则感、弹性与集中风险的长期倾向，不直接指定任何理财产品或投资标的。',
    technicalBasis:[`StructureKey=${structureKey}`,`PatternStage=${stage}`]
  }));

  if(COMPLEX_STAGES.has(stage)) evidence.push(finding({
    id:'WEALTH_INVESTMENT_STYLE_PATTERN_COMPLEXITY',role:'PRIMARY',sourceType:'PATTERN_STAGE',sourceKey:stage,
    tags:['COMPLEXITY_CONTROL','CONCENTRATION_CONTROL'],magnitude:stage==='BROKEN'?'HIGH':'MODERATE',
    plainMeaning:'结构存在较多牵制或复合条件时，资金安排更需要降低不必要复杂度，并把单点暴露限制在可承受范围内。',
    technicalBasis:[`PatternStage=${stage}`]
  }));

  const mechanisms=pattern.mechanisms ?? {};
  const routeCount=(mechanisms.routes ?? []).length;
  const failureCount=(mechanisms.failure ?? []).length;
  const rescueCount=(mechanisms.rescue ?? []).length;
  const reviewCount=(mechanisms.review ?? []).length;

  if(routeCount>0) evidence.push(finding({
    id:'WEALTH_INVESTMENT_STYLE_ROUTE_DIVERSITY',role:'SECONDARY',sourceType:'PATTERN_MECHANISM',sourceKey:'ROUTES_PRESENT',
    tags:['FLEXIBILITY_NEED','BUCKET_SEPARATION'],magnitude:routeCount>=2?'HIGH':'MODERATE',
    plainMeaning:'原局存在可辨识的运作路径，更适合把不同用途的资金职责分开，而不是把所有资金放在同一个目标里。',
    technicalBasis:[`RouteCount=${routeCount}`]
  }));

  if(failureCount>0 || reviewCount>0) evidence.push(finding({
    id:'WEALTH_INVESTMENT_STYLE_FRICTION_CONTROL',role:'SECONDARY',sourceType:'PATTERN_MECHANISM',sourceKey:'FRICTION_OR_REVIEW_PRESENT',
    tags:['COMPLEXITY_CONTROL','BOUNDARY_NEED'],magnitude:(failureCount+reviewCount)>=2?'HIGH':'MODERATE',
    plainMeaning:'结构中的牵制与待确认条件提示：长期资金安排应优先保留边界、流动性与复盘机制，避免把复杂性继续叠加。',
    technicalBasis:[`FailureCount=${failureCount}`,`ReviewCount=${reviewCount}`,`RescueCount=${rescueCount}`]
  }));

  return evidence;
}

function level(evidence,tags){
  const xs=evidence.filter(x=>tags.some(t=>x.tags.includes(t)));
  if(xs.some(x=>x.magnitude==='HIGH') || xs.length>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveWealthInvestmentStyleState(evidence){
  const liquidityNeed=level(evidence,['LIQUIDITY_NEED','BUFFER_NEED']);
  const ruleStructure=level(evidence,['RULE_STRUCTURE_NEED','RESERVE_ORIENTATION','COMMITMENT_AWARENESS']);
  const flexibilityNeed=level(evidence,['FLEXIBILITY_NEED','BUCKET_SEPARATION']);
  const deploymentCapacity=level(evidence,['DEPLOYMENT_CAPACITY','RESOURCE_DEPLOYMENT']);
  const complexityControl=level(evidence,['COMPLEXITY_CONTROL','CONCENTRATION_CONTROL','BOUNDARY_NEED']);

  let state='BALANCED_CORE_AND_FLEX';
  if(complexityControl==='STRONG') state='SIMPLIFY_AND_CONTAIN_RISK';
  else if(liquidityNeed==='STRONG') state='LIQUIDITY_AND_BUFFER_FIRST';
  else if(ruleStructure==='STRONG') state='RULE_BASED_BUCKETS';
  else if(deploymentCapacity==='STRONG' && flexibilityNeed!=='NONE') state='ACTIVE_BUT_CAPPED_ALLOCATION';

  return {
    state,
    dimensions:{liquidityNeed,ruleStructure,flexibilityNeed,deploymentCapacity,complexityControl},
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

const STATE_COPY=Object.freeze({
  LIQUIDITY_AND_BUFFER_FIRST:{
    direct:'更适合先把流动性与安全缓冲放在前面，再谈长期配置与机会资金。',
    current:'这种安排重点不是“保守就一定更好”，而是先确保必要支出、短期责任与应急空间不会被长期资金占用。',
    development:'先分清生活／经营必要资金、应急缓冲与长期可不用资金，再决定后续如何分层。',
    caution:'命盘不能替你计算实际需要多少应急金，也不能证明任何具体资产适合你。'
  },
  RULE_BASED_BUCKETS:{
    direct:'更适合规则清楚、用途分开的资金安排方式，用固定边界减少临时情绪对资金决策的影响。',
    current:'重点在于把不同用途、期限与责任分开管理，而不是频繁根据短期感觉改变全部资金配置。',
    development:'可把必要资金、缓冲资金、长期资金与可承受的机会资金分别定义用途与上限，并定期复盘。',
    caution:'“有规则”不等于规则永远正确，仍要根据真实收入、责任、期限与风险承受能力调整。'
  },
  BALANCED_CORE_AND_FLEX:{
    direct:'更适合保留稳定核心，同时保留一部分可调整空间的均衡资金架构。',
    current:'核心资金负责稳定与长期目标，弹性部分负责应对现实变化；两者职责分开，比全部资金追求同一种结果更清楚。',
    development:'先定义不可轻易动用的核心资金，再为中短期目标与可承受变化保留独立弹性空间。',
    caution:'均衡不是固定比例，更不是标准答案；实际比例必须由现金流、目标期限与损失承受能力决定。'
  },
  ACTIVE_BUT_CAPPED_ALLOCATION:{
    direct:'更适合保留主动配置空间，但每类资金都设清楚上限、用途与退出条件。',
    current:'可以给资源运用与机会尝试留空间，但不适合因为“能承接”就把全部流动性集中到同一方向。',
    development:'把核心资金与主动资金分开；主动部分只使用现实上可承受波动与暂时无法动用的资金。',
    caution:'主动配置不代表适合高风险产品，也不代表更高收益；具体风险仍必须现实评估。'
  },
  SIMPLIFY_AND_CONTAIN_RISK:{
    direct:'更适合先简化资金结构、限制单点暴露，并让每一笔资金的用途和最坏情况都看得见。',
    current:'当资源路径、责任或牵制较多时，增加更多复杂安排通常不会自动提高结果，反而更需要边界与可追踪性。',
    development:'减少用途重叠与过度集中，优先确保流动性、责任资金与长期资金彼此不会互相挤压。',
    caution:'“简化”不等于只持有现金，也不构成任何产品选择建议。'
  }
});

function contextAction(contextId){
  const map={
    CTX_NONE:null,
    CTX_STABLE_SALARY:'收入稳定时，可先把固定生活／责任资金与长期资金自动分开，再决定弹性资金的用途。',
    CTX_VARIABLE_INCOME:'收入波动较大时，先用较保守的收入基线规划固定支出与缓冲，不把高收入月份直接视为长期可用资金。',
    CTX_SELF_EMPLOYED:'自营／接案时，把个人生活资金、税务／责任资金、经营周转与长期资金分开记录，避免现金用途混在一起。',
    CTX_BUSINESS_OWNER:'经营生意时，先把公司周转、税务／应付款、个人生活与长期个人资金隔离，再讨论任何额外配置。',
    CTX_HIGH_FIXED_OBLIGATIONS:'固定责任较高时，优先核对每月必要现金流与偿还期限，避免长期资金安排挤压短期履约能力。',
    CTX_SHORT_TERM_GOAL:'近期有大额目标时，把目标金额与期限独立出来；在目标完成前，不让这笔资金承担超出期限的波动或锁定。',
    CTX_BUFFER_THIN:'应急缓冲偏薄时，先补足现实可用流动性，再考虑把更多资金放入长期或不易退出的安排。'
  };
  return map[contextId] ?? null;
}

export function renderWealthInvestmentStyleAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!WEALTH_INVESTMENT_STYLE_STATES.includes(state)) throw new Error(`Unknown WEALTH_INVESTMENT_STYLE state: ${state}`);
  normalizeContext(contextId);
  const copy=STATE_COPY[state];
  const why=evidence.slice(0,4).map(x=>x.plainMeaning);
  const actions=[contextAction(contextId),copy.development,'现实层请同时核对收入稳定性、应急缓冲、债务／固定责任、资金期限、流动性需求、损失承受能力、税务与合同责任。'].filter(Boolean);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    development:copy.development,
    actions:[...new Set(actions)].slice(0,3),
    caution:copy.caution,
    why,
    technicalBasis:evidence.slice(0,8).flatMap(x=>(x.technicalBasis ?? []).map(b=>`${x.sourceKey}: ${b}`)),
    deepAwareness:'这道题描述的是长期资金组织方式，不是在命盘里寻找某个“最赚钱产品”。好的资金安排首先让不同用途、期限与风险职责彼此分开。',
    realityBoundary:'具体比例、应急金金额、负债处理、储蓄或投资产品选择必须依据真实现金流、目标期限、流动性、风险承受能力、费用、税务与法律条件判断；本题不提供具体投资标的、资产类别配比、收益率预测、价格预测、买卖时点或保证收益。',
    certaintyLanguage:'NON_DETERMINISTIC'
  };
}

export function buildWealthInvestmentStyleEvidence(chart){
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const evidence=natalEvidence(strength,pattern);
  return {
    version:WEALTH_INVESTMENT_STYLE_VERSION,
    questionId:WEALTH_INVESTMENT_STYLE_QUESTION.questionId,
    evidence,
    primary:evidence.filter(x=>x.role==='PRIMARY'),
    secondary:evidence.filter(x=>x.role==='SECONDARY'),
    timing:[],
    modifiers:[],
    sourceSnapshot:{
      strengthBand:strength.strengthBand,
      structureKey:pattern.baseStructure?.key ?? null,
      patternStage:pattern.stage,
      timingUsedForState:false,
      natalStrengthRewritten:false,
      natalStructureRewritten:false
    }
  };
}

export function synthesizeWealthInvestmentStyle(chart,contextId='CTX_NONE'){
  const context=normalizeContext(contextId);
  const built=buildWealthInvestmentStyleEvidence(chart);
  const resolution=resolveWealthInvestmentStyleState(built.evidence);
  const answer=renderWealthInvestmentStyleAnswer(resolution.state,contextId,built.evidence);
  return {
    version:WEALTH_INVESTMENT_STYLE_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:WEALTH_INVESTMENT_STYLE_QUESTION,
    context,
    evidenceStack:built,
    synthesis:{...resolution,contextChangedEvidenceState:false},
    answer,
    trace:[
      `QUESTION=${WEALTH_INVESTMENT_STYLE_QUESTION.questionId}`,
      `STRUCTURE=${built.sourceSnapshot.structureKey}`,
      `PATTERN_STAGE=${built.sourceSnapshot.patternStage}`,
      `STRENGTH=${built.sourceSnapshot.strengthBand}`,
      `STATE=${resolution.state}`,
      `LIQUIDITY_NEED=${resolution.dimensions.liquidityNeed}`,
      `RULE_STRUCTURE=${resolution.dimensions.ruleStructure}`,
      `FLEXIBILITY_NEED=${resolution.dimensions.flexibilityNeed}`,
      `DEPLOYMENT_CAPACITY=${resolution.dimensions.deploymentCapacity}`,
      `COMPLEXITY_CONTROL=${resolution.dimensions.complexityControl}`,
      `CONTEXT=${contextId}`,
      'TIMING_REQUIRED=NO',
      'TIMING_REWRITES_STYLE_STATE=NO',
      'CONTEXT_REWRITES_EVIDENCE=NO',
      'CONTEXT_REWRITES_STATE=NO',
      'SHENSHA_PRIMARY_EVIDENCE=NO',
      'SPECIFIC_INVESTMENT_TARGET=NO',
      'ASSET_CLASS_ALLOCATION_PERCENTAGE=NO',
      'RETURN_RATE_PREDICTION=NO',
      'PRICE_PREDICTION=NO',
      'BUY_SELL_TIMING=NO',
      'GUARANTEED_RETURN=NO',
      'NUMERIC_SCORE=NO',
      'PERCENT_CONFIDENCE=NO'
    ]
  };
}
