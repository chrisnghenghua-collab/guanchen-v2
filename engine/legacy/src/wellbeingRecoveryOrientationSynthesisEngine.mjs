import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';
import {
  buildAbsoluteFiveElementState,
  buildYongXiJiWellbeingRoleProfile
} from './wellbeingDailyRhythmSynthesisEngine.mjs';

export const WELLBEING_RECOVERY_ORIENTATION_VERSION='GUANCHEN_WELLBEING_RECOVERY_ORIENTATION_PROTO_V1_STEP03_WB3_A1';

export const WELLBEING_RECOVERY_ORIENTATION_QUESTION=Object.freeze({
  questionId:'WELLBEING_RECOVERY_ORIENTATION',
  domain:'WELLBEING',
  userText:'我更适合怎样恢复、回稳与调整节奏？',
  intent:'ASSESS_NATAL_RECOVERY_ORIENTATION_RHYTHM_AND_BALANCE',
  classification:'NATAL',
  primaryTopic:'LoadAndRecoveryPattern',
  primarySemantics:Object.freeze(['RecoveryOrientation','Rhythm','Balance']),
  behaviorTarget:'RecoveryPractice',
  evidenceRecipeId:'RECIPE_WELLBEING_RECOVERY_ORIENTATION_V1',
  primaryAuthority:'B1_TYPED_WELLBEING',
  b2DirectBridgeAllowed:false,
  timingRequired:Object.freeze([]),
  monthTimingAdapterRequired:false,
  outputTemplate:'WELLBEING_RECOVERY_ORIENTATION_SYNTHESIS_V1'
});

export const WELLBEING_RECOVERY_ORIENTATION_STATES=Object.freeze([
  'RECOVERY_REBALANCE_REVIEW',
  'RECOVERY_MARGIN_FIRST',
  'RECOVERY_MODE_SHIFT_FIRST',
  'STEADY_RECOVERY_ANCHOR',
  'FLEXIBLE_RECOVERY_MIX'
]);

export const WELLBEING_RECOVERY_ORIENTATION_CONTEXTS=Object.freeze({
  CTX_NONE:{label:'不补充现实恢复情境'},
  CTX_REGULAR_SCHEDULE:{label:'目前日程相对规律'},
  CTX_IRREGULAR_SCHEDULE:{label:'目前日程经常变化'},
  CTX_HIGH_LOAD:{label:'目前现实任务负荷较高'},
  CTX_RECOVERY_OPPORTUNITY:{label:'目前有一定回稳与留白空间'},
  CTX_SHIFT_WORK:{label:'现实中有轮班或非固定时段安排'},
  CTX_TRAVEL:{label:'近期有旅行或跨地区移动安排'},
  CTX_CAREGIVING_OR_MAJOR_COMMITMENT:{label:'目前有照护责任或重大现实承诺'}
});

