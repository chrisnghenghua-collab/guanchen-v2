import { synthesizeCareerCurrentState } from './careerCurrentStateSynthesisEngine.mjs';

export const CAREER_NEXT_6M_VERSION = 'GUANCHENG_CAREER_NEXT_6M_PROTO_V1_STEP02_J1';

export const CAREER_NEXT_6M_QUESTION = Object.freeze({
  questionId:'CAREER_NEXT_6M',
  domain:'CAREER',
  userText:'未来半年事业怎么走？',
  intent:'ASSESS_SIX_MONTH_CAREER_TRAJECTORY',
  timeHorizon:'NEXT_6_MONTHS',
  evidenceRecipeId:'RECIPE_CAREER_NEXT_6M_V1',
  contextRequired:false,
  contextSetId:'CTX_CAREER_NEXT_6M_OPTIONAL',
  timingRequired:['DAYUN','YEAR','MONTHLY_WINDOWS_6'],
  outputTemplate:'CAREER_NEXT_6M_TIMELINE_SYNTHESIS_V1'
});

export const CAREER_NEXT_6M_CONTEXTS = Object.freeze({
  CTX_NONE:{label:'不补充现实状态'},
  CTX_WORK_STABLE:{label:'目前工作整体稳定'},
  CTX_ROLE_EXPANDING:{label:'最近职责正在增加'},
  CTX_JOB_SEARCHING:{label:'正在观察或寻找外部机会'},
  CTX_ORG_CHANGING:{label:'团队／公司正在调整'},
  CTX_PRESSURE_HIGH:{label:'最近工作压力明显偏高'}
});

export const CAREER_NEXT_6M_WINDOW_STATES = Object.freeze([
  'STABLE_BUILD',
  'MOMENTUM_BUILDING',
  'RESPONSIBILITY_RISING',
  'TRANSITION_WINDOW',
  'PRESSURE_CAUTION'
]);

export const CAREER_NEXT_6M_TRAJECTORY_STATES = Object.freeze([
  'STEADY_BUILD',
  'GRADUAL_UPSWING',
  'RESPONSIBILITY_ASCENDING',
  'TURNING_POINT_CYCLE',
  'PRESSURE_ADJUSTMENT_CYCLE'
]);

const MAG={LOW:1,MODERATE:2,HIGH:3};

