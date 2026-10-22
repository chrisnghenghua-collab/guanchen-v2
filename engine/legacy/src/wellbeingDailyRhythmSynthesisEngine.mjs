import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';

export const WELLBEING_DAILY_RHYTHM_VERSION='GUANCHEN_WELLBEING_DAILY_RHYTHM_PROTO_V1_STEP03_WB1_A1';

export const WELLBEING_DAILY_RHYTHM_QUESTION=Object.freeze({
  questionId:'WELLBEING_DAILY_RHYTHM',
  domain:'WELLBEING',
  userText:'我的日常节奏更适合怎样安排？',
  intent:'ASSESS_NATAL_DAILY_RHYTHM_AND_BALANCE_ORIENTATION',
  classification:'NATAL',
  primaryTopic:'DailyRhythm',
  primarySemantics:Object.freeze(['Rhythm','Balance']),
  behaviorTarget:'DailyRhythmObservation',
  evidenceRecipeId:'RECIPE_WELLBEING_DAILY_RHYTHM_V1',
  primaryAuthority:'B1_TYPED_WELLBEING',
  b2DirectBridgeAllowed:false,
  timingRequired:Object.freeze([]),
  monthTimingAdapterRequired:false,
  outputTemplate:'WELLBEING_DAILY_RHYTHM_SYNTHESIS_V1'
});

export const WELLBEING_DAILY_RHYTHM_STATES=Object.freeze([
  'RHYTHM_REBALANCE_REVIEW',
  'BUFFERED_CADENCE_FIRST',
  'ALTERNATING_PACE_BALANCE',
  'STEADY_CADENCE_ANCHOR',
  'FLEXIBLE_RHYTHM_COORDINATION'
]);

export const WELLBEING_DAILY_RHYTHM_CONTEXTS=Object.freeze({
  CTX_NONE:{label:'不补充现实日程情境'},
  CTX_REGULAR_SCHEDULE:{label:'目前日程相对规律'},
  CTX_IRREGULAR_SCHEDULE:{label:'目前日程经常变化'},
  CTX_HIGH_LOAD:{label:'目前现实任务负荷较高'},
  CTX_RECOVERY_OPPORTUNITY:{label:'目前有一定回稳与留白空间'},
  CTX_SHIFT_WORK:{label:'现实中有轮班或非固定时段安排'},
  CTX_TRAVEL:{label:'近期有旅行或跨地区移动安排'},
  CTX_CAREGIVING_OR_MAJOR_COMMITMENT:{label:'目前有照护责任或重大现实承诺'}
});

const ELEMENTS=Object.freeze(['WOOD','FIRE','EARTH','METAL','WATER']);

