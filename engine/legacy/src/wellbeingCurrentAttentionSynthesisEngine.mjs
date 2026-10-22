import { assessTimingActivation } from '../../src/timingActivationEngine.mjs';
import { buildWellbeingDailyRhythmSynthesis } from './wellbeingDailyRhythmSynthesisEngine.mjs';
import { buildWellbeingLoadPatternSynthesis } from './wellbeingLoadPatternSynthesisEngine.mjs';
import { buildWellbeingRecoveryOrientationSynthesis } from './wellbeingRecoveryOrientationSynthesisEngine.mjs';

export const WELLBEING_CURRENT_ATTENTION_VERSION='GUANCHEN_WELLBEING_CURRENT_ATTENTION_PROTO_V1_STEP03_WB4_A1';

export const WELLBEING_CURRENT_ATTENTION_QUESTION=Object.freeze({
  questionId:'WELLBEING_CURRENT_ATTENTION',
  domain:'WELLBEING',
  userText:'最近一段时间的节奏与负荷需要留意什么？',
  intent:'ATTACH_CURRENT_DAYUN_ANNUAL_ATTENTION_TO_EXISTING_B1_DERIVED_WELLBEING_NATAL_CLAIMS',
  classification:'TIMING_CURRENT_ATTENTION',
  primaryTopics:Object.freeze(['DailyRhythm','LoadAndRecoveryPattern']),
  primarySemantics:Object.freeze(['Existing Natal Wellbeing claim only']),
  behaviorTarget:'ContextualReflection',
  evidenceRecipeId:'RECIPE_WELLBEING_CURRENT_ATTENTION_V1',
  primaryNatalAuthority:'EXISTING_B1_DERIVED_WELLBEING_NATAL_CLAIMS',
  b2DirectBridgeAllowed:false,
  timingRequired:Object.freeze(['ACTIVE_DAYUN_OR_ANNUAL_FROM_STEP01_CORE']),
  monthTimingAdapterRequired:false,
  outputTemplate:'WELLBEING_CURRENT_ATTENTION_SYNTHESIS_V1'
});

export const WELLBEING_CURRENT_ATTENTION_STATES=Object.freeze([
  'NO_SPECIFIC_CURRENT_ATTENTION',
  'DAYUN_ONLY_CURRENT_ATTENTION',
  'ANNUAL_ONLY_CURRENT_ATTENTION',
  'PARALLEL_DAYUN_ANNUAL_ATTENTION',
  'SHARED_CROSS_TEMPORAL_ATTENTION'
]);

export const WELLBEING_CURRENT_ATTENTION_CONTEXTS=Object.freeze({
  CTX_NONE:{label:'不补充现实节奏与负荷情境'},
  CTX_REGULAR_SCHEDULE:{label:'目前日程相对规律'},
  CTX_IRREGULAR_SCHEDULE:{label:'目前日程经常变化'},
  CTX_HIGH_LOAD:{label:'目前现实任务或责任负荷较高'},
  CTX_RECOVERY_OPPORTUNITY:{label:'目前有一定回稳与留白空间'},
  CTX_SHIFT_WORK:{label:'现实中有轮班或非固定时段安排'},
  CTX_TRAVEL:{label:'近期有旅行或跨地区移动安排'},
  CTX_CAREGIVING_OR_MAJOR_COMMITMENT:{label:'目前有照护责任或重大现实承诺'}
});

const CLAIM_ORDER=Object.freeze([
  'WELLBEING_DAILY_RHYTHM',
  'WELLBEING_LOAD_PATTERN',
  'WELLBEING_RECOVERY_ORIENTATION'
]);

