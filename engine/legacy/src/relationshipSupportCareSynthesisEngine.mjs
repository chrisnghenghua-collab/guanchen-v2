import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';

export const RELATIONSHIP_SUPPORT_CARE_VERSION='GUANCHENG_RELATIONSHIP_SUPPORT_CARE_PROTO_V1_STEP03_REL3_A1';

export const RELATIONSHIP_SUPPORT_CARE_QUESTION=Object.freeze({
  questionId:'RELATIONSHIP_SUPPORT_CARE',
  domain:'RELATIONSHIP',
  userText:'我在关系中更习惯怎样付出、照料与接受支持？',
  intent:'ASSESS_NATAL_RELATIONSHIP_SUPPORT_CARE_GIVING_RECEIVING_PATTERN',
  classification:'NATAL',
  primaryTopics:Object.freeze(['RelationshipNeedsAndBoundaries','RelationshipInteractionPattern']),
  primarySemantics:Object.freeze([
    'SupportReceptionInteraction',
    'PracticalInvestmentCareInteraction',
    'ResponsibilityBoundaryRuleInteraction'
  ]),
  behaviorTarget:'SupportAndResponse',
  evidenceRecipeId:'RECIPE_RELATIONSHIP_SUPPORT_CARE_V1',
  spouseStarV1Policy:'EXCLUDED',
  timingRequired:[],
  monthTimingAdapterRequired:false,
  publicMeaningOfPracticalInvestment:'practical effort/care/commitment; never financial investment',
  outputTemplate:'RELATIONSHIP_SUPPORT_CARE_SYNTHESIS_V1'
});

export const RELATIONSHIP_SUPPORT_CARE_STATES=Object.freeze([
  'CARE_LOAD_REBALANCE_FIRST',
  'PRACTICAL_CARE_THROUGH_ACTION',
  'SUPPORT_RECEPTION_FIRST',
  'RESPONSIBILITY_BASED_CARE',
  'RECIPROCAL_FLEXIBLE_SUPPORT'
]);

export const RELATIONSHIP_SUPPORT_CARE_CONTEXTS=Object.freeze({
  CTX_NONE:{label:'不补充现实关系情境'},
  CTX_SINGLE:{label:'目前没有固定伴侣／关系对象'},
  CTX_PARTNERED:{label:'目前处于固定关系中'},
  CTX_FAMILY_OR_CLOSE_RELATION:{label:'主要想理解家人或长期亲近关系'},
  CTX_GIVING_CONCERN:{label:'现实中较在意自己是否承担或付出过多'},
  CTX_RECEIVING_CONCERN:{label:'现实中较在意自己是否能接受帮助与照料'},
  CTX_RESPONSIBILITY_CONCERN:{label:'现实中较在意照料责任与分工'},
  CTX_CARE_LOAD_TENSION:{label:'现实中正在处理照料负荷或支持失衡'}
});

const STRONG_BANDS=new Set(['BALANCED_STRONG','STRONG','VERY_STRONG']);
const WEAK_BANDS=new Set(['VERY_WEAK','WEAK','BALANCED_WEAK']);
const PRACTICAL_STRUCTURES=new Set(['DIRECT_WEALTH','INDIRECT_WEALTH','EATING_GOD','HURTING_OFFICER']);
const RECEPTION_STRUCTURES=new Set(['DIRECT_RESOURCE','INDIRECT_RESOURCE']);
const RESPONSIBILITY_STRUCTURES=new Set(['DIRECT_OFFICER','SEVEN_KILLINGS']);
const RECIPROCAL_STRUCTURES=new Set(['JIAN_LU','YUE_JIE','YANG_REN']);
const COMPLEX_STAGES=new Set(['BROKEN','REVIEW','FORMED_WITH_FLAW']);

