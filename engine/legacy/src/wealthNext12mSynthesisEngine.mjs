import { synthesizeWealthCurrentState } from './wealthCurrentStateSynthesisEngine.mjs';

export const WEALTH_NEXT_12M_VERSION = 'GUANCHENG_WEALTH_NEXT_12M_PROTO_V1_STEP02_P1';

export const WEALTH_NEXT_12M_QUESTION = Object.freeze({
  questionId:'WEALTH_NEXT_12M',
  domain:'WEALTH',
  userText:'未来一年财富节奏如何？',
  intent:'ASSESS_NEXT_12_ROLLING_MONTH_WEALTH_TRAJECTORY',
  timeHorizon:'NEXT_12_ROLLING_CIVIL_MONTHS',
  evidenceRecipeId:'RECIPE_WEALTH_NEXT_12M_V1',
  contextRequired:false,
  contextSetId:'CTX_WEALTH_NEXT_12M_OPTIONAL',
  timingRequired:['DAYUN','YEAR','MONTHLY_WINDOWS_12'],
  outputTemplate:'WEALTH_NEXT_12M_TIMELINE_SYNTHESIS_V1'
});

export const WEALTH_NEXT_12M_CONTEXTS = Object.freeze({
  CTX_NONE:{label:'不补充现实财务状态'},
  CTX_SALARIED:{label:'目前以固定薪资／主业收入为主'},
  CTX_SELF_EMPLOYED:{label:'目前以自营／接案收入为主'},
  CTX_BUSINESS_OWNER:{label:'目前经营生意／品牌／公司'},
  CTX_CASHFLOW_TIGHT:{label:'目前现实现金流偏紧'},
  CTX_DEBT_OBLIGATIONS:{label:'目前有债务／固定偿还责任'},
  CTX_MAJOR_PURCHASE_PLANNED:{label:'未来一年计划较大金额支出'},
  CTX_INVESTMENT_EXPOSURE:{label:'目前已有较明显投资／资产价格暴露'}
});

export const WEALTH_NEXT_12M_WINDOW_STATES = Object.freeze([
  'STABLE_ACCUMULATION',
  'RESOURCE_MOMENTUM_BUILDING',
  'MONETIZATION_WINDOW',
  'REBALANCING_WINDOW',
  'PRESSURE_VOLATILITY_CAUTION'
]);

export const WEALTH_NEXT_12M_TRAJECTORY_STATES = Object.freeze([
  'STEADY_ACCUMULATION_CYCLE',
  'GRADUAL_RESOURCE_UPSWING',
  'MONETIZATION_FOCUSED_CYCLE',
  'REBALANCING_TRANSITION_CYCLE',
  'PRESSURE_VOLATILITY_CYCLE'
]);

