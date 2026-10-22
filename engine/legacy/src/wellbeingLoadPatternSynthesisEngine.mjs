import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';
import {
  buildAbsoluteFiveElementState,
  buildYongXiJiWellbeingRoleProfile
} from './wellbeingDailyRhythmSynthesisEngine.mjs';

export const WELLBEING_LOAD_PATTERN_VERSION='GUANCHEN_WELLBEING_LOAD_PATTERN_PROTO_V1_STEP03_WB2_A1';

export const WELLBEING_LOAD_PATTERN_QUESTION=Object.freeze({
  questionId:'WELLBEING_LOAD_PATTERN',
  domain:'WELLBEING',
  userText:'我的日常负荷与平衡模式有什么特点？',
  intent:'ASSESS_NATAL_LOAD_PRESSURE_AND_BALANCE_PATTERN',
  classification:'NATAL',
  primaryTopic:'LoadAndRecoveryPattern',
  primarySemantics:Object.freeze(['Load','Pressure','Balance']),
  behaviorTarget:'LoadManagement',
  evidenceRecipeId:'RECIPE_WELLBEING_LOAD_PATTERN_V1',
  primaryAuthority:'B1_TYPED_WELLBEING',
  b2DirectBridgeAllowed:false,
  timingRequired:Object.freeze([]),
  monthTimingAdapterRequired:false,
  outputTemplate:'WELLBEING_LOAD_PATTERN_SYNTHESIS_V1'
});

export const WELLBEING_LOAD_PATTERN_STATES=Object.freeze([
  'LOAD_BALANCE_REVIEW',
  'BUFFER_BEFORE_ADDED_LOAD',
  'LOAD_CLUSTERING_REVIEW',
  'STEADY_LOAD_ANCHOR',
  'FLEXIBLE_LOAD_DISTRIBUTION'
]);

export const WELLBEING_LOAD_PATTERN_CONTEXTS=Object.freeze({
  CTX_NONE:{label:'不补充现实负荷情境'},
  CTX_REGULAR_SCHEDULE:{label:'目前日程相对规律'},
  CTX_IRREGULAR_SCHEDULE:{label:'目前日程经常变化'},
  CTX_HIGH_LOAD:{label:'目前现实任务负荷较高'},
  CTX_RECOVERY_OPPORTUNITY:{label:'目前有一定回稳与留白空间'},
  CTX_SHIFT_WORK:{label:'现实中有轮班或非固定时段安排'},
  CTX_TRAVEL:{label:'近期有旅行或跨地区移动安排'},
  CTX_CAREGIVING_OR_MAJOR_COMMITMENT:{label:'目前有照护责任或重大现实承诺'}
});

function normalizeContext(contextId='CTX_NONE'){
  const found=WELLBEING_LOAD_PATTERN_CONTEXTS[contextId];
  if(!found){
    const e=new Error(`Unknown WELLBEING_LOAD_PATTERN context: ${contextId}`);
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
    medicalClaim:false,organClaim:false,diseaseClaim:false,treatmentClaim:false,severityClaim:false
  };
}