function normalizeContext(contextId='CTX_NONE'){
  const found=RELATIONSHIP_SUPPORT_CARE_CONTEXTS[contextId];
  if(!found){
    const e=new Error(`Unknown RELATIONSHIP_SUPPORT_CARE context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:found.label,rewritesEvidence:false,rewritesState:false};
}

function finding({id,role='PRIMARY',bridge='B2_TYPED_RELATIONSHIP',sourceType,sourceKey,semantic,tags=[],magnitude='MODERATE',plainMeaning,technicalBasis=[]}){
  return {
    id,role,bridge,domain:'RELATIONSHIP',topic:'RelationshipSupportAndCare',
    sourceType,sourceKey,semantic,tags:[...new Set(tags)],magnitude,
    timingScope:'NATAL',certainty:'CONFIRMED',plainMeaning,technicalBasis,
    spouseStarEvidence:false,genderDependent:false,relationshipPreferenceDependent:false,
    financialInvestmentMeaning:false
  };
}

function b1b2Evidence(strength,pattern){
  const structureKey=pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE';
  const stage=pattern.stage ?? 'UNKNOWN';
  const evidence=[];

  let strengthSemantic='PracticalInvestmentCareInteraction';
  let strengthMagnitude='MODERATE';
  const strengthTags=['SUPPORT_CARE_BASELINE'];
  if(STRONG_BANDS.has(strength.strengthBand)){
    strengthTags.push('SELF_INITIATED_CARE','PRACTICAL_GIVING','CARE_THROUGH_ACTION');
    strengthMagnitude=new Set(['STRONG','VERY_STRONG']).has(strength.strengthBand)?'HIGH':'MODERATE';
  } else if(WEAK_BANDS.has(strength.strengthBand)){
    strengthSemantic='SupportReceptionInteraction';
    strengthTags.push('SUPPORT_RECEPTION','RECEIVE_HELP','ALLOW_CARE_IN');
    strengthMagnitude=new Set(['VERY_WEAK','WEAK']).has(strength.strengthBand)?'HIGH':'MODERATE';
  } else {
    strengthSemantic='SupportReceptionInteraction';
    strengthTags.push('RECIPROCAL_SUPPORT','GIVE_RECEIVE_BALANCE');
  }
  evidence.push(finding({
    id:'REL_SUPPORT_CARE_B2_STRENGTH_BRIDGE',sourceType:'STRENGTH',sourceKey:strength.strengthBand,
    semantic:strengthSemantic,tags:strengthTags,magnitude:strengthMagnitude,
    plainMeaning:'日主强弱在本题只用于理解较自然的付出、接受支持与互惠节奏；不代表谁比较爱、谁应该牺牲，也不决定关系结果。',
    technicalBasis:[`StrengthBand=${strength.strengthBand}`]
  }));

  let structureSemantic='SupportReceptionInteraction';
  let structureMagnitude='MODERATE';
  const structureTags=['RELATIONSHIP_SUPPORT_CARE_BASELINE'];
  if(PRACTICAL_STRUCTURES.has(structureKey)){
    structureSemantic='PracticalInvestmentCareInteraction';
    structureTags.push('PRACTICAL_CARE','CONCRETE_EFFORT','CARE_COMMITMENT');
    structureMagnitude='HIGH';
  } else if(RECEPTION_STRUCTURES.has(structureKey)){
    structureSemantic='SupportReceptionInteraction';
    structureTags.push('SUPPORT_RECEPTION','EMOTIONAL_HOLDING','RECEIVE_HELP');
    structureMagnitude='HIGH';
  } else if(RESPONSIBILITY_STRUCTURES.has(structureKey)){
    structureSemantic='ResponsibilityBoundaryRuleInteraction';
    structureTags.push('RESPONSIBILITY_CARE','RELIABLE_FOLLOW_THROUGH','ROLE_COMMITMENT');
    structureMagnitude='HIGH';
  } else if(RECIPROCAL_STRUCTURES.has(structureKey)){
    structureTags.push('RECIPROCAL_SUPPORT','MUTUAL_ASSISTANCE','GIVE_RECEIVE_BALANCE');
    structureMagnitude='HIGH';
  } else {
    structureTags.push('RECIPROCAL_SUPPORT','FLEXIBLE_CARE_RESPONSE');
  }
  evidence.push(finding({
    id:'REL_SUPPORT_CARE_B2_STRUCTURE_BRIDGE',sourceType:'PATTERN_RESOLUTION',sourceKey:structureKey,
    semantic:structureSemantic,tags:structureTags,magnitude:structureMagnitude,
    plainMeaning:'原局结构在本题只转换成实际照料、接受支持、责任承接与互惠方式的中性语义；其中“实际投入”只指时间、行动、照料与承诺，绝不是金融投资。',
    technicalBasis:[`StructureKey=${structureKey}`,`PatternStage=${stage}`]
  }));

  if(COMPLEX_STAGES.has(stage)) evidence.push(finding({
    id:'REL_SUPPORT_CARE_B2_LOAD_REVIEW_BRIDGE',sourceType:'PATTERN_STAGE',sourceKey:stage,
    semantic:'ResponsibilityBoundaryRuleInteraction',tags:['CARE_LOAD_COMPLEXITY','SUPPORT_REBALANCE_NEED'],
    magnitude:(stage==='BROKEN'||stage==='FORMED_WITH_FLAW')?'HIGH':'MODERATE',
    plainMeaning:'结构存在复合牵制或待确认条件时，本题只提示照料负荷、责任分工与接受支持方式更值得复盘；不代表现实中一定有人亏欠或付出失衡。',
    technicalBasis:[`PatternStage=${stage}`]
  }));

  return evidence;
}

function relationModifier(strength){
  const dayState=(strength.relationResolution?.positionStates ?? []).find(x=>x.position==='DAY_BRANCH');
  if(!dayState || dayState.state==='NONE') return [];
  return [finding({
    id:'REL_SUPPORT_CARE_B3_DAY_POSITION_MODIFIER',role:'MODIFIER',bridge:'B3_EXACT_LINKED_RELATION',
    sourceType:'RELATION_TRANSFORMATION',sourceKey:dayState.state,
    semantic:'SupportReceptionInteraction',tags:['MODIFIER_ONLY','CARE_COORDINATION_NUANCE'],
    magnitude:'MODERATE',
    plainMeaning:'日支位置存在关系事实时，只作为照料协调、接受支持或互惠节奏的修饰线索；它不是“配偶宫付出结论”，也不能据此判断现实中的谁更自私或谁欠谁。',
    technicalBasis:[`DayBranchPositionState=${dayState.state}`,`ActivePrimary=${(dayState.activePrimary??[]).join('|')||'NONE'}`]
  })];
}

function supportingNuance(pattern){
  const m=pattern.mechanisms ?? {};
  const total=(m.routes?.length??0)+(m.failure?.length??0)+(m.rescue?.length??0)+(m.review?.length??0);
  if(!total) return [];
  return [finding({
    id:'REL_SUPPORT_CARE_B4_PATTERN_NUANCE',role:'SUPPORTING',bridge:'B4_SUPPORTING_ONLY',
    sourceType:'PATTERN_MECHANISM',sourceKey:'MECHANISMS_PRESENT',
    semantic:'ResponsibilityBoundaryRuleInteraction',tags:['SUPPORTING_ONLY','CARE_REFLECTION_NUANCE'],
    magnitude:'MODERATE',
    plainMeaning:'结构机制只补充“哪些照料与责任步骤值得复盘”的说明，不拥有独立 State 决定权。',
    technicalBasis:[`RouteCount=${m.routes?.length??0}`,`FailureCount=${m.failure?.length??0}`,`RescueCount=${m.rescue?.length??0}`,`ReviewCount=${m.review?.length??0}`]
  })];
}

function primaryLevel(evidence,tags){
  const xs=evidence.filter(x=>x.role==='PRIMARY' && x.bridge==='B2_TYPED_RELATIONSHIP' && tags.some(t=>x.tags.includes(t)));
  if(xs.some(x=>x.magnitude==='HIGH') || xs.length>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveRelationshipSupportCareState(evidence){
  const practicalCare=primaryLevel(evidence,['PRACTICAL_CARE','CONCRETE_EFFORT','CARE_COMMITMENT','SELF_INITIATED_CARE','PRACTICAL_GIVING','CARE_THROUGH_ACTION']);
  const supportReception=primaryLevel(evidence,['SUPPORT_RECEPTION','RECEIVE_HELP','ALLOW_CARE_IN','EMOTIONAL_HOLDING']);
  const responsibilityCare=primaryLevel(evidence,['RESPONSIBILITY_CARE','RELIABLE_FOLLOW_THROUGH','ROLE_COMMITMENT']);
  const reciprocalSupport=primaryLevel(evidence,['RECIPROCAL_SUPPORT','MUTUAL_ASSISTANCE','GIVE_RECEIVE_BALANCE','FLEXIBLE_CARE_RESPONSE']);
  const careLoadReview=primaryLevel(evidence,['CARE_LOAD_COMPLEXITY','SUPPORT_REBALANCE_NEED']);

  let state='RECIPROCAL_FLEXIBLE_SUPPORT';
  if(careLoadReview==='STRONG') state='CARE_LOAD_REBALANCE_FIRST';
  else if(practicalCare==='STRONG') state='PRACTICAL_CARE_THROUGH_ACTION';
  else if(supportReception==='STRONG') state='SUPPORT_RECEPTION_FIRST';
  else if(responsibilityCare==='STRONG') state='RESPONSIBILITY_BASED_CARE';

  return {
    state,
    dimensions:{practicalCare,supportReception,responsibilityCare,reciprocalSupport,careLoadReview},
    stateDrivenByRoles:['PRIMARY'],
    b3CanOwnState:false,
    b4CanOwnState:false,
    spouseStarUsed:false,
    genderUsedForEvidence:false,
    relationshipPreferenceUsedForEvidence:false,
    financialInvestmentMeaningUsed:false,
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

const COPY=Object.freeze({
  CARE_LOAD_REBALANCE_FIRST:{
    direct:'你在关系中的支持与照料更需要先确认“谁在承担什么、哪些支持可以接受、哪些责任需要重新分配”，再谈继续付出。',
    current:'当照料、责任与回应彼此牵动时，继续加码付出未必最有效；先辨认负荷、可持续范围与可请求的帮助，会更稳。',
    action:'可以把正在承担的事情分成“我愿意做”“需要共同承担”“应该由对方自行负责”三类，并明确哪些部分你也需要支持。',
    caution:'需要复盘照料负荷不代表现实中一定有人亏欠你，也不能据此判断某个关系一定失衡或会结束。'
  },
  PRACTICAL_CARE_THROUGH_ACTION:{
    direct:'你更容易通过具体行动表达支持，例如实际帮忙、投入时间、处理事务或持续兑现承诺，而不只是口头表示关心。',
    current:'行动型照料的价值在于可被感受到与执行，但持续“替别人做”不等于关系一定更好，也不代表你必须承担更多。',
    action:'在付出前先确认对方真正需要什么，再选择一项具体、可持续、双方都同意的行动；也保留说“不方便”或请求对方分担的空间。',
    caution:'这里的“投入”只指实际行动、照料、时间与承诺，绝不代表金融投资、金钱回报或财富建议。'
  },
  SUPPORT_RECEPTION_FIRST:{
    direct:'你在关系中更需要允许支持真正进入：表达需要、接受帮助、让别人参与，而不是把所有照料都变成自己单向承担。',
    current:'接受支持不等于依赖或能力不足；清楚说明自己需要什么、哪些帮助有用，反而能减少猜测与无效付出。',
    action:'可以从一个具体而有限的请求开始，例如请对方处理一件事务、陪伴一个时段，或明确告诉对方你更需要倾听还是实际协助。',
    caution:'需要支持不代表现实中的某个人有义务满足所有需求；支持仍需要双方同意、能力与边界。'
  },
  RESPONSIBILITY_BASED_CARE:{
    direct:'你更容易把照料理解成可靠地承担责任、把答应的事情做好，并让支持有清楚的角色与持续性。',
    current:'责任感能让关系更稳定，但“负责”不等于包办；若分工长期模糊，照料容易逐渐变成默认义务。',
    action:'重要的长期支持可以明确谁负责什么、多久复盘一次，以及当某一方负荷变化时如何重新分配，而不是依赖默认期待。',
    caution:'责任承接不代表你应该替另一方承担其全部选择与后果，也不能从命盘指定现实中的谁必须负责。'
  },
  RECIPROCAL_FLEXIBLE_SUPPORT:{
    direct:'你更适合让支持保持双向与弹性：有时主动付出，有时接受帮助，并根据现实需要调整照料方式。',
    current:'互惠不需要每一件事都完全对等；重点是长期来看双方都有表达需要、给予支持与调整分工的空间。',
    action:'可以定期问三个问题：“最近我最需要什么支持？”“对方最需要什么？”“哪一项可以共同调整？”让支持方式跟着现实变化。',
    caution:'互惠不是精确记账，也不能把一次付出多少转换成关系价值、匹配度或未来结果。'
  }
});

function contextAction(contextId){
  const map={
    CTX_NONE:null,
    CTX_SINGLE:'即使目前没有固定关系，也可以从家人、朋友与长期合作关系观察：你更常主动照料、接受帮助，还是承担固定责任。',
    CTX_PARTNERED:'在固定关系中，可以分别说清“我愿意主动做什么”“我希望得到什么支持”“哪些事情需要共同负责”，减少默认期待。',
    CTX_FAMILY_OR_CLOSE_RELATION:'面对家人或长期亲近关系时，熟悉不等于责任自动无限延伸；仍可以确认实际需要、能力与可持续范围。',
    CTX_GIVING_CONCERN:'若最在意自己是否付出过多，可先记录一段时间内哪些照料是自愿、哪些来自默认压力，再决定需要减少、分担或继续。',
    CTX_RECEIVING_CONCERN:'若最在意自己不容易接受帮助，可以先从一个具体、低负担的请求开始，让“接受支持”成为可练习的现实行为。',
    CTX_RESPONSIBILITY_CONCERN:'若最在意责任分工，可把持续性事务明确到人、频率与复盘时间，避免关心逐渐变成无人说清的义务。',
    CTX_CARE_LOAD_TENSION:'若现实中已经出现明显照料负荷或支持失衡，优先讨论可持续分工与现实资源；若涉及控制、威胁、暴力、强迫或安全问题，应优先寻求现实支持，而不是用八字解释对方行为。'
  };
  return map[contextId] ?? null;
}

export function renderRelationshipSupportCareAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!RELATIONSHIP_SUPPORT_CARE_STATES.includes(state)) throw new Error(`Unknown RELATIONSHIP_SUPPORT_CARE state: ${state}`);
  normalizeContext(contextId);
  const copy=COPY[state];
  const modifiers=evidence.filter(x=>x.role!=='PRIMARY').map(x=>x.plainMeaning).slice(0,2);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    actions:[contextAction(contextId),copy.action,'现实中的支持与照料仍要以双方真实需要、同意、能力与安全为准；命盘只能帮助整理习惯，不能替任何一方分配义务或证明谁欠谁。'].filter(Boolean).slice(0,3),
    caution:copy.caution,
    why:evidence.filter(x=>x.role==='PRIMARY').slice(0,4).map(x=>x.plainMeaning),
    modifiers,
    deepAwareness:'这道题描述的是你较自然的付出、照料与接受支持方式，不是在计算谁爱得更多、谁值得被照顾，或某个关系会不会有结果。',
    realityBoundary:'现实中的照料与支持要由真实需要、同意、能力、资源与安全来验证；若存在控制、威胁、暴力、强迫或严重照料负荷，应优先处理现实安全与可获得支持，而不是用八字合理化。',
    practicalInvestmentMeaning:'实际投入仅指 practical effort / care / commitment，不涉及金融投资、投资产品、回报率或财富建议。',
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

export function buildRelationshipSupportCareSynthesis({chart,contextId='CTX_NONE',gender=null,relationshipReadingPreference='UNSPECIFIED'}={}){
  if(!chart) throw new Error('chart is required');
  const context=normalizeContext(contextId);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const primary=b1b2Evidence(strength,pattern);
  const modifiers=relationModifier(strength);
  const supporting=supportingNuance(pattern);
  const evidence=[...primary,...modifiers,...supporting];
  const resolution=resolveRelationshipSupportCareState(evidence);
  const answer=renderRelationshipSupportCareAnswer(resolution.state,contextId,evidence);
  return {
    version:RELATIONSHIP_SUPPORT_CARE_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:RELATIONSHIP_SUPPORT_CARE_QUESTION,
    context,
    inputFraming:{genderProvided:gender!=null,relationshipReadingPreference:relationshipReadingPreference??'UNSPECIFIED',usedForEvidence:false},
    natal:{strengthBand:strength.strengthBand,structureKey:pattern.baseStructure?.key??'UNKNOWN_STRUCTURE',patternStage:pattern.stage??'UNKNOWN'},
    evidence,
    resolution,
    answer,
    policy:{
      spouseStarV1Policy:'EXCLUDED',
      dayBranchSpousePalaceDeterminism:false,
      b3Role:'MODIFIER_ONLY',
      b4Role:'SUPPORTING_ONLY',
      monthTimingAdapterUsed:false,
      eventPredictionUsed:false,
      genderChangesEvidence:false,
      relationshipPreferenceChangesEvidence:false,
      practicalInvestmentIsFinancial:false
    },
    trace:[
      `STRENGTH=${strength.strengthBand}`,
      `STRUCTURE=${pattern.baseStructure?.key??'UNKNOWN_STRUCTURE'}`,
      `PATTERN_STAGE=${pattern.stage??'UNKNOWN'}`,
      `STATE=${resolution.state}`,
      'PRACTICAL_INVESTMENT=CARE_EFFORT_COMMITMENT_ONLY',
      'FINANCIAL_INVESTMENT=NOT_USED',
      'B3=MODIFIER_ONLY',
      'B4=SUPPORTING_ONLY',
      'SPOUSE_STAR=EXCLUDED',
      'MONTH_TIMING=NOT_USED'
    ]
  };
}