function normalizeContext(contextId='CTX_NONE'){
  const c=WEALTH_NEXT_12M_CONTEXTS[contextId];
  if(!c){
    const e=new Error(`Unknown WEALTH_NEXT_12M context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:c.label,rewritesEvidence:false,rewritesTimeline:false,rewritesTrajectory:false};
}

function validateTiming(timing){
  if(!timing?.dayun || !timing?.year){
    const e=new Error('WEALTH_NEXT_12M requires active Dayun and Year from STEP 01 Core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}

function normalizeWindowFinding(x,windowId){
  if(!x || typeof x!=='object') throw new Error(`Invalid evidence in ${windowId}`);
  return {
    id:x.id ?? `${windowId}_${x.sourceKey ?? 'EVIDENCE'}`,
    role:x.role ?? 'TIMING',
    category:x.category ?? 'TIMING',
    sourceType:x.sourceType ?? 'MONTH_TIMING_SIGNAL',
    sourceKey:x.sourceKey ?? 'UNSPECIFIED',
    polarity:x.polarity ?? 'MIXED',
    magnitude:x.magnitude ?? 'MODERATE',
    timingScope:'MONTH',
    tags:[...new Set(x.tags ?? [])],
    plainMeaning:x.plainMeaning ?? '本月出现需要结合现实财务状态观察的财富节奏信号。',
    technicalBasis:[...(x.technicalBasis ?? [])],
    certainty:x.certainty ?? 'CONFIRMED',
    windowCoverageRatio:Number.isFinite(x.windowCoverageRatio)?x.windowCoverageRatio:null,
    windowInfluence:x.windowInfluence ?? null
  };
}

function validateMonthlyWindows(monthlyWindows){
  if(!Array.isArray(monthlyWindows) || monthlyWindows.length!==12){
    const e=new Error('WEALTH_NEXT_12M requires exactly twelve rolling civil-month windows');
    e.code='TWELVE_MONTH_WINDOWS_REQUIRED';
    throw e;
  }
  const ids=new Set();
  return monthlyWindows.map((w,i)=>{
    if(!w || typeof w!=='object') throw new Error(`Invalid monthly window at index ${i}`);
    const id=w.id ?? `M${i+1}`;
    if(ids.has(id)) throw new Error(`Duplicate monthly window id: ${id}`);
    ids.add(id);
    if(!Array.isArray(w.evidence)) throw new Error(`Monthly window ${id} requires evidence array`);
    return {
      id,index:i,label:w.label ?? `第${i+1}个月`,
      start:w.start ?? null,end:w.end ?? null,
      monthPillar:w.monthPillar ?? null,
      monthPillars:Array.isArray(w.monthPillars)?[...w.monthPillars]:(w.monthPillar?[w.monthPillar]:[]),
      yearPillars:Array.isArray(w.yearPillars)?[...w.yearPillars]:[],
      dayunPillars:Array.isArray(w.dayunPillars)?[...w.dayunPillars]:[],
      boundariesInside:Array.isArray(w.boundariesInside)?w.boundariesInside.map(x=>({...x})):[],
      segments:Array.isArray(w.segments)?w.segments.map(x=>({...x})):[],
      source:w.source ?? 'UPSTREAM_MONTH_TIMING',
      upstreamBoundaryConfirmed:w.upstreamBoundaryConfirmed ?? null,
      evidence:w.evidence.map(x=>normalizeWindowFinding(x,id))
    };
  });
}

function sourceCount(xs){ return new Set(xs.map(x=>`${x.sourceType}:${x.sourceKey}`)).size; }
function dimension(evidence,tags,{supportiveOnly=false,challengingOnly=false}={}){
  const tagged=evidence.filter(x=>tags.some(t=>x.tags.includes(t)) && (!supportiveOnly || x.polarity==='SUPPORTIVE') && (!challengingOnly || x.polarity==='CHALLENGING'));
  const xs=tagged.filter(x=>x.windowInfluence!=='TRACE_ONLY');
  const strongEligible=xs.filter(x=>(x.windowInfluence ?? 'PRIMARY')==='PRIMARY');
  if(strongEligible.some(x=>x.magnitude==='HIGH') || sourceCount(strongEligible)>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveWealthNext12mWindowState(evidence){
  const stability=dimension(evidence,['STABILITY_SUPPORT','STRUCTURE_STABILITY','CAPABILITY_SUPPORT','BUFFER_SUPPORT'],{supportiveOnly:true});
  const resource=dimension(evidence,['RESOURCE_ACCESS','INCOME_OPPORTUNITY','OPPORTUNITY_ACTIVATION','RESOURCE_SUPPORT','OPPORTUNITY','DEVELOPMENT_SUPPORT']);
  const monetization=dimension(evidence,['MONETIZATION','INCOME_GENERATION','EXECUTION_SUPPORT','MATERIAL_SUPPORT'],{supportiveOnly:true});
  const rebalancing=dimension(evidence,['RESOURCE_FLOW_CHANGE','RESOURCE_REORGANIZATION','TRANSITION','STRUCTURE_REORGANIZATION','ALLOCATION_REVIEW']);
  const pressure=dimension(evidence,['RESOURCE_PRESSURE','CASHFLOW_PRESSURE','RETENTION_PRESSURE','FRICTION'],{challengingOnly:true});
  const volatility=dimension(evidence,['VOLATILITY','FLOW_VOLATILITY','PRICE_VOLATILITY']);

  let state='STABLE_ACCUMULATION';
  if((pressure==='STRONG' || volatility==='STRONG') && stability!=='STRONG') state='PRESSURE_VOLATILITY_CAUTION';
  else if(rebalancing==='STRONG') state='REBALANCING_WINDOW';
  else if(monetization==='STRONG' && (resource!=='NONE' || stability!=='NONE') && pressure!=='STRONG') state='MONETIZATION_WINDOW';
  else if(resource==='STRONG' || monetization!=='NONE') state='RESOURCE_MOMENTUM_BUILDING';

  return {state,dimensions:{stability,resource,monetization,rebalancing,pressure,volatility},numericScoreUsed:false,percentConfidenceUsed:false};
}

function countStates(windows){
  const out=Object.fromEntries(WEALTH_NEXT_12M_WINDOW_STATES.map(s=>[s,0]));
  for(const w of windows) out[w.resolution.state]++;
  return out;
}

export function resolveWealthNext12mTrajectory(windows){
  if(!Array.isArray(windows) || windows.length!==12) throw new Error('Trajectory resolver requires twelve resolved monthly windows');
  const counts=countStates(windows);
  const firstHalf=windows.slice(0,6).map(x=>x.resolution.state);
  const secondHalf=windows.slice(6).map(x=>x.resolution.state);
  const laterPositive=secondHalf.filter(x=>['RESOURCE_MOMENTUM_BUILDING','MONETIZATION_WINDOW'].includes(x)).length;
  const laterPressure=secondHalf.filter(x=>x==='PRESSURE_VOLATILITY_CAUTION').length;
  const positiveCount=counts.RESOURCE_MOMENTUM_BUILDING+counts.MONETIZATION_WINDOW;

  let state='STEADY_ACCUMULATION_CYCLE';
  if(counts.PRESSURE_VOLATILITY_CAUTION>=3 || (counts.PRESSURE_VOLATILITY_CAUTION>=2 && laterPressure>laterPositive)) state='PRESSURE_VOLATILITY_CYCLE';
  else if(counts.REBALANCING_WINDOW>=3) state='REBALANCING_TRANSITION_CYCLE';
  else if(counts.MONETIZATION_WINDOW>=2 && secondHalf.includes('MONETIZATION_WINDOW')) state='MONETIZATION_FOCUSED_CYCLE';
  else if(positiveCount>=3 && laterPositive>=2) state='GRADUAL_RESOURCE_UPSWING';

  const turningWindows=[];
  for(let i=0;i<windows.length;i++){
    const current=windows[i].resolution.state;
    const prev=i?windows[i-1].resolution.state:null;
    if(['REBALANCING_WINDOW','PRESSURE_VOLATILITY_CAUTION'].includes(current) || (prev && current!==prev)) turningWindows.push(windows[i].id);
  }
  return {
    state,counts,firstHalf,secondHalf,turningWindows:[...new Set(turningWindows)],
    numericScoreUsed:false,percentConfidenceUsed:false
  };
}

const WINDOW_COPY=Object.freeze({
  STABLE_ACCUMULATION:'以稳定整理与累积为主，适合把收入、储备与必要支出维持在可控结构。',
  RESOURCE_MOMENTUM_BUILDING:'资源与收入动能开始增强，适合验证哪些来源真正具有持续性。',
  MONETIZATION_WINDOW:'变现与资源承接条件较集中，适合推进已经验证过的收入或项目路径。',
  REBALANCING_WINDOW:'资金与资源配置进入调整窗口，更适合重排优先级并保留流动性。',
  PRESSURE_VOLATILITY_CAUTION:'压力或波动偏高，重点应先守住现金流、责任边界与风险缓冲。'
});

const TRAJECTORY_COPY=Object.freeze({
  STEADY_ACCUMULATION_CYCLE:{
    direct:'未来 12 个月整体更偏稳定累积，重点不是追求突然放大，而是把收入、储备与资金结构逐步做稳。',
    focus:'把可重复收入、必要支出、储备与可承担的投入分开管理，持续提高资金可见度。',
    caution:'平稳不代表没有机会，也不代表现实收入一定不变；仍要以真实现金流和市场条件核对。'
  },
  GRADUAL_RESOURCE_UPSWING:{
    direct:'未来 12 个月整体呈逐步增强的资源节奏，较明显的推进条件会分阶段出现，而不是一次到位。',
    focus:'优先放大已经被现实验证的收入来源、客户渠道或可重复成果，同时记录成本与回款。',
    caution:'动能增强不等于净收益自动增加，新增收入与新增投入必须一起核对。'
  },
  MONETIZATION_FOCUSED_CYCLE:{
    direct:'未来 12 个月会有较集中的成果变现与资源承接阶段，适合把成熟能力、产品或项目转成更可验证的现实回报。',
    focus:'把重点放在可重复、可回款、合同条件清楚的收入路径，而不是只看一次性的金额。',
    caution:'变现窗口不等于项目一定赚钱，更不能替代市场、合同、税务与风险评估。'
  },
  REBALANCING_TRANSITION_CYCLE:{
    direct:'未来 12 个月更像经历一轮资金与资源结构的重新配置，前后阶段感会比较明显。',
    focus:'预留流动性与选择权，把收入来源、支出责任、项目投入和储备按阶段重新排序。',
    caution:'出现调整不代表一定要扩大投资、换资产或改变事业方向；现实条件仍需独立判断。'
  },
  PRESSURE_VOLATILITY_CYCLE:{
    direct:'未来 12 个月压力与波动主题偏重，更适合先守住现金流与风险边界，再决定是否扩大资金承诺。',
    focus:'把固定责任、回款周期、储备与最坏情况放在同一张表里，先降低不可控暴露。',
    caution:'压力信号不能证明现实中已经亏损或缺钱；实际财务状况必须直接核对。'
  }
});

function contextAction(contextId){
  const m={
    CTX_NONE:null,
    CTX_SALARIED:'固定薪资为主时，可把未来 12 个月拆成收入稳定性、储备累积与能力变现三条线观察。',
    CTX_SELF_EMPLOYED:'自营／接案为主时，重点跟踪订单来源、回款周期、成本与淡旺季现金流，不只看营业额。',
    CTX_BUSINESS_OWNER:'经营生意时，把销售、毛利、固定成本、库存／投入与现金储备一起看，避免把营收等同可用现金。',
    CTX_CASHFLOW_TIGHT:'现实现金流已经偏紧时，先处理必要支出、回款与缓冲，不必等时运信号证明风险。',
    CTX_DEBT_OBLIGATIONS:'已有债务或固定偿还责任时，优先核对利率、期限与偿还能力，再决定新增资金承诺。',
    CTX_MAJOR_PURCHASE_PLANNED:'计划大额支出时，提前分开必要资金、应急储备与可延后部分，避免把单一月份当作决策依据。',
    CTX_INVESTMENT_EXPOSURE:'已有投资／资产价格暴露时，优先确认流动性、集中度与可承受损失范围，不用命理替代投资判断。'
  };
  return m[contextId] ?? null;
}

function uniq(xs){ return [...new Set(xs.filter(Boolean))]; }

export function renderWealthNext12mAnswer(trajectory,windows,contextId='CTX_NONE',baseline=null){
  if(!WEALTH_NEXT_12M_TRAJECTORY_STATES.includes(trajectory.state)) throw new Error(`Unknown WEALTH_NEXT_12M trajectory: ${trajectory.state}`);
  const context=normalizeContext(contextId);
  const copy=TRAJECTORY_COPY[trajectory.state];
  const timeline=windows.map(w=>({
    id:w.id,label:w.label,start:w.start,end:w.end,monthPillar:w.monthPillar,monthPillars:w.monthPillars,yearPillars:w.yearPillars,dayunPillars:w.dayunPillars,boundariesInside:w.boundariesInside,
    state:w.resolution.state,summary:WINDOW_COPY[w.resolution.state]
  }));
  const pushWindows=windows.filter(w=>['RESOURCE_MOMENTUM_BUILDING','MONETIZATION_WINDOW'].includes(w.resolution.state)).map(w=>w.label);
  const protectWindows=windows.filter(w=>['REBALANCING_WINDOW','PRESSURE_VOLATILITY_CAUTION'].includes(w.resolution.state)).map(w=>w.label);
  const actions=uniq([
    contextAction(context.id),
    pushWindows.length?`资源／变现动能较值得验证的窗口集中在：${pushWindows.join('、')}。`:'先把未来一年的财务目标拆成收入、储备、支出与风险缓冲，不需要强行制造机会窗口。',
    protectWindows.length?`需要多保留流动性与风险余地的窗口：${protectWindows.join('、')}。`:'整体没有明显高压窗口，也仍要持续核对现实现金流与责任变化。'
  ]).slice(0,3);
  return {
    directAnswer:copy.direct,
    baseline:baseline?`当前财富基线：${baseline.answer?.directAnswer ?? baseline.synthesis?.state ?? '已建立'}`:'当前财富基线已建立。',
    timeline,
    development:copy.focus,
    actions,
    caution:copy.caution,
    turningWindows:trajectory.turningWindows,
    deepAwareness:'未来一年真正要看的不是“哪一个月最好”，而是收入、变现、资金调整与压力主题怎样在 12 个月里移动。看清阶段转换，比把每个月贴成吉凶更有用。',
    realityBoundary:'未来 12 个月的财富节奏不能证明实际收入、利润、账户余额、资产价格或投资回报；真实财务状态必须核对收入、成本、支出、负债、储备、合同、税务、市场条件与投资表现。',
    certaintyLanguage:'NON_DETERMINISTIC',
    context
  };
}

export function synthesizeWealthNext12m(chart,timing,monthlyWindows,contextId='CTX_NONE'){
  validateTiming(timing);
  const context=normalizeContext(contextId);
  const normalized=validateMonthlyWindows(monthlyWindows);
  const baseline=synthesizeWealthCurrentState(chart,timing,'CTX_NONE');
  const windows=normalized.map(w=>({...w,resolution:resolveWealthNext12mWindowState(w.evidence)}));
  const trajectory=resolveWealthNext12mTrajectory(windows);
  const answer=renderWealthNext12mAnswer(trajectory,windows,contextId,baseline);
  return {
    version:WEALTH_NEXT_12M_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:WEALTH_NEXT_12M_QUESTION,
    context,
    baseline:{
      state:baseline.synthesis.state,
      strengthBand:baseline.evidenceStack.sourceSnapshot.strengthBand,
      structureKey:baseline.evidenceStack.sourceSnapshot.structureKey,
      natalStrengthRewritten:baseline.evidenceStack.sourceSnapshot.natalStrengthRewritten,
      natalStructureRewritten:baseline.evidenceStack.sourceSnapshot.natalStructureRewritten
    },
    timeline:{windows,trajectory},
    answer,
    contracts:{
      monthlyTimingSource:'UPSTREAM_MONTH_TIMING_REQUIRED',
      monthAuthorityImplementedHere:false,
      strictTwelveRollingCivilMonthsRequired:true,
      exactJieSegmentationExpectedFromUpstream:true,
      liChunYearBoundaryExpectedFromUpstream:true,
      dayunBoundarySegmentationExpectedFromUpstream:true,
      contextRewritesEvidence:false,
      contextRewritesTimeline:false,
      contextRewritesTrajectory:false,
      actualFinancialPositionInferred:false,
      investmentReturnGuarantee:false,
      numericScoreUsed:false,
      percentConfidenceUsed:false
    },
    trace:[
      `QUESTION=${WEALTH_NEXT_12M_QUESTION.questionId}`,
      `BASELINE_STATE=${baseline.synthesis.state}`,
      `TRAJECTORY=${trajectory.state}`,
      `WINDOWS=${windows.map(w=>`${w.id}:${w.resolution.state}`).join('|')}`,
      `CONTEXT=${contextId}`,
      'HORIZON=12_ROLLING_CIVIL_MONTHS',
      'MONTH_AUTHORITY_IMPLEMENTED_HERE=NO',
      'EXACT_JIE_EXPECTED_FROM_UPSTREAM=YES',
      'CONTEXT_REWRITES_TIMELINE=NO',
      'ACTUAL_FINANCIAL_POSITION_INFERRED=NO',
      'INVESTMENT_RETURN_GUARANTEE=NO',
      'NUMERIC_SCORE=NO',
      'PERCENT_CONFIDENCE=NO'
    ]
  };
}