const SEMANTIC_OBSERVATION=Object.freeze({
  Rhythm:'观察最近的日程起伏、开始与结束边界，以及高密度区段之间是否真的有转换空间；这里不推断睡眠疾病或医学作息问题。',
  Balance:'观察现实任务、留白与可回稳空间是否失衡；“平衡”只指日常安排，不是健康分数、器官状态或医学风险。',
  Load:'观察事项、责任与并行任务是否在现实中集中堆叠，并优先处理已经实际存在的负荷；不把它解释成身体承受能力。',
  Pressure:'观察期限、责任、同时进行的事项与现实要求是否让安排更难切换；这里的“压力”不是焦虑、压力障碍或医学严重度。',
  RecoveryOrientation:'观察最近是否需要调整回稳方式、增加转换区或改变活动性质；这不是医学康复、治疗建议或身体修复速度判断。'
});

function normalizeContext(contextId='CTX_NONE'){
  const found=WELLBEING_CURRENT_ATTENTION_CONTEXTS[contextId];
  if(!found){
    const e=new Error(`Unknown WELLBEING_CURRENT_ATTENTION context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:found.label,rewritesEvidence:false,rewritesState:false};
}

function requireTiming(timing={}){
  if(!timing || (!timing.dayun && !timing.year)){
    const e=new Error('WELLBEING_CURRENT_ATTENTION requires active Dayun and/or Annual pillar resolved by STEP01 core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}

function packNatalClaim(r,source){
  return {
    questionId:r.question.questionId,
    userText:r.question.userText,
    primaryTopics:[...(r.question.primaryTopics??(r.question.primaryTopic?[r.question.primaryTopic]:[]))],
    primarySemantics:[...r.question.primarySemantics],
    natalState:r.resolution.state,
    sourceVersion:r.version,
    source,
    primaryAuthority:'B1_TYPED_WELLBEING',
    b2DirectBridgeUsed:false,
    primaryEvidence:r.evidence.filter(x=>x.role==='PRIMARY'&&x.bridge==='B1_TYPED_WELLBEING').map(x=>({id:x.id,semantic:x.semantic,sourceType:x.sourceType,sourceKey:x.sourceKey,tags:[...x.tags]})),
    b3Modifiers:r.evidence.filter(x=>x.role==='MODIFIER').map(x=>({id:x.id,bridge:x.bridge,sourceKey:x.sourceKey,plainMeaning:x.plainMeaning})),
    b4Supporting:r.evidence.filter(x=>x.role==='SUPPORTING').map(x=>({id:x.id,bridge:x.bridge,sourceKey:x.sourceKey,plainMeaning:x.plainMeaning}))
  };
}

function buildExistingNatalClaims(chart){
  const wb1=buildWellbeingDailyRhythmSynthesis({chart,contextId:'CTX_NONE'});
  const wb2=buildWellbeingLoadPatternSynthesis({chart,contextId:'CTX_NONE'});
  const wb3=buildWellbeingRecoveryOrientationSynthesis({chart,contextId:'CTX_NONE'});
  return [
    packNatalClaim(wb1,'WB1_FINAL_FROZEN_RECIPE'),
    packNatalClaim(wb2,'WB2_FINAL_FROZEN_RECIPE'),
    packNatalClaim(wb3,'WB3_FINAL_FROZEN_RECIPE')
  ];
}

function addSignal(map,order,{layer,pillar,semantic,signalClass,sourceFact}){
  const key=`${layer}:${semantic}`;
  if(!map.has(key)){
    order.push(key);
    map.set(key,{layer,pillar,semantic,signalClass,sourceFacts:[]});
  }
  const row=map.get(key);
  if(!row.sourceFacts.some(x=>JSON.stringify(x)===JSON.stringify(sourceFact))) row.sourceFacts.push(sourceFact);
}

function buildB5TimingSignals(activation){
  const order=[];
  const map=new Map();

  for(const layer of activation.layers){
    for(const f of layer.findings??[]){
      if(f.category==='TEMPORARY_SUPPORT'){
        addSignal(map,order,{layer:layer.layer,pillar:layer.pillar,semantic:'Balance',signalClass:'TEMPORARY_SUPPORT_ATTENTION',sourceFact:{category:f.category,key:f.key,status:f.status??null}});
      }
      if(f.category==='RELATION_TRIGGER' && f.status!=='FACT_ONLY'){
        addSignal(map,order,{layer:layer.layer,pillar:layer.pillar,semantic:'Load',signalClass:'RELATION_TRIGGER_ATTENTION',sourceFact:{category:f.category,key:f.key,status:f.status??null}});
      }
      if(f.category==='PUNISHMENT_COMPLETION'){
        addSignal(map,order,{layer:layer.layer,pillar:layer.pillar,semantic:'Load',signalClass:'PUNISHMENT_COMPLETION_ATTENTION',sourceFact:{category:f.category,key:f.key,status:f.status??null}});
      }
      if(f.category==='ASSEMBLY_COMPLETION'){
        addSignal(map,order,{layer:layer.layer,pillar:layer.pillar,semantic:'RecoveryOrientation',signalClass:'ASSEMBLY_COMPLETION_ATTENTION',sourceFact:{category:f.category,key:f.key,status:f.status??null}});
      }
    }
  }

  for(const p of activation.patternActivation??[]){
    const layer=activation.layers.find(x=>x.layer===p.layer);
    if(!layer) continue;
    if(['PATTERN_PRESSURE_CANDIDATE','PATTERN_COMPLEXITY_REVIEW'].includes(p.classification)){
      addSignal(map,order,{layer:p.layer,pillar:layer.pillar,semantic:'Pressure',signalClass:'PATTERN_PRESSURE_ATTENTION',sourceFact:{category:'PATTERN_ACTIVATION',key:p.key,status:p.classification}});
    } else if(p.classification==='PATTERN_SUPPORT_CANDIDATE'){
      addSignal(map,order,{layer:p.layer,pillar:layer.pillar,semantic:'Balance',signalClass:'PATTERN_SUPPORT_ATTENTION',sourceFact:{category:'PATTERN_ACTIVATION',key:p.key,status:p.classification}});
    } else if(p.classification==='PATTERN_ROUTE_CANDIDATE'){
      addSignal(map,order,{layer:p.layer,pillar:layer.pillar,semantic:'RecoveryOrientation',signalClass:'PATTERN_ROUTE_ATTENTION',sourceFact:{category:'PATTERN_ACTIVATION',key:p.key,status:p.classification}});
    }
  }

  return order.map(k=>map.get(k));
}

function claimTargetsForSemantic(natalClaims,semantic){
  return CLAIM_ORDER.flatMap(questionId=>{
    const claim=natalClaims.find(x=>x.questionId===questionId);
    return claim && claim.primarySemantics.includes(semantic) ? [claim] : [];
  });
}

function buildCurrentAttentionAttachments(signals,natalClaims){
  const rows=[];
  for(const signal of signals){
    const targets=claimTargetsForSemantic(natalClaims,signal.semantic);
    for(const claim of targets){
      rows.push({
        id:`WB_CURRENT_B5_${signal.layer}_${signal.semantic}_${claim.questionId}`,
        role:'CURRENT_ATTENTION',
        bridge:'B5_CURRENT_ATTENTION_ONLY',
        domain:'WELLBEING',
        timingLayer:signal.layer,
        timingPillar:signal.pillar,
        signalClass:signal.signalClass,
        semantic:signal.semantic,
        sourceFacts:signal.sourceFacts.map(x=>({...x})),
        targetQuestionId:claim.questionId,
        targetNatalState:claim.natalState,
        targetKey:`${claim.questionId}:${signal.semantic}`,
        priority:'SUPPORTING',
        polarity:'NEUTRAL',
        direction:'OBSERVE',
        raisesAttentionOnly:true,
        createsNatalClaim:false,
        rewritesNatalState:false,
        createsMedicalClaim:false,
        eventPrediction:false,
        symptomForecast:false,
        accidentPrediction:false,
        probabilityMeaning:false,
        rankMeaning:false,
        tenGodToWellbeingBridgeUsed:false,
        plainMeaning:`${signal.layer==='DAYUN'?'当前大运':'当前流年'}只把既有的「${claim.userText}」中与 ${signal.semantic} 有关的内容带入当前观察范围；它不改变原本 Wellbeing State，也不代表健康事件、症状或事故会发生。`,
        observationPrompt:SEMANTIC_OBSERVATION[signal.semantic]
      });
    }
  }
  return rows;
}

function targetSourceMap(attachments){
  const map=new Map();
  for(const x of attachments){
    if(!map.has(x.targetKey)) map.set(x.targetKey,new Set());
    map.get(x.targetKey).add(x.timingLayer);
  }
  return map;
}

export function resolveWellbeingCurrentAttentionState(attachments){
  const hasDayun=attachments.some(x=>x.timingLayer==='DAYUN');
  const hasYear=attachments.some(x=>x.timingLayer==='YEAR');
  const targetMap=targetSourceMap(attachments);
  const shared=[...targetMap.values()].filter(s=>s.has('DAYUN')&&s.has('YEAR')).length;
  const single=[...targetMap.values()].filter(s=>s.size===1).length;

  let state;
  if(!hasDayun && !hasYear) state='NO_SPECIFIC_CURRENT_ATTENTION';
  else if(hasDayun && !hasYear) state='DAYUN_ONLY_CURRENT_ATTENTION';
  else if(!hasDayun && hasYear) state='ANNUAL_ONLY_CURRENT_ATTENTION';
  else if(hasDayun && hasYear && shared===0) state='PARALLEL_DAYUN_ANNUAL_ATTENTION';
  else state='SHARED_CROSS_TEMPORAL_ATTENTION';

  return {
    state,
    sourceLayers:[...(hasDayun?['DAYUN']:[]),...(hasYear?['YEAR']:[])],
    distinctTargetCount:targetMap.size,
    sharedTargetCount:shared,
    singleLayerTargetCount:single,
    claimCountVotingUsed:false,
    rankingUsed:false,
    numericScoreUsed:false,
    percentConfidenceUsed:false,
    multipleSourcesMeanStronger:false,
    multipleSourcesMeanHigherProbability:false,
    medicalProbabilityMeaning:false,
    mixedSharedParallelComposition:shared>0&&single>0
  };
}

function summarizeCurrentFocus(attachments){
  const order=[];
  const map=new Map();
  for(const x of attachments){
    if(!map.has(x.targetKey)){
      order.push(x.targetKey);
      map.set(x.targetKey,{
        targetKey:x.targetKey,
        targetQuestionId:x.targetQuestionId,
        targetNatalState:x.targetNatalState,
        semantic:x.semantic,
        temporalSources:[],
        observationPrompt:x.observationPrompt,
        priority:'SUPPORTING',polarity:'NEUTRAL',direction:'OBSERVE',
        eventPrediction:false,symptomForecast:false,accidentPrediction:false,
        rank:null,score:null,confidencePercent:null
      });
    }
    const row=map.get(x.targetKey);
    row.temporalSources.push({layer:x.timingLayer,pillar:x.timingPillar,signalClass:x.signalClass,sourceFacts:x.sourceFacts.map(f=>({...f}))});
  }
  return order.map(k=>{
    const x=map.get(k);
    return {...x,sourceMultiplicity:x.temporalSources.length>1?'MULTIPLE':'SINGLE',multipleDoesNotMeanStronger:x.temporalSources.length>1};
  });
}

const STATE_COPY=Object.freeze({
  NO_SPECIFIC_CURRENT_ATTENTION:'当前时运层没有形成可合法附着到既有 Wellbeing claim 的额外 B5 信号；这不是“没有问题”或“健康很好”，而是本题不补造时运关注点，继续以既有 Natal 结论与现实情况为准。',
  DAYUN_ONLY_CURRENT_ATTENTION:'目前可确认的是大运层带来的 Wellbeing CurrentAttention；它只提高既有节奏、负荷或回稳主题的观察度，不建立新的健康结论。',
  ANNUAL_ONLY_CURRENT_ATTENTION:'目前可确认的是流年层带来的 Wellbeing CurrentAttention；即使同时有大运输入，也不会把只有 TenGod entry、没有合法 Wellbeing B5 activation 的层硬转换成关注点。',
  PARALLEL_DAYUN_ANNUAL_ATTENTION:'当前大运与流年分别把不同的既有 Wellbeing 主题带入观察范围；这些主题并列存在，不代表其中任何一个更严重、更重要或更可能发生健康事件。',
  SHARED_CROSS_TEMPORAL_ATTENTION:'当前大运与流年至少共同关联到一个既有 Wellbeing 主题；Multiple 只表示 distinct temporal sources，可同时存在其他单层关注点，但不表示风险更高、症状更近或医学概率上升。'
});

function contextReflection(contextId){
  const map={
    CTX_NONE:null,
    CTX_REGULAR_SCHEDULE:'若现实日程相对规律，可把 CurrentAttention 当作检查清单：哪些节奏、负荷或回稳主题现实中真的出现，再调整哪些。',
    CTX_IRREGULAR_SCHEDULE:'若日程经常变化，可优先检查开始/结束边界、并行事项与可回稳空间；命盘关注点不能替代实际排程信息。',
    CTX_HIGH_LOAD:'若现实任务负荷确实较高，可对照 Load / Pressure 相关 CurrentFocus 检查责任、期限与并行事项；这里不推断身体是否“承受不住”。',
    CTX_RECOVERY_OPPORTUNITY:'若现实中已有一定留白，可观察这些空间是否真正用于降密度、切换或回稳；不把“恢复”解释成医学康复效果。',
    CTX_SHIFT_WORK:'轮班或非固定时段属于现实排程条件，只用于 framing；CurrentAttention 不能生成睡眠疾病、器官时辰或医学作息处方。',
    CTX_TRAVEL:'旅行或跨地区移动会改变现实作息与任务安排，可据此调整 framing；不能把移动本身变成八字健康风险证据。',
    CTX_CAREGIVING_OR_MAJOR_COMMITMENT:'照护责任或重大承诺可用于现实负荷 framing，但不会改写八字 evidence、State 或健康结论。'
  };
  return map[contextId]??null;
}

export function renderWellbeingCurrentAttentionAnswer(resolution,currentFocus,contextId='CTX_NONE'){
  normalizeContext(contextId);
  return {
    directAnswer:STATE_COPY[resolution.state],
    currentFocus,
    reflectionPrompts:[contextReflection(contextId),...currentFocus.map(x=>x.observationPrompt)].filter(Boolean),
    caution:'CurrentAttention 只表示“最近值得观察哪些既有节奏、负荷与回稳主题”，不是疾病、症状、事故、器官状态或医学风险预测，也没有概率、严重度或精确时间点含义。',
    deepAwareness:'这里不会把大运与流年重新计算成第二套 Wellbeing Natal 结论，也不会建立 TenGod→Wellbeing 的 B2 直连桥；时运只能通过 B5 附着在已经成立的 B1-derived Wellbeing claim 上。',
    realityBoundary:'现实中的症状、诊断、受伤、康复、药物与治疗问题必须依据真实医学信息处理；它们不会被转换成八字 evidence。',
    topNUsed:false,rankingUsed:false,numericScoreUsed:false,percentConfidenceUsed:false,
    eventPredictionUsed:false,symptomForecastUsed:false,accidentPredictionUsed:false,medicalProbabilityUsed:false
  };
}

export function buildWellbeingCurrentAttentionSynthesis({chart,timing={},contextId='CTX_NONE',reportedSymptoms=null,diagnosisContext=null,rehabilitationContext=null}={}){
  if(!chart) throw new Error('chart is required');
  requireTiming(timing);
  const context=normalizeContext(contextId);
  const natalClaims=buildExistingNatalClaims(chart);
  const activation=assessTimingActivation(chart,timing);
  const timingSignals=buildB5TimingSignals(activation);
  const attachments=buildCurrentAttentionAttachments(timingSignals,natalClaims);
  const resolution=resolveWellbeingCurrentAttentionState(attachments);
  const currentFocus=summarizeCurrentFocus(attachments);
  const answer=renderWellbeingCurrentAttentionAnswer(resolution,currentFocus,contextId);

  return {
    version:WELLBEING_CURRENT_ATTENTION_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:WELLBEING_CURRENT_ATTENTION_QUESTION,
    context,
    userHealthContext:{
      symptomContextProvided:Boolean(reportedSymptoms),
      diagnosisContextProvided:Boolean(diagnosisContext),
      rehabilitationContextProvided:Boolean(rehabilitationContext),
      usedForEvidence:false,
      convertedToBaziEvidence:false,
      changesCurrentAttentionState:false
    },
    timingInput:{dayun:timing.dayun??null,year:timing.year??null,authority:'STEP01_CORE_RESOLVED_ACTIVE_DAYUN_ANNUAL'},
    natalClaims,
    timingActivation:{
      version:activation.version,
      authorityStatus:activation.authorityStatus,
      natalInvariant:activation.natalInvariant,
      layers:activation.layers.map(x=>({layer:x.layer,pillar:x.pillar})),
      routingInputPolicy:'B5_USES_NON_TENGOD_ACTIVATION_CATEGORIES_ONLY; TIMING_LAYER_PRESENCE_ALONE_DOES_NOT_CREATE_WELLBEING_ATTENTION',
      tenGodFamilyToWellbeingSemanticMappingUsed:false,
      natalRewritten:false
    },
    timingSignals,
    evidence:attachments,
    resolution,
    currentFocus,
    answer,
    policy:{
      primaryNatalAuthority:'EXISTING_B1_DERIVED_WELLBEING_NATAL_CLAIMS',
      b2DirectBridgeAllowed:false,
      b3Role:'MODIFIER_ONLY_FROM_EXISTING_NATAL_CLAIM',
      b4Role:'SUPPORTING_ONLY_FROM_EXISTING_NATAL_CLAIM',
      b5Role:'CURRENT_ATTENTION_ONLY',
      timingTenGodToWellbeingBridgeUsed:false,
      temporalCreatesNatalClaim:false,
      temporalRewritesNatalState:false,
      dayunAnnualComparisonCreatesClaim:false,
      monthTimingAdapterUsed:false,
      healthEventPredictionUsed:false,
      symptomForecastUsed:false,
      accidentPredictionUsed:false,
      exactMedicalEventDateUsed:false,
      currentAttentionProbabilityUsed:false,
      currentAttentionSeverityScoreUsed:false,
      currentAttentionConvertedToDiagnosis:false,
      symptomOrDiagnosisInputUsedForEvidence:false,
      rehabilitationInputUsedForEvidence:false,
      careerOrWealthStateUsed:false,
      topNUsed:false,
      claimCountVotingUsed:false
    },
    trace:[
      `NATAL_CLAIMS=${natalClaims.map(x=>`${x.questionId}:${x.natalState}`).join('|')}`,
      `TIMING_LAYERS=${activation.layers.map(x=>`${x.layer}:${x.pillar}`).join('|')}`,
      `B5_SIGNALS=${timingSignals.map(x=>`${x.layer}:${x.semantic}:${x.signalClass}`).join('|')}`,
      `B5_ATTACHMENTS=${attachments.map(x=>`${x.timingLayer}:${x.semantic}->${x.targetQuestionId}`).join('|')}`,
      `CURRENT_FOCUS=${currentFocus.map(x=>`${x.targetKey}:${x.sourceMultiplicity}`).join('|')}`,
      `STATE=${resolution.state}`,
      'B1_EXISTING_NATAL_CLAIMS_FIRST=YES',
      'B2_DIRECT_BRIDGE=NOT_USED',
      'B5_CURRENT_ATTENTION_ONLY=YES',
      'TEN_GOD_TO_WELLBEING_ROUTING=NO',
      'NATAL_REWRITE=NO',
      'MONTH_TIMING=NOT_USED',
      'HEALTH_EVENT_PREDICTION=NO',
      'SYMPTOM_FORECAST=NO',
      'DIAGNOSIS_CONVERSION=NO',
      'RANKING=NO'
    ]
  };
}