function normalizeContext(contextId='CTX_NONE'){
  const c=CAREER_NEXT_6M_CONTEXTS[contextId];
  if(!c){
    const e=new Error(`Unknown CAREER_NEXT_6M context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:c.label,rewritesEvidence:false,rewritesTimeline:false,rewritesTrajectory:false};
}

function validateTiming(timing){
  if(!timing?.dayun || !timing?.year){
    const e=new Error('CAREER_NEXT_6M requires active Dayun and Year from STEP 01 Core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}

function validateMonthlyWindows(monthlyWindows){
  if(!Array.isArray(monthlyWindows) || monthlyWindows.length!==6){
    const e=new Error('CAREER_NEXT_6M requires exactly six monthly windows');
    e.code='SIX_MONTH_WINDOWS_REQUIRED';
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
      id,
      index:i,
      label:w.label ?? `第${i+1}个月`,
      start:w.start ?? null,
      end:w.end ?? null,
      monthPillar:w.monthPillar ?? null,
      monthPillars:Array.isArray(w.monthPillars)?[...w.monthPillars]:(w.monthPillar?[w.monthPillar]:[]),
      yearPillars:Array.isArray(w.yearPillars)?[...w.yearPillars]:[],
      dayunPillars:Array.isArray(w.dayunPillars)?[...w.dayunPillars]:[],
      boundariesInside:Array.isArray(w.boundariesInside)?w.boundariesInside.map(x=>({...x})):[],
      segments:Array.isArray(w.segments)?w.segments.map(x=>({...x})):[],
      source:w.source ?? 'UPSTREAM_MONTH_TIMING',
      evidence:w.evidence.map(x=>normalizeWindowFinding(x,id)),
      upstreamBoundaryConfirmed:w.upstreamBoundaryConfirmed ?? null
    };
  });
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
    plainMeaning:x.plainMeaning ?? '本月出现需要结合现实工作状态观察的事业信号。',
    technicalBasis:[...(x.technicalBasis ?? [])],
    certainty:x.certainty ?? 'CONFIRMED',
    windowCoverageRatio:Number.isFinite(x.windowCoverageRatio)?x.windowCoverageRatio:null,
    windowInfluence:x.windowInfluence ?? null
  };
}

function sourceCount(xs){ return new Set(xs.map(x=>`${x.sourceType}:${x.sourceKey}`)).size; }
function dimension(evidence,tags,{supportiveOnly=false,challengingOnly=false}={}){
  const tagged=evidence.filter(x=>tags.some(t=>x.tags.includes(t)) && (!supportiveOnly || x.polarity==='SUPPORTIVE') && (!challengingOnly || x.polarity==='CHALLENGING'));
  const xs=tagged.filter(x=>x.windowInfluence!=='TRACE_ONLY');
  const strongEligible=xs.filter(x=>(x.windowInfluence ?? 'PRIMARY')==='PRIMARY');
  if(strongEligible.some(x=>x.magnitude==='HIGH') || sourceCount(strongEligible)>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveCareerNext6mWindowState(evidence){
  const support=dimension(evidence,['SUPPORT','STABILITY_SUPPORT','DEVELOPMENT_SUPPORT','MATERIAL_SUPPORT','RECOGNITION_SUPPORT'],{supportiveOnly:true});
  const responsibility=dimension(evidence,['RESPONSIBILITY','AUTHORITY','ROLE_EXPANSION']);
  const growth=dimension(evidence,['GROWTH','GROWTH_DRIVE','MOMENTUM','OPPORTUNITY'],{supportiveOnly:true});
  const friction=dimension(evidence,['FRICTION','PRESSURE','RISK_LOAD'],{challengingOnly:true});
  const transition=dimension(evidence,['TRANSITION','ENVIRONMENT_SHIFT','STRUCTURE_REORGANIZATION','MOBILITY']);

  let state='STABLE_BUILD';
  if(friction==='STRONG' && support!=='STRONG') state='PRESSURE_CAUTION';
  else if(transition==='STRONG') state='TRANSITION_WINDOW';
  else if(responsibility==='STRONG' && friction!=='STRONG') state='RESPONSIBILITY_RISING';
  else if((growth==='STRONG' || support==='STRONG') && friction!=='STRONG') state='MOMENTUM_BUILDING';

  return {state,dimensions:{support,responsibility,growth,friction,transition},numericScoreUsed:false,percentConfidenceUsed:false};
}

function countStates(windows){
  const out=Object.fromEntries(CAREER_NEXT_6M_WINDOW_STATES.map(s=>[s,0]));
  for(const w of windows) out[w.resolution.state]++;
  return out;
}

export function resolveCareerNext6mTrajectory(windows){
  if(!Array.isArray(windows) || windows.length!==6) throw new Error('Trajectory resolver requires six resolved windows');
  const counts=countStates(windows);
  const firstHalf=windows.slice(0,3).map(x=>x.resolution.state);
  const secondHalf=windows.slice(3).map(x=>x.resolution.state);
  const laterMomentum=secondHalf.filter(x=>['MOMENTUM_BUILDING','RESPONSIBILITY_RISING'].includes(x)).length;
  const laterPressure=secondHalf.filter(x=>x==='PRESSURE_CAUTION').length;

  let state='STEADY_BUILD';
  if(counts.PRESSURE_CAUTION>=2 || (counts.PRESSURE_CAUTION>=1 && laterPressure>laterMomentum)) state='PRESSURE_ADJUSTMENT_CYCLE';
  else if(counts.TRANSITION_WINDOW>=2 || (counts.TRANSITION_WINDOW>=1 && new Set(windows.map(x=>x.resolution.state)).size>=3)) state='TURNING_POINT_CYCLE';
  else if(counts.RESPONSIBILITY_RISING>=2) state='RESPONSIBILITY_ASCENDING';
  else if(counts.MOMENTUM_BUILDING>=2 && laterMomentum>=1) state='GRADUAL_UPSWING';
  else state='STEADY_BUILD';

  const turningWindows=[];
  for(let i=0;i<windows.length;i++){
    const current=windows[i].resolution.state;
    const prev=i?windows[i-1].resolution.state:null;
    if(['TRANSITION_WINDOW','PRESSURE_CAUTION'].includes(current) || (prev && current!==prev)) turningWindows.push(windows[i].id);
  }
  return {
    state,
    counts,
    firstHalf,
    secondHalf,
    turningWindows:[...new Set(turningWindows)],
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

const WINDOW_COPY=Object.freeze({
  STABLE_BUILD:'以稳定累积为主，适合把现有工作做实。',
  MOMENTUM_BUILDING:'支持与发展动能增强，适合推进可控的重要事项。',
  RESPONSIBILITY_RISING:'责任与角色要求上升，适合把新增职责转成权限与成果。',
  TRANSITION_WINDOW:'变化与重组信号增强，适合观察并准备调整。',
  PRESSURE_CAUTION:'摩擦与压力偏重，宜先处理负荷与风险，不宜只靠硬推。'
});

const TRAJECTORY_COPY=Object.freeze({
  STEADY_BUILD:{
    direct:'未来半年整体以稳步累积为主，没有必要为了制造变化而急着动作。',
    focus:'重点是持续做实成果、能力与职业筹码。',
    caution:'平稳不代表没有进展，不要只用“有没有大变化”衡量这半年。'
  },
  GRADUAL_UPSWING:{
    direct:'未来半年整体呈逐步走强的趋势，后段更适合把握发展与推进机会。',
    focus:'把前段准备转成后段可落地的成果、项目或职业选择。',
    caution:'趋势转强不等于每个月都顺，仍要看现实资源与组织条件。'
  },
  RESPONSIBILITY_ASCENDING:{
    direct:'未来半年更明显的主题是责任与角色上升，工作位置可能变得更重要也更忙。',
    focus:'把新增责任同步转成权限、资源、成果与可见度。',
    caution:'不要只接责任却没有相应的资源、边界或回报。'
  },
  TURNING_POINT_CYCLE:{
    direct:'未来半年不是单一路线，更像会经历一段明显调整或转折，前后阶段感会比较强。',
    focus:'重点是识别真正的转折窗口，并在变化前预留选择权。',
    caution:'有转折不等于一定换工作，也不代表变化本身一定更好。'
  },
  PRESSURE_ADJUSTMENT_CYCLE:{
    direct:'未来半年压力与调整主题偏重，重点应先放在稳住节奏、降低失衡，再决定是否推进重大职业动作。',
    focus:'先找出压力来源，并把不可控风险、职责负荷与现实资源分开处理。',
    caution:'压力明显时，避免把“想离开”直接等同于“任何变化都会更好”。'
  }
});

function contextAction(contextId){
  const m={
    CTX_NONE:null,
    CTX_WORK_STABLE:'现实工作稳定时，可以把半年计划拆成成果累积、能力升级与机会观察三条线。',
    CTX_ROLE_EXPANDING:'职责已经增加时，优先确认未来半年哪些责任会沉淀成权限、资源与正式成果。',
    CTX_JOB_SEARCHING:'正在看机会时，把时间窗口当作节奏参考，同时直接比较职位、薪资、团队和稳定性。',
    CTX_ORG_CHANGING:'组织正在调整时，先确认汇报关系、岗位变化和现实风险，不要只依赖趋势判断。',
    CTX_PRESSURE_HIGH:'现实压力已经很高时，先处理负荷与恢复，半年规划不要建立在持续透支上。'
  };
  return m[contextId] ?? null;
}

function uniq(xs){ return [...new Set(xs.filter(Boolean))]; }

export function renderCareerNext6mAnswer(trajectory,windows,contextId='CTX_NONE',baseline=null){
  if(!CAREER_NEXT_6M_TRAJECTORY_STATES.includes(trajectory.state)) throw new Error(`Unknown CAREER_NEXT_6M trajectory: ${trajectory.state}`);
  const context=normalizeContext(contextId);
  const copy=TRAJECTORY_COPY[trajectory.state];
  const timeline=windows.map(w=>({
    id:w.id,label:w.label,start:w.start,end:w.end,monthPillar:w.monthPillar,monthPillars:w.monthPillars,yearPillars:w.yearPillars,dayunPillars:w.dayunPillars,boundariesInside:w.boundariesInside,
    state:w.resolution.state,
    summary:WINDOW_COPY[w.resolution.state]
  }));
  const pushWindows=windows.filter(w=>['MOMENTUM_BUILDING','RESPONSIBILITY_RISING'].includes(w.resolution.state)).map(w=>w.label);
  const observeWindows=windows.filter(w=>['TRANSITION_WINDOW','PRESSURE_CAUTION'].includes(w.resolution.state)).map(w=>w.label);
  const actions=uniq([
    contextAction(context.id),
    pushWindows.length?`较适合推进的窗口集中在：${pushWindows.join('、')}。`:'先把半年目标拆成可验证的小步骤，不需要强行制造推进窗口。',
    observeWindows.length?`需要多观察与留余地的窗口：${observeWindows.join('、')}。`:'整体没有明显高压窗口，也仍要以现实项目与组织条件为准。'
  ]).slice(0,3);
  return {
    directAnswer:copy.direct,
    baseline:baseline?`当前工作基线：${baseline.answer?.directAnswer ?? baseline.synthesis?.state ?? '已建立'}`:'当前基线已建立。',
    timeline,
    development:copy.focus,
    actions,
    caution:copy.caution,
    turningWindows:trajectory.turningWindows,
    deepAwareness:'半年趋势真正要看的不是“哪一个月最好”，而是你的工作主轴如何从累积、责任、变化与压力之间移动。把阶段看清，比把每个月贴上吉凶标签更有用。',
    realityBoundary:'半年事业趋势不能替代现实中的组织决策、职位变化、绩效结果、合同、薪资与个人健康负荷；具体事件仍需直接核实。',
    certaintyLanguage:'NON_DETERMINISTIC',
    context
  };
}

export function synthesizeCareerNext6m(chart,timing,monthlyWindows,contextId='CTX_NONE'){
  validateTiming(timing);
  const context=normalizeContext(contextId);
  const normalized=validateMonthlyWindows(monthlyWindows);
  const baseline=synthesizeCareerCurrentState(chart,timing,'CTX_NONE');
  const windows=normalized.map(w=>({...w,resolution:resolveCareerNext6mWindowState(w.evidence)}));
  const trajectory=resolveCareerNext6mTrajectory(windows);
  const answer=renderCareerNext6mAnswer(trajectory,windows,contextId,baseline);
  return {
    version:CAREER_NEXT_6M_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:CAREER_NEXT_6M_QUESTION,
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
      contextRewritesEvidence:false,
      contextRewritesTimeline:false,
      contextRewritesTrajectory:false,
      numericScoreUsed:false,
      percentConfidenceUsed:false
    },
    trace:[
      `QUESTION=${CAREER_NEXT_6M_QUESTION.questionId}`,
      `BASELINE_STATE=${baseline.synthesis.state}`,
      `TRAJECTORY=${trajectory.state}`,
      `WINDOWS=${windows.map(w=>`${w.id}:${w.resolution.state}`).join('|')}`,
      `CONTEXT=${contextId}`,
      'MONTH_AUTHORITY_IMPLEMENTED_HERE=NO',
      'CONTEXT_REWRITES_TIMELINE=NO',
      'NUMERIC_SCORE=NO',
      'PERCENT_CONFIDENCE=NO'
    ]
  };
}