function normalizeContext(contextId='CTX_NONE'){
  const found=WELLBEING_DAILY_RHYTHM_CONTEXTS[contextId];
  if(!found){
    const e=new Error(`Unknown WELLBEING_DAILY_RHYTHM context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:found.label,rewritesEvidence:false,rewritesState:false};
}

function unique(xs){ return [...new Set(xs)]; }

export function buildAbsoluteFiveElementState(strength){
  if(!strength?.dayMaster?.element) throw new Error('strength result with dayMaster is required');
  const records=[
    {source:'DAY_MASTER_VISIBLE',element:strength.dayMaster.element},
    ...(strength.roots??[]).map(x=>({source:x.position,element:x.element})),
    ...(strength.supportFindings??[]).map(x=>({source:x.position,element:x.element})),
    ...(strength.opposingFindings??[]).map(x=>({source:x.position,element:x.element}))
  ].filter(x=>ELEMENTS.includes(x.element));

  const counts=Object.fromEntries(ELEMENTS.map(e=>[e,0]));
  for(const r of records) counts[r.element]+=1;
  const ordered=ELEMENTS.map(element=>({element,count:counts[element]}))
    .sort((a,b)=>b.count-a.count || ELEMENTS.indexOf(a.element)-ELEMENTS.indexOf(b.element));
  const coverageCount=ordered.filter(x=>x.count>0).length;
  const top=ordered[0];
  const second=ordered[1];
  const concentrationBand=(coverageCount<=3 || (top.count>=second.count+2 && top.count>=4))
    ? 'CONCENTRATED'
    : (top.count>second.count ? 'CLEAR_LEAD' : 'DISTRIBUTED');

  return {
    sourceAuthority:'B1_ABSOLUTE_FIVE_ELEMENT_OCCURRENCE_PROFILE_FROM_EXISTING_NATAL_RECORDS',
    counts,
    ordered,
    coverageCount,
    concentrationBand,
    leadingElement:top.count>second.count?top.element:null,
    scoreUsed:false,
    weightedScoringUsed:false,
    note:'Counts are structural occurrence facts from the existing natal records, not a health score, severity score, or a second strength authority.'
  };
}

export function buildYongXiJiWellbeingRoleProfile(strength,absoluteState){
  const fav=strength?.favorable;
  if(!fav) throw new Error('strength favorable assessment is required');
  const yong=unique(fav.primaryElements??[]);
  const xi=unique([...(fav.secondaryElements??[]),...(fav.conditionalElements??[])]).filter(x=>!yong.includes(x));
  const ji=unique(fav.excessRiskElements??[]).filter(x=>!yong.includes(x)&&!xi.includes(x));
  const countOf=e=>absoluteState.counts[e]??0;
  const yongPresent=yong.some(e=>countOf(e)>0);
  const yongHighestRank=yong.length
    ? Math.min(...yong.map(e=>absoluteState.ordered.findIndex(x=>x.element===e)).filter(i=>i>=0))
    : null;
  const yongAnchor=(yongPresent && yongHighestRank!=null && yongHighestRank<=1);
  const leading=absoluteState.leadingElement;
  const jiLeads=Boolean(leading && ji.includes(leading));

  return {
    sourceAuthority:'EXISTING_STRENGTH_FAVORABLE_BUCKETS_ADAPTED_TO_B1_WELLBEING_ROLES',
    yongElements:yong,
    xiElements:xi,
    jiElements:ji,
    yongPresent,
    yongAnchor,
    jiLeads,
    createsSecondFavorableAuthority:false,
    sourceConfidence:fav.confidence??'UNSPECIFIED'
  };
}

function finding({id,role='PRIMARY',bridge='B1_TYPED_WELLBEING',sourceType,sourceKey,semantic,tags=[],magnitude='MODERATE',plainMeaning,technicalBasis=[]}){
  return {
    id,role,bridge,domain:'WELLBEING',topic:'DailyRhythm',sourceType,sourceKey,semantic,
    tags:unique(tags),magnitude,timingScope:'NATAL',certainty:'CONFIRMED',plainMeaning,technicalBasis,
    medicalClaim:false,organClaim:false,diseaseClaim:false,treatmentClaim:false
  };
}

function b1TypedWellbeingEvidence(strength,absoluteState,roles){
  const evidence=[];
  evidence.push(finding({
    id:'WB_DAILY_B1_DAY_MASTER_BASELINE',sourceType:'DAY_MASTER',sourceKey:`${strength.dayMaster.stem}/${strength.dayMaster.element}`,
    semantic:'Rhythm',tags:['NATAL_RHYTHM_BASELINE'],magnitude:'MODERATE',
    plainMeaning:'日主在本题只作为日常节奏观察的原局基点；它不对应器官、疾病、症状或医学作息处方。',
    technicalBasis:[`DayMaster=${strength.dayMaster.stem}/${strength.dayMaster.element}`]
  }));

  const distributionTags=['ABSOLUTE_FIVE_ELEMENT_STATE'];
  let distributionMagnitude='MODERATE';
  if(absoluteState.concentrationBand==='CONCENTRATED'){
    distributionTags.push('STRUCTURAL_CONCENTRATION','BALANCE_REVIEW');
    distributionMagnitude='HIGH';
  } else if(absoluteState.concentrationBand==='CLEAR_LEAD'){
    distributionTags.push('STRUCTURAL_LEAD','PACE_ALTERNATION_CANDIDATE');
  } else {
    distributionTags.push('DISTRIBUTED_RANGE','FLEXIBLE_RANGE');
  }
  evidence.push(finding({
    id:'WB_DAILY_B1_ABSOLUTE_ELEMENT_STATE',sourceType:'ABSOLUTE_FIVE_ELEMENT_STATE',sourceKey:absoluteState.concentrationBand,
    semantic:'Balance',tags:distributionTags,magnitude:distributionMagnitude,
    plainMeaning:'原局五行的绝对分布在本题只用于判断节奏是否需要更明显的留白、交替或弹性，不转换成身体强弱或健康严重度。',
    technicalBasis:[`Coverage=${absoluteState.coverageCount}`,`Concentration=${absoluteState.concentrationBand}`,`Leading=${absoluteState.leadingElement??'NONE'}`]
  }));

  if(!roles.yongPresent){
    evidence.push(finding({
      id:'WB_DAILY_B1_YONG_DIRECTION_GAP',sourceType:'YONG_XI_JI_ROLE',sourceKey:'YONG_NOT_PRESENT_IN_ABSOLUTE_PROFILE',
      semantic:'Balance',tags:['SUPPORTIVE_DIRECTION_GAP','BUFFER_NEEDED'],magnitude:'HIGH',
      plainMeaning:'当前原局中主要平衡方向没有形成明显结构占位；本题因此更强调安排缓冲与可调整空间，而不是把日程排得过满。',
      technicalBasis:[`Yong=${roles.yongElements.join('|')||'NONE'}`]
    }));
  } else {
    evidence.push(finding({
      id:'WB_DAILY_B1_YONG_DIRECTION_PRESENT',sourceType:'YONG_XI_JI_ROLE',sourceKey:roles.yongAnchor?'YONG_ANCHOR_PRESENT':'YONG_PRESENT',
      semantic:'Rhythm',tags:['SUPPORTIVE_DIRECTION_PRESENT',...(roles.yongAnchor?['CADENCE_ANCHOR']:[])],magnitude:roles.yongAnchor?'HIGH':'MODERATE',
      plainMeaning:'原局中主要平衡方向已有结构占位；本题只把它转换为可建立日常节奏锚点的倾向，不对应医学疗效或健康保证。',
      technicalBasis:[`Yong=${roles.yongElements.join('|')||'NONE'}`,`YongAnchor=${roles.yongAnchor?'YES':'NO'}`]
    }));
  }

  if(roles.jiLeads){
    evidence.push(finding({
      id:'WB_DAILY_B1_JI_DIRECTION_LEADS',sourceType:'YONG_XI_JI_ROLE',sourceKey:`JI_LEAD_${absoluteState.leadingElement}`,
      semantic:'Balance',tags:['EXCESS_DIRECTION_LEADS','ALTERNATION_NEEDED'],magnitude:'HIGH',
      plainMeaning:'原局中需要避免继续堆叠的方向同时处于分布领先位置；本题只据此提示不要长期维持单一节奏，应增加阶段切换与留白。',
      technicalBasis:[`Ji=${roles.jiElements.join('|')||'NONE'}`,`Leading=${absoluteState.leadingElement}`]
    }));
  }

  if(absoluteState.concentrationBand==='DISTRIBUTED' && roles.yongPresent && !roles.jiLeads){
    evidence.push(finding({
      id:'WB_DAILY_B1_FLEXIBLE_RANGE',sourceType:'B1_COMPOSITION',sourceKey:'DISTRIBUTED_WITH_SUPPORTIVE_DIRECTION',
      semantic:'Rhythm',tags:['FLEXIBLE_RANGE','ADAPTIVE_CADENCE'],magnitude:'MODERATE',
      plainMeaning:'原局分布较分散且主要平衡方向可见时，本题更适合保留弹性，用少数稳定节点配合现实日程调整。',
      technicalBasis:['Composition=DISTRIBUTED_WITH_SUPPORTIVE_DIRECTION']
    }));
  }

  return evidence;
}

function b3RelationModifier(strength){
  const states=(strength.relationResolution?.positionStates??[]).filter(x=>x.state && x.state!=='NONE');
  if(!states.length) return [];
  const key=states.map(x=>`${x.position}:${x.state}`).join('|');
  return [finding({
    id:'WB_DAILY_B3_RELATION_MODIFIER',role:'MODIFIER',bridge:'B3_EXACT_LINKED_RELATION',sourceType:'RELATION_TRANSFORMATION',sourceKey:key,
    semantic:'Rhythm',tags:['MODIFIER_ONLY','TRANSITION_REVIEW_NUANCE'],magnitude:'MODERATE',
    plainMeaning:'原局存在明确关系牵动时，只作为“节奏切换与安排复盘”的修饰线索；它不能单独建立 Wellbeing State，也不代表身体或健康事件。',
    technicalBasis:states.slice(0,4).map(x=>`${x.position}=${x.state}`)
  })];
}

function b4PatternSupporting(pattern){
  const m=pattern.mechanisms??{};
  const total=(m.routes?.length??0)+(m.failure?.length??0)+(m.rescue?.length??0)+(m.review?.length??0);
  if(!total) return [];
  return [finding({
    id:'WB_DAILY_B4_PATTERN_SUPPORT',role:'SUPPORTING',bridge:'B4_SUPPORTING_ONLY',sourceType:'PATTERN_MECHANISM',sourceKey:'MECHANISMS_PRESENT',
    semantic:'Balance',tags:['SUPPORTING_ONLY','REFLECTION_NUANCE'],magnitude:'MODERATE',
    plainMeaning:'结构机制只补充“哪些节奏安排值得更常复盘”的说明，不拥有独立 State 决定权，更不能转成医学判断。',
    technicalBasis:[`RouteCount=${m.routes?.length??0}`,`FailureCount=${m.failure?.length??0}`,`RescueCount=${m.rescue?.length??0}`,`ReviewCount=${m.review?.length??0}`]
  })];
}

function primaryLevel(evidence,tags){
  const xs=evidence.filter(x=>x.role==='PRIMARY' && x.bridge==='B1_TYPED_WELLBEING' && tags.some(t=>x.tags.includes(t)));
  if(xs.some(x=>x.magnitude==='HIGH') || xs.length>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveWellbeingDailyRhythmState(evidence){
  const supportiveGap=primaryLevel(evidence,['SUPPORTIVE_DIRECTION_GAP']);
  const structuralConcentration=primaryLevel(evidence,['STRUCTURAL_CONCENTRATION']);
  const alternationNeed=primaryLevel(evidence,['ALTERNATION_NEEDED']);
  const cadenceAnchor=primaryLevel(evidence,['CADENCE_ANCHOR']);
  const flexibleRange=primaryLevel(evidence,['FLEXIBLE_RANGE','ADAPTIVE_CADENCE']);

  let state='FLEXIBLE_RHYTHM_COORDINATION';
  if(supportiveGap==='STRONG' && structuralConcentration==='STRONG') state='RHYTHM_REBALANCE_REVIEW';
  else if(supportiveGap==='STRONG') state='BUFFERED_CADENCE_FIRST';
  else if(alternationNeed==='STRONG') state='ALTERNATING_PACE_BALANCE';
  else if(cadenceAnchor==='STRONG') state='STEADY_CADENCE_ANCHOR';

  return {
    state,
    dimensions:{supportiveGap,structuralConcentration,alternationNeed,cadenceAnchor,flexibleRange},
    stateDrivenByRoles:['PRIMARY'],
    primaryBridge:'B1_TYPED_WELLBEING',
    b2DirectBridgeUsed:false,
    b3CanOwnState:false,
    b4CanOwnState:false,
    b5Used:false,
    careerOrWealthStateUsed:false,
    medicalEvidenceUsed:false,
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

const COPY=Object.freeze({
  RHYTHM_REBALANCE_REVIEW:{
    direct:'你的日常节奏更适合先做“减密度、留转换、再稳定”的重新整理，而不是直接追求更满或更快。',
    current:'当原局的平衡方向较难直接承接，同时结构分布又偏集中时，日程更需要明确的缓冲区与阶段切换。',
    action:'先固定少数必要节点，再刻意保留任务之间的转换空间；一次只调整一个节奏变量，观察现实执行是否更顺。',
    caution:'这里的“重新整理”只描述日程与节奏管理，不代表身体失衡、疾病、疲劳程度或任何医学结论。'
  },
  BUFFERED_CADENCE_FIRST:{
    direct:'你的日常节奏更适合先留出缓冲，再安排连续任务；可调整空间比把时间塞满更重要。',
    current:'原局主要平衡方向的结构占位较少时，本题更强调让日程有余量，而不是用连续高密度安排维持稳定。',
    action:'把关键事项前后留出可移动区间，并减少多个高要求事项无缝衔接；稳定来自可持续执行，不来自排满。',
    caution:'缓冲安排不是医疗恢复方案，也不能由命盘推导真实睡眠、体力、症状或健康需求。'
  },
  ALTERNATING_PACE_BALANCE:{
    direct:'你的日常节奏更适合用“专注一段—转换一下—再进入下一段”的交替方式，而不是长期维持同一种强度与模式。',
    current:'原局中需要避免继续堆叠的方向处于分布领先位置时，本题更重视节奏切换与留白，避免现实安排持续单向累积。',
    action:'把连续任务切成清楚区段，中间安排短转换；不同性质的事项尽量不要无限叠在同一时段。',
    caution:'“交替”是日程组织建议，不是器官时辰法、健康治疗法，也不预测任何身体事件。'
  },
  STEADY_CADENCE_ANCHOR:{
    direct:'你的日常节奏更适合先建立少数稳定锚点，再围绕这些锚点安排其余事项。',
    current:'当主要平衡方向在原局已有较明显结构占位时，规律的基础节点更容易成为节奏组织核心。',
    action:'选择两三个现实中最容易长期维持的固定节点，其余安排保留弹性；重点是可重复，而不是精确到每个小时。',
    caution:'稳定锚点不等于固定医学作息，也不能从命盘推导必须几点睡、几点吃或任何治疗性时间表。'
  },
  FLEXIBLE_RHYTHM_COORDINATION:{
    direct:'你的日常节奏更适合“少数基本原则＋按现实调整”，不需要把整天锁成完全固定的时间表。',
    current:'当原局没有出现足以要求更强节奏优先级的信号时，弹性协调本身就是较稳妥的安排方式。',
    action:'先确定最重要的优先事项与不可冲突时段，其余时间按任务性质、现实负荷与可用空间调整。',
    caution:'弹性并不代表忽略现实身体感受；真实症状、持续不适或健康问题不能由八字解释或替代现实评估。'
  }
});

function contextAction(contextId){
  const map={
    CTX_NONE:null,
    CTX_REGULAR_SCHEDULE:'如果目前日程已经规律，可先保留现有稳定节点，只微调任务密度与转换空间，不必为了命盘重新打乱可执行的现实安排。',
    CTX_IRREGULAR_SCHEDULE:'如果日程经常变化，不必强迫整天固定；优先固定一两个最可控的节点，其余用区段与缓冲管理。',
    CTX_HIGH_LOAD:'如果现实任务负荷较高，先减少同时并行的事项，并为高要求任务之间保留转换区；现实负荷只影响行动 framing，不改变命理 State。',
    CTX_RECOVERY_OPPORTUNITY:'如果目前有较多留白空间，可把它用于观察哪种节奏最容易长期维持，而不是把空档再次全部填满。',
    CTX_SHIFT_WORK:'如果有轮班或非固定时段，按真实班表建立可控锚点；本题不使用“器官时辰”或固定医学时间处方。',
    CTX_TRAVEL:'如果近期旅行或跨地区移动较多，先围绕交通、工作与现实承诺重建少数锚点，其余保持弹性，不把旅行本身当成命理证据。',
    CTX_CAREGIVING_OR_MAJOR_COMMITMENT:'如果有照护责任或重大承诺，先划出不可移动事项，再为自己保留最小可调整空间；这些现实责任只改变执行方式，不改变原局 evidence。'
  };
  return map[contextId]??null;
}

export function renderWellbeingDailyRhythmAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!WELLBEING_DAILY_RHYTHM_STATES.includes(state)) throw new Error(`Unknown WELLBEING_DAILY_RHYTHM state: ${state}`);
  normalizeContext(contextId);
  const copy=COPY[state];
  const modifiers=evidence.filter(x=>x.role!=='PRIMARY').map(x=>x.plainMeaning).slice(0,2);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    actions:[contextAction(contextId),copy.action,'以现实可执行性为准：命盘只提供节奏观察框架，不能替代你对真实日程、身体感受与专业健康信息的判断。'].filter(Boolean).slice(0,3),
    caution:copy.caution,
    why:evidence.filter(x=>x.role==='PRIMARY').slice(0,5).map(x=>x.plainMeaning),
    modifiers,
    deepAwareness:'这道题只回答“日常节奏怎样组织比较合适”，不回答疾病、器官、症状、治疗、药物、寿命、事故风险或医学概率。',
    medicalBoundary:'若现实中存在症状、诊断、持续不适或其他健康问题，这些信息不会被转换成八字 evidence；实际健康评估必须留在命理系统之外。',
    numericScoreUsed:false,
    percentConfidenceUsed:false,
    medicalAdviceUsed:false
  };
}

export function buildWellbeingDailyRhythmSynthesis({chart,contextId='CTX_NONE',reportedSymptoms=null,diagnosisContext=null}={}){
  if(!chart) throw new Error('chart is required');
  const context=normalizeContext(contextId);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const absoluteElementState=buildAbsoluteFiveElementState(strength);
  const yongXiJiRoles=buildYongXiJiWellbeingRoleProfile(strength,absoluteElementState);
  const primary=b1TypedWellbeingEvidence(strength,absoluteElementState,yongXiJiRoles);
  const modifiers=b3RelationModifier(strength);
  const supporting=b4PatternSupporting(pattern);
  const evidence=[...primary,...modifiers,...supporting];
  const resolution=resolveWellbeingDailyRhythmState(evidence);
  const answer=renderWellbeingDailyRhythmAnswer(resolution.state,contextId,evidence);
  return {
    version:WELLBEING_DAILY_RHYTHM_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:WELLBEING_DAILY_RHYTHM_QUESTION,
    context,
    userHealthContext:{
      symptomContextProvided:Boolean(reportedSymptoms),
      diagnosisContextProvided:Boolean(diagnosisContext),
      usedForEvidence:false,
      convertedToBaziEvidence:false
    },
    natal:{
      dayMaster:strength.dayMaster,
      strengthBand:strength.strengthBand,
      structureKey:pattern.baseStructure?.key??'UNKNOWN_STRUCTURE',
      patternStage:pattern.stage??'UNKNOWN'
    },
    absoluteElementState,
    yongXiJiRoles,
    evidence,
    resolution,
    answer,
    policy:{
      primaryAuthority:'B1_TYPED_WELLBEING',
      b2DirectBridgeAllowed:false,
      b3Role:'MODIFIER_ONLY_AFTER_VALID_WELLBEING_CLAIM',
      b4Role:'SUPPORTING_ONLY',
      b5Used:false,
      monthTimingAdapterUsed:false,
      currentAttentionUsed:false,
      medicalInterpretationUsed:false,
      organDiagnosisUsed:false,
      symptomDiagnosisUsed:false,
      treatmentRecommendationUsed:false,
      medicationRecommendationUsed:false,
      lifespanOrPrognosisUsed:false,
      accidentRiskUsed:false,
      medicalProbabilityUsed:false,
      careerOrWealthStateUsed:false
    },
    trace:[
      `DAY_MASTER=${strength.dayMaster.stem}/${strength.dayMaster.element}`,
      `STRENGTH=${strength.strengthBand}`,
      `ABSOLUTE_ELEMENT_BAND=${absoluteElementState.concentrationBand}`,
      `ABSOLUTE_ELEMENT_LEAD=${absoluteElementState.leadingElement??'NONE'}`,
      `YONG=${yongXiJiRoles.yongElements.join('|')||'NONE'}`,
      `XI=${yongXiJiRoles.xiElements.join('|')||'NONE'}`,
      `JI=${yongXiJiRoles.jiElements.join('|')||'NONE'}`,
      `STATE=${resolution.state}`,
      `PRIMARY_EVIDENCE=${primary.map(x=>x.id).join('|')}`,
      `B3_MODIFIERS=${modifiers.length?'PRESENT':'NONE'}`,
      `B4_SUPPORT=${supporting.length?'PRESENT':'NONE'}`,
      'B2_DIRECT_BRIDGE=NOT_USED',
      'B5_CURRENT_ATTENTION=NOT_USED',
      'MONTH_TIMING=NOT_USED',
      'MEDICAL_INTERPRETATION=NOT_USED'
    ]
  };
}