function b1TypedWellbeingLoadEvidence(strength,absoluteState,roles){
  const evidence=[];

  evidence.push(finding({
    id:'WB_LOAD_B1_DAY_MASTER_BASELINE',sourceType:'DAY_MASTER',sourceKey:`${strength.dayMaster.stem}/${strength.dayMaster.element}`,
    semantic:'Load',tags:['NATAL_LOAD_BASELINE'],magnitude:'MODERATE',
    plainMeaning:'日主在本题只作为原局负荷观察的结构基点；它不表示体力、疲劳、压力疾病、器官状态或医学承受能力。',
    technicalBasis:[`DayMaster=${strength.dayMaster.stem}/${strength.dayMaster.element}`]
  }));

  const distributionTags=['ABSOLUTE_FIVE_ELEMENT_STATE'];
  let distributionMagnitude='MODERATE';
  if(absoluteState.concentrationBand==='CONCENTRATED'){
    distributionTags.push('LOAD_CONCENTRATION','BALANCE_REVIEW');
    distributionMagnitude='HIGH';
  } else if(absoluteState.concentrationBand==='CLEAR_LEAD'){
    distributionTags.push('STRUCTURAL_LEAD','LOAD_CLUSTERING_CANDIDATE');
  } else {
    distributionTags.push('DISTRIBUTED_LOAD_RANGE','BALANCE_RANGE');
  }
  evidence.push(finding({
    id:'WB_LOAD_B1_ABSOLUTE_ELEMENT_STATE',sourceType:'ABSOLUTE_FIVE_ELEMENT_STATE',sourceKey:absoluteState.concentrationBand,
    semantic:'Balance',tags:distributionTags,magnitude:distributionMagnitude,
    plainMeaning:'原局五行绝对分布在本题只用于观察事项与责任是否更需要分散、缓冲或保持弹性，不转换为健康严重度或身体负荷评分。',
    technicalBasis:[`Coverage=${absoluteState.coverageCount}`,`Concentration=${absoluteState.concentrationBand}`,`Leading=${absoluteState.leadingElement??'NONE'}`]
  }));

  if(!roles.yongPresent){
    evidence.push(finding({
      id:'WB_LOAD_B1_SUPPORTIVE_MARGIN_GAP',sourceType:'YONG_XI_JI_ROLE',sourceKey:'YONG_NOT_PRESENT_IN_ABSOLUTE_PROFILE',
      semantic:'Pressure',tags:['SUPPORTIVE_MARGIN_GAP','BUFFER_BEFORE_ADDED_LOAD'],magnitude:'HIGH',
      plainMeaning:'原局主要平衡方向没有形成明显结构占位时，本题更强调在新增责任前保留现实余量，避免把可调整空间持续压缩。',
      technicalBasis:[`Yong=${roles.yongElements.join('|')||'NONE'}`]
    }));
  } else {
    evidence.push(finding({
      id:'WB_LOAD_B1_SUPPORTIVE_DIRECTION_PRESENT',sourceType:'YONG_XI_JI_ROLE',sourceKey:roles.yongAnchor?'YONG_ANCHOR_PRESENT':'YONG_PRESENT',
      semantic:'Balance',tags:['SUPPORTIVE_DIRECTION_PRESENT',...(roles.yongAnchor?['LOAD_ANCHOR']:[])],magnitude:roles.yongAnchor?'HIGH':'MODERATE',
      plainMeaning:'原局主要平衡方向已有结构占位时，本题可把它理解为建立少数稳定责任锚点的条件，而不是健康能力或恢复能力证明。',
      technicalBasis:[`Yong=${roles.yongElements.join('|')||'NONE'}`,`YongAnchor=${roles.yongAnchor?'YES':'NO'}`]
    }));
  }

  if(roles.jiLeads){
    evidence.push(finding({
      id:'WB_LOAD_B1_EXCESS_DIRECTION_LEADS',sourceType:'YONG_XI_JI_ROLE',sourceKey:`JI_LEAD_${absoluteState.leadingElement}`,
      semantic:'Pressure',tags:['EXCESS_DIRECTION_LEADS','LOAD_STACKING_REVIEW','PRESSURE_ACCUMULATION_PATTERN'],magnitude:'HIGH',
      plainMeaning:'需要避免继续堆叠的方向同时处于原局分布领先位置时，本题更值得留意同类任务、责任或要求是否长期集中在同一区段。',
      technicalBasis:[`Ji=${roles.jiElements.join('|')||'NONE'}`,`Leading=${absoluteState.leadingElement}`]
    }));
  }

  if(absoluteState.concentrationBand==='DISTRIBUTED' && roles.yongPresent && !roles.jiLeads){
    evidence.push(finding({
      id:'WB_LOAD_B1_FLEXIBLE_DISTRIBUTION',sourceType:'B1_COMPOSITION',sourceKey:'DISTRIBUTED_WITH_SUPPORTIVE_DIRECTION',
      semantic:'Load',tags:['FLEXIBLE_LOAD_RANGE','DISTRIBUTED_LOAD_RANGE'],magnitude:'MODERATE',
      plainMeaning:'原局分布较分散且主要平衡方向可见时，本题更适合把负荷按现实优先级弹性分配，而不是固定成单一高密度模式。',
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
    id:'WB_LOAD_B3_RELATION_MODIFIER',role:'MODIFIER',bridge:'B3_EXACT_LINKED_RELATION',sourceType:'RELATION_TRANSFORMATION',sourceKey:key,
    semantic:'Load',tags:['MODIFIER_ONLY','LOAD_REVIEW_NUANCE'],magnitude:'MODERATE',
    plainMeaning:'原局存在明确关系牵动时，只补充“事项之间可能需要更常重新分配”的观察角度；它不能独立建立负荷 State，也不代表真实压力程度。',
    technicalBasis:states.slice(0,4).map(x=>`${x.position}=${x.state}`)
  })];
}

function b4PatternSupporting(pattern){
  const m=pattern.mechanisms??{};
  const total=(m.routes?.length??0)+(m.failure?.length??0)+(m.rescue?.length??0)+(m.review?.length??0);
  if(!total) return [];
  return [finding({
    id:'WB_LOAD_B4_PATTERN_SUPPORT',role:'SUPPORTING',bridge:'B4_SUPPORTING_ONLY',sourceType:'PATTERN_MECHANISM',sourceKey:'MECHANISMS_PRESENT',
    semantic:'Balance',tags:['SUPPORTING_ONLY','BALANCE_REVIEW_NUANCE'],magnitude:'MODERATE',
    plainMeaning:'结构机制只补充“哪些责任组合值得更常复盘”的说明，不拥有独立 State 决定权，也不能被解释成医学压力或健康风险。',
    technicalBasis:[`RouteCount=${m.routes?.length??0}`,`FailureCount=${m.failure?.length??0}`,`RescueCount=${m.rescue?.length??0}`,`ReviewCount=${m.review?.length??0}`]
  })];
}

function primaryLevel(evidence,tags){
  const xs=evidence.filter(x=>x.role==='PRIMARY' && x.bridge==='B1_TYPED_WELLBEING' && tags.some(t=>x.tags.includes(t)));
  if(xs.some(x=>x.magnitude==='HIGH') || xs.length>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveWellbeingLoadPatternState(evidence){
  const supportiveMarginGap=primaryLevel(evidence,['SUPPORTIVE_MARGIN_GAP']);
  const loadConcentration=primaryLevel(evidence,['LOAD_CONCENTRATION']);
  const loadStacking=primaryLevel(evidence,['LOAD_STACKING_REVIEW','PRESSURE_ACCUMULATION_PATTERN']);
  const loadAnchor=primaryLevel(evidence,['LOAD_ANCHOR']);
  const flexibleRange=primaryLevel(evidence,['FLEXIBLE_LOAD_RANGE','DISTRIBUTED_LOAD_RANGE']);

  let state='FLEXIBLE_LOAD_DISTRIBUTION';
  if(supportiveMarginGap==='STRONG' && loadConcentration==='STRONG') state='LOAD_BALANCE_REVIEW';
  else if(supportiveMarginGap==='STRONG') state='BUFFER_BEFORE_ADDED_LOAD';
  else if(loadStacking==='STRONG') state='LOAD_CLUSTERING_REVIEW';
  else if(loadAnchor==='STRONG') state='STEADY_LOAD_ANCHOR';

  return {
    state,
    dimensions:{supportiveMarginGap,loadConcentration,loadStacking,loadAnchor,flexibleRange},
    stateDrivenByRoles:['PRIMARY'],
    primaryBridge:'B1_TYPED_WELLBEING',
    b2DirectBridgeUsed:false,
    b3CanOwnState:false,
    b4CanOwnState:false,
    b5Used:false,
    careerOrWealthStateUsed:false,
    wellbeingDailyRhythmStateUsed:false,
    medicalEvidenceUsed:false,
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

const COPY=Object.freeze({
  LOAD_BALANCE_REVIEW:{
    direct:'你的日常负荷模式更适合先检查“是否过度集中”，再决定要不要继续增加事项；分配方式比单纯增加承载更重要。',
    current:'当原局主要平衡方向缺少结构占位，同时五行分布又明显集中时，本题更强调重新分配责任与可调整空间。',
    action:'先把固定责任、可移动事项与可取消事项分开，再减少同一阶段同时推进的重点数量；每次只调整一类负荷来源。',
    caution:'这里的“负荷集中”只描述日程与责任分配，不代表压力疾病、疲劳诊断、身体承受能力或健康严重度。'
  },
  BUFFER_BEFORE_ADDED_LOAD:{
    direct:'你的日常负荷模式更适合“先留余量，再接新增责任”，不要把每个可用区间都预先占满。',
    current:'当主要平衡方向在原局中缺少明显结构占位时，本题更重视负荷之间的缓冲，而不是连续追加事项。',
    action:'新增承诺前先确认已有固定责任和可移动空间；若必须增加事项，优先同步减少或延后另一项，而不是只做叠加。',
    caution:'这里的“余量”是现实安排余量，不是体能、心理耐受度或医学恢复能力的判断。'
  },
  LOAD_CLUSTERING_REVIEW:{
    direct:'你的日常负荷模式更值得留意“同类事项是否持续堆在一起”；重点不是做得少，而是避免长期只有单一方向在累积。',
    current:'当需要避免继续堆叠的方向同时处于原局分布领先位置时，本题更强调把相近责任分散到不同区段，并穿插不同性质的事项。',
    action:'检查一周或一个工作周期里是否连续堆叠相同类型的高要求事项；能拆开的拆开，能错开的错开，并保留明确的转换区。',
    caution:'“堆叠”只指任务与责任组合，不等于真实焦虑、疲劳、器官压力或任何医学风险。'
  },
  STEADY_LOAD_ANCHOR:{
    direct:'你的日常负荷模式更适合围绕少数稳定责任锚点来安排，其余事项再按现实变化增减。',
    current:'当主要平衡方向在原局已有较明显结构占位时，本题更容易形成可重复的负荷框架，不必每天重新决定所有优先级。',
    action:'先固定两三个长期最重要的责任区块，再给临时事项设上限与替换规则；稳定来自边界清楚，而不是把时间全部锁死。',
    caution:'稳定责任锚点不代表身体能力更强，也不能用于推断压力耐受度、健康结果或恢复速度。'
  },
  FLEXIBLE_LOAD_DISTRIBUTION:{
    direct:'你的日常负荷模式更适合按现实优先级做弹性分配，用少数规则维持平衡，而不是长期采用单一高密度配置。',
    current:'当原局没有形成需要更强负荷优先级的组合时，本题更适合保留调整空间，让责任随现实变化重新排序。',
    action:'保留少数不可让步的优先事项，其余任务按截止时间、现实责任和可用空间排序；变化时先重排，而不是默认继续叠加。',
    caution:'弹性分配只属于日常管理框架；真实症状、诊断或持续不适不能被命盘转换成负荷证据。'
  }
});

function contextAction(contextId){
  const map={
    CTX_NONE:null,
    CTX_REGULAR_SCHEDULE:'如果目前日程规律，可直接观察哪些责任已经形成稳定框架，避免为了命盘刻意增加或删除现实中运作良好的安排。',
    CTX_IRREGULAR_SCHEDULE:'如果日程经常变化，优先管理“同时进行多少件事”和“哪些责任不可移动”，而不是要求每天保持相同总量。',
    CTX_HIGH_LOAD:'如果现实任务负荷已经较高，先处理现实优先级、截止时间和可取消事项；“高负荷”是用户提供的现实信息，不会反向改变命理 State。',
    CTX_RECOVERY_OPPORTUNITY:'如果目前有较多留白空间，可用来测试怎样的责任分配最容易持续，而不是因为出现空档就自动增加新承诺。',
    CTX_SHIFT_WORK:'如果有轮班或非固定时段，按真实班表与责任边界分配事项；本题不从八字推断身体承受能力或医学作息需求。',
    CTX_TRAVEL:'如果近期旅行或跨地区移动较多，先把交通与不可移动承诺视为现实固定项，再重新排序其他责任；旅行本身不是命理 evidence。',
    CTX_CAREGIVING_OR_MAJOR_COMMITMENT:'如果有照护责任或重大承诺，先承认这些现实固定负荷，再为可移动事项设置更清楚的上限；现实责任只改变执行 framing。'
  };
  return map[contextId]??null;
}

export function renderWellbeingLoadPatternAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!WELLBEING_LOAD_PATTERN_STATES.includes(state)) throw new Error(`Unknown WELLBEING_LOAD_PATTERN state: ${state}`);
  normalizeContext(contextId);
  const copy=COPY[state];
  const modifiers=evidence.filter(x=>x.role!=='PRIMARY').map(x=>x.plainMeaning).slice(0,2);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    actions:[contextAction(contextId),copy.action,'以现实责任与可执行性为准：命盘只提供负荷分配的观察框架，不能替代真实健康信息、专业评估或你对现实承诺的判断。'].filter(Boolean).slice(0,3),
    caution:copy.caution,
    why:evidence.filter(x=>x.role==='PRIMARY').slice(0,5).map(x=>x.plainMeaning),
    modifiers,
    deepAwareness:'这道题只回答“日常事项、责任与可调整空间如何形成负荷与平衡模式”，不回答疾病、疲劳诊断、器官状态、治疗、药物、寿命、事故风险、严重度或医学概率。',
    medicalBoundary:'若现实中存在症状、诊断、持续不适或其他健康问题，这些信息不会被转换成八字 evidence；实际健康评估必须留在命理系统之外。',
    numericScoreUsed:false,
    percentConfidenceUsed:false,
    medicalAdviceUsed:false
  };
}

export function buildWellbeingLoadPatternSynthesis({chart,contextId='CTX_NONE',reportedSymptoms=null,diagnosisContext=null}={}){
  if(!chart) throw new Error('chart is required');
  const context=normalizeContext(contextId);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const absoluteElementState=buildAbsoluteFiveElementState(strength);
  const yongXiJiRoles=buildYongXiJiWellbeingRoleProfile(strength,absoluteElementState);
  const primary=b1TypedWellbeingLoadEvidence(strength,absoluteElementState,yongXiJiRoles);
  const modifiers=b3RelationModifier(strength);
  const supporting=b4PatternSupporting(pattern);
  const evidence=[...primary,...modifiers,...supporting];
  const resolution=resolveWellbeingLoadPatternState(evidence);
  const answer=renderWellbeingLoadPatternAnswer(resolution.state,contextId,evidence);
  return {
    version:WELLBEING_LOAD_PATTERN_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:WELLBEING_LOAD_PATTERN_QUESTION,
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
      fatigueDiagnosisUsed:false,
      stressDisorderDiagnosisUsed:false,
      treatmentRecommendationUsed:false,
      medicationRecommendationUsed:false,
      lifespanOrPrognosisUsed:false,
      accidentRiskUsed:false,
      severityScoreUsed:false,
      medicalProbabilityUsed:false,
      careerOrWealthStateUsed:false,
      wellbeingDailyRhythmStateUsed:false
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
      'MEDICAL_INTERPRETATION=NOT_USED'
    ]
  };
}