function normalizeContext(contextId='CTX_NONE'){
  const found=WELLBEING_RECOVERY_ORIENTATION_CONTEXTS[contextId];
  if(!found){
    const e=new Error(`Unknown WELLBEING_RECOVERY_ORIENTATION context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:found.label,rewritesEvidence:false,rewritesState:false};
}

function unique(xs){ return [...new Set(xs)]; }

function finding({id,role='PRIMARY',bridge='B1_TYPED_WELLBEING',sourceType,sourceKey,semantic,tags=[],magnitude='MODERATE',plainMeaning,technicalBasis=[]}){
  return {
    id,role,bridge,domain:'WELLBEING',topic:'LoadAndRecoveryPattern',sourceType,sourceKey,semantic,
    tags:unique(tags),magnitude,timingScope:'NATAL',certainty:'CONFIRMED',plainMeaning,technicalBasis,
    medicalClaim:false,organClaim:false,diseaseClaim:false,treatmentClaim:false,rehabilitationClaim:false,severityClaim:false
  };
}

function b1TypedWellbeingRecoveryEvidence(strength,absoluteState,roles){
  const evidence=[];

  evidence.push(finding({
    id:'WB_RECOVERY_B1_DAY_MASTER_BASELINE',sourceType:'DAY_MASTER',sourceKey:`${strength.dayMaster.stem}/${strength.dayMaster.element}`,
    semantic:'RecoveryOrientation',tags:['NATAL_RECOVERY_BASELINE'],magnitude:'MODERATE',
    plainMeaning:'日主在本题只作为日常回稳方式的原局观察基点；这里的“恢复”不等于医学康复、身体修复速度、疲劳程度或治疗需求。',
    technicalBasis:[`DayMaster=${strength.dayMaster.stem}/${strength.dayMaster.element}`]
  }));

  const distributionTags=['ABSOLUTE_FIVE_ELEMENT_STATE'];
  let distributionMagnitude='MODERATE';
  if(absoluteState.concentrationBand==='CONCENTRATED'){
    distributionTags.push('RECOVERY_STRUCTURE_CONCENTRATED','RECOVERY_REBALANCE_REVIEW');
    distributionMagnitude='HIGH';
  } else if(absoluteState.concentrationBand==='CLEAR_LEAD'){
    distributionTags.push('RECOVERY_STRUCTURE_LEAD','RECOVERY_MODE_VARIATION_CANDIDATE');
  } else {
    distributionTags.push('DISTRIBUTED_RECOVERY_RANGE','FLEXIBLE_RECOVERY_RANGE');
  }
  evidence.push(finding({
    id:'WB_RECOVERY_B1_ABSOLUTE_ELEMENT_STATE',sourceType:'ABSOLUTE_FIVE_ELEMENT_STATE',sourceKey:absoluteState.concentrationBand,
    semantic:'Balance',tags:distributionTags,magnitude:distributionMagnitude,
    plainMeaning:'原局五行绝对分布在本题只用于观察回稳策略是否更需要留白、切换或弹性组合，不转换成身体恢复力、健康严重度或医学评分。',
    technicalBasis:[`Coverage=${absoluteState.coverageCount}`,`Concentration=${absoluteState.concentrationBand}`,`Leading=${absoluteState.leadingElement??'NONE'}`]
  }));

  if(!roles.yongPresent){
    evidence.push(finding({
      id:'WB_RECOVERY_B1_SUPPORTIVE_MARGIN_GAP',sourceType:'YONG_XI_JI_ROLE',sourceKey:'YONG_NOT_PRESENT_IN_ABSOLUTE_PROFILE',
      semantic:'RecoveryOrientation',tags:['SUPPORTIVE_RECOVERY_MARGIN_GAP','RECOVERY_MARGIN_NEEDED'],magnitude:'HIGH',
      plainMeaning:'原局主要平衡方向没有形成明显结构占位时，本题更强调先预留真正可回稳的空间，再安排下一轮事项，而不是把所有空档立即重新填满。',
      technicalBasis:[`Yong=${roles.yongElements.join('|')||'NONE'}`]
    }));
  } else {
    evidence.push(finding({
      id:'WB_RECOVERY_B1_SUPPORTIVE_DIRECTION_PRESENT',sourceType:'YONG_XI_JI_ROLE',sourceKey:roles.yongAnchor?'YONG_ANCHOR_PRESENT':'YONG_PRESENT',
      semantic:'Rhythm',tags:['SUPPORTIVE_DIRECTION_PRESENT',...(roles.yongAnchor?['RECOVERY_ANCHOR']:[])],magnitude:roles.yongAnchor?'HIGH':'MODERATE',
      plainMeaning:'原局主要平衡方向已有结构占位时，本题可把它理解为建立可重复回稳习惯的条件；这不代表医学恢复能力、康复速度或健康保证。',
      technicalBasis:[`Yong=${roles.yongElements.join('|')||'NONE'}`,`YongAnchor=${roles.yongAnchor?'YES':'NO'}`]
    }));
  }

  if(roles.jiLeads){
    evidence.push(finding({
      id:'WB_RECOVERY_B1_EXCESS_DIRECTION_LEADS',sourceType:'YONG_XI_JI_ROLE',sourceKey:`JI_LEAD_${absoluteState.leadingElement}`,
      semantic:'RecoveryOrientation',tags:['EXCESS_DIRECTION_LEADS','RECOVERY_MODE_SHIFT','SAME_MODE_CONTINUATION_REVIEW'],magnitude:'HIGH',
      plainMeaning:'需要避免继续堆叠的方向同时处于原局分布领先位置时，本题更强调“换一种方式回稳”：从同类高密度活动切换到不同性质、不同强度或更有留白的安排。',
      technicalBasis:[`Ji=${roles.jiElements.join('|')||'NONE'}`,`Leading=${absoluteState.leadingElement}`]
    }));
  }

  if(absoluteState.concentrationBand==='DISTRIBUTED' && roles.yongPresent && !roles.jiLeads){
    evidence.push(finding({
      id:'WB_RECOVERY_B1_FLEXIBLE_MIX',sourceType:'B1_COMPOSITION',sourceKey:'DISTRIBUTED_WITH_SUPPORTIVE_DIRECTION',
      semantic:'RecoveryOrientation',tags:['FLEXIBLE_RECOVERY_RANGE','RECOVERY_MIX_ALLOWED'],magnitude:'MODERATE',
      plainMeaning:'原局分布较分散且主要平衡方向可见时，本题更适合保留多种回稳方式，按现实状态切换，而不是强迫自己只使用单一固定模式。',
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
    id:'WB_RECOVERY_B3_RELATION_MODIFIER',role:'MODIFIER',bridge:'B3_EXACT_LINKED_RELATION',sourceType:'RELATION_TRANSFORMATION',sourceKey:key,
    semantic:'Rhythm',tags:['MODIFIER_ONLY','RECOVERY_TRANSITION_NUANCE'],magnitude:'MODERATE',
    plainMeaning:'原局存在明确关系牵动时，只补充“回稳过程中可能更需要安排转换区”的观察角度；它不能独立建立 Recovery State，也不代表身体或心理恢复困难。',
    technicalBasis:states.slice(0,4).map(x=>`${x.position}=${x.state}`)
  })];
}

function b4PatternSupporting(pattern){
  const m=pattern.mechanisms??{};
  const total=(m.routes?.length??0)+(m.failure?.length??0)+(m.rescue?.length??0)+(m.review?.length??0);
  if(!total) return [];
  return [finding({
    id:'WB_RECOVERY_B4_PATTERN_SUPPORT',role:'SUPPORTING',bridge:'B4_SUPPORTING_ONLY',sourceType:'PATTERN_MECHANISM',sourceKey:'MECHANISMS_PRESENT',
    semantic:'Balance',tags:['SUPPORTING_ONLY','RECOVERY_REVIEW_NUANCE'],magnitude:'MODERATE',
    plainMeaning:'结构机制只补充“哪些回稳方式值得更常复盘”的说明，不拥有独立 State 决定权，也不能转成康复、治疗或健康风险判断。',
    technicalBasis:[`RouteCount=${m.routes?.length??0}`,`FailureCount=${m.failure?.length??0}`,`RescueCount=${m.rescue?.length??0}`,`ReviewCount=${m.review?.length??0}`]
  })];
}

function primaryLevel(evidence,tags){
  const xs=evidence.filter(x=>x.role==='PRIMARY' && x.bridge==='B1_TYPED_WELLBEING' && tags.some(t=>x.tags.includes(t)));
  if(xs.some(x=>x.magnitude==='HIGH') || xs.length>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveWellbeingRecoveryOrientationState(evidence){
  const supportiveMarginGap=primaryLevel(evidence,['SUPPORTIVE_RECOVERY_MARGIN_GAP']);
  const recoveryConcentration=primaryLevel(evidence,['RECOVERY_STRUCTURE_CONCENTRATED']);
  const modeShift=primaryLevel(evidence,['RECOVERY_MODE_SHIFT','SAME_MODE_CONTINUATION_REVIEW']);
  const recoveryAnchor=primaryLevel(evidence,['RECOVERY_ANCHOR']);
  const flexibleRecovery=primaryLevel(evidence,['FLEXIBLE_RECOVERY_RANGE','RECOVERY_MIX_ALLOWED']);

  let state='FLEXIBLE_RECOVERY_MIX';
  if(supportiveMarginGap==='STRONG' && recoveryConcentration==='STRONG') state='RECOVERY_REBALANCE_REVIEW';
  else if(supportiveMarginGap==='STRONG') state='RECOVERY_MARGIN_FIRST';
  else if(modeShift==='STRONG') state='RECOVERY_MODE_SHIFT_FIRST';
  else if(recoveryAnchor==='STRONG') state='STEADY_RECOVERY_ANCHOR';

  return {
    state,
    dimensions:{supportiveMarginGap,recoveryConcentration,modeShift,recoveryAnchor,flexibleRecovery},
    stateDrivenByRoles:['PRIMARY'],
    primaryBridge:'B1_TYPED_WELLBEING',
    b2DirectBridgeUsed:false,
    b3CanOwnState:false,
    b4CanOwnState:false,
    b5Used:false,
    careerOrWealthStateUsed:false,
    wellbeingDailyRhythmStateUsed:false,
    wellbeingLoadPatternStateUsed:false,
    medicalEvidenceUsed:false,
    medicalRecoveryInferenceUsed:false,
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

const COPY=Object.freeze({
  RECOVERY_REBALANCE_REVIEW:{
    direct:'你的回稳方式更适合先检查“恢复空间是否过度集中或过少”，再决定具体怎么休整；先重建可切换的空间，比寻找单一固定方法更重要。',
    current:'当原局主要平衡方向缺少结构占位，同时分布又明显集中时，本题更强调把回稳安排拆开、留出转换区，并减少长期只用同一种方式硬撑到结束。',
    action:'先区分真正能让节奏降下来、只是换一种忙法、以及必须完成的现实事项；优先给前一类保留独立空间，再减少连续高密度区段。',
    caution:'这里的“恢复/回稳”只指日常节奏与活动安排，不代表医学康复、体能恢复速度、疲劳严重度或治疗需要。'
  },
  RECOVERY_MARGIN_FIRST:{
    direct:'你的回稳方式更适合“先留恢复余量，再继续安排下一轮事项”；空档本身要被保留下来，而不是默认重新塞满。',
    current:'当主要平衡方向在原局中缺少明显结构占位时，本题更强调把可回稳空间当作正式安排，而不是等所有事情结束后才看有没有剩余时间。',
    action:'为一个工作周期预留明确的低密度区间，并在新增承诺前先检查它是否会吃掉这块余量；必要时用延后、减少或替换来保持空间。',
    caution:'“恢复余量”是现实时间与注意力余量，不代表身体修复能力、心理韧性或医学恢复需求。'
  },
  RECOVERY_MODE_SHIFT_FIRST:{
    direct:'你的回稳方式更适合“换模式”而不是继续同一种高密度方式：通过活动性质、强度或注意力方向的切换，让节奏真正从原来的轨道退出。',
    current:'当需要避免继续堆叠的方向同时处于原局领先位置时，本题更强调不同性质之间的转换；单纯把同类事项做得更慢，不一定等于真正回稳。',
    action:'连续处理同类高要求事项后，优先切换到性质明显不同、边界清楚、可结束的活动或留白；避免把“休息”安排成另一套同类任务。',
    caution:'“换模式”只是一种日常回稳策略，不表示神经系统、心理状态、器官功能或医学疲劳发生了什么。'
  },
  STEADY_RECOVERY_ANCHOR:{
    direct:'你的回稳方式更适合建立少数稳定、可重复的恢复锚点，让回稳不完全依赖“等有空再说”。',
    current:'当主要平衡方向在原局已有较明显结构占位时，本题更容易形成固定的回稳入口；关键是可持续与可重复，而不是复杂或高强度。',
    action:'保留一两个现实中最容易重复的回稳节点，例如固定的结束仪式、低密度时段或明确的工作—非工作切换规则，再让其他方式保持弹性。',
    caution:'稳定回稳锚点不代表医学效果、康复速度或健康改善保证，也不能替代真实症状与专业评估。'
  },
  FLEXIBLE_RECOVERY_MIX:{
    direct:'你的回稳方式更适合保留多种选择，根据现实负荷、时间和环境切换，而不是要求自己只有一种“正确恢复法”。',
    current:'当原局没有形成更强的单一恢复优先级时，本题更适合用少数原则管理回稳，再根据现实变化组合不同方式。',
    action:'准备两三种成本不同的回稳选项：短时留白、活动切换、较完整的低密度区段；按现实可用空间选择，而不是因为一次做不到完整安排就全部放弃。',
    caution:'弹性恢复组合只是生活安排框架；真实症状、诊断、持续不适或康复问题不能从命盘推断。'
  }
});

function contextAction(contextId){
  const map={
    CTX_NONE:null,
    CTX_REGULAR_SCHEDULE:'如果目前日程规律，可把回稳节点直接嵌入固定结构中；不需要为了命盘打乱现实中已经稳定有效的安排。',
    CTX_IRREGULAR_SCHEDULE:'如果日程经常变化，比固定钟点更重要的是保留“结束—切换—再开始”的规则，让回稳方式随现实移动。',
    CTX_HIGH_LOAD:'如果现实任务负荷已经很高，先处理真实优先级、可取消事项与最低必要责任；命盘不会把高负荷解释成身体或心理异常。',
    CTX_RECOVERY_OPPORTUNITY:'如果目前已有留白空间，可观察哪种安排最容易让节奏真正降下来并重新进入下一阶段，而不是自动把空档转换成更多任务。',
    CTX_SHIFT_WORK:'如果有轮班或非固定时段，回稳锚点应跟随真实班表与结束节点，而不是套用固定医学作息或“某时辰必须休息”的规则。',
    CTX_TRAVEL:'如果近期旅行或跨地区移动较多，可把交通结束、入住、工作结束等现实节点作为切换点；旅行本身不会成为命理 evidence。',
    CTX_CAREGIVING_OR_MAJOR_COMMITMENT:'如果有照护责任或重大承诺，先承认这些不可移动条件，再寻找可以被保护的小块回稳空间；现实责任只改变执行 framing。'
  };
  return map[contextId]??null;
}

export function renderWellbeingRecoveryOrientationAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!WELLBEING_RECOVERY_ORIENTATION_STATES.includes(state)) throw new Error(`Unknown WELLBEING_RECOVERY_ORIENTATION state: ${state}`);
  normalizeContext(contextId);
  const copy=COPY[state];
  const modifiers=evidence.filter(x=>x.role!=='PRIMARY').map(x=>x.plainMeaning).slice(0,2);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    actions:[contextAction(contextId),copy.action,'以现实状态与可执行性为准：这里的“恢复/回稳”只属于生活节奏与行为安排，不能替代真实健康信息、康复计划或专业医疗判断。'].filter(Boolean).slice(0,3),
    caution:copy.caution,
    why:evidence.filter(x=>x.role==='PRIMARY').slice(0,5).map(x=>x.plainMeaning),
    modifiers,
    deepAwareness:'这道题只回答“日常怎样从原有节奏退出、回稳并重新进入下一阶段”，不回答疾病、器官状态、疲劳诊断、医学康复、治疗、药物、寿命、事故风险、严重度或医学概率。',
    medicalBoundary:'若现实中存在症状、诊断、受伤、术后康复、持续不适或其他健康问题，这些信息不会被转换成八字 evidence；实际医疗与康复评估必须留在命理系统之外。',
    numericScoreUsed:false,
    percentConfidenceUsed:false,
    medicalAdviceUsed:false,
    rehabilitationAdviceUsed:false
  };
}

export function buildWellbeingRecoveryOrientationSynthesis({chart,contextId='CTX_NONE',reportedSymptoms=null,diagnosisContext=null,rehabilitationContext=null}={}){
  if(!chart) throw new Error('chart is required');
  const context=normalizeContext(contextId);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const absoluteElementState=buildAbsoluteFiveElementState(strength);
  const yongXiJiRoles=buildYongXiJiWellbeingRoleProfile(strength,absoluteElementState);
  const primary=b1TypedWellbeingRecoveryEvidence(strength,absoluteElementState,yongXiJiRoles);
  const modifiers=b3RelationModifier(strength);
  const supporting=b4PatternSupporting(pattern);
  const evidence=[...primary,...modifiers,...supporting];
  const resolution=resolveWellbeingRecoveryOrientationState(evidence);
  const answer=renderWellbeingRecoveryOrientationAnswer(resolution.state,contextId,evidence);
  return {
    version:WELLBEING_RECOVERY_ORIENTATION_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:WELLBEING_RECOVERY_ORIENTATION_QUESTION,
    context,
    userHealthContext:{
      symptomContextProvided:Boolean(reportedSymptoms),
      diagnosisContextProvided:Boolean(diagnosisContext),
      rehabilitationContextProvided:Boolean(rehabilitationContext),
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
      medicalRecoveryInferenceUsed:false,
      organDiagnosisUsed:false,
      symptomDiagnosisUsed:false,
      fatigueDiagnosisUsed:false,
      treatmentRecommendationUsed:false,
      rehabilitationRecommendationUsed:false,
      medicationRecommendationUsed:false,
      lifespanOrPrognosisUsed:false,
      accidentRiskUsed:false,
      severityScoreUsed:false,
      medicalProbabilityUsed:false,
      careerOrWealthStateUsed:false,
      wellbeingDailyRhythmStateUsed:false,
      wellbeingLoadPatternStateUsed:false
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
      'WB1_STATE_AS_EVIDENCE=NOT_USED',
      'WB2_STATE_AS_EVIDENCE=NOT_USED',
      'MEDICAL_RECOVERY_INFERENCE=NOT_USED'
    ]
  };
}
