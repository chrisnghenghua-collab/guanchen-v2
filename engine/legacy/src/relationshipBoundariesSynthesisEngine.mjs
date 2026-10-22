import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';

export const RELATIONSHIP_BOUNDARIES_VERSION='GUANCHEN_RELATIONSHIP_BOUNDARIES_PROTO_V1_STEP03_REL1_A1';

export const RELATIONSHIP_BOUNDARIES_QUESTION=Object.freeze({
  questionId:'RELATIONSHIP_BOUNDARIES',
  domain:'RELATIONSHIP',
  userText:'我在关系中需要怎样的边界、空间与责任安排？',
  intent:'ASSESS_NATAL_RELATIONSHIP_BOUNDARY_SPACE_RESPONSIBILITY_PATTERN',
  classification:'NATAL',
  primaryTopic:'RelationshipNeedsAndBoundaries',
  primarySemantics:Object.freeze([
    'AutonomyEqualityCoordinationInteraction',
    'ResponsibilityBoundaryRuleInteraction',
    'SupportReceptionInteraction'
  ]),
  behaviorTarget:'BoundaryPractice',
  evidenceRecipeId:'RECIPE_RELATIONSHIP_BOUNDARIES_V1',
  spouseStarV1Policy:'EXCLUDED',
  timingRequired:[],
  monthTimingAdapterRequired:false,
  outputTemplate:'RELATIONSHIP_BOUNDARIES_SYNTHESIS_V1'
});

export const RELATIONSHIP_BOUNDARIES_STATES=Object.freeze([
  'AUTONOMY_SPACE_FIRST',
  'CLEAR_ROLES_AND_RULES',
  'MUTUAL_SUPPORT_WITH_BOUNDARIES',
  'FLEXIBLE_COORDINATION',
  'BOUNDARY_COMPLEXITY_REVIEW'
]);

export const RELATIONSHIP_BOUNDARIES_CONTEXTS=Object.freeze({
  CTX_NONE:{label:'不补充现实关系情境'},
  CTX_SINGLE:{label:'目前没有固定伴侣／关系对象'},
  CTX_PARTNERED:{label:'目前处于固定关系中'},
  CTX_FAMILY_OR_CLOSE_RELATION:{label:'主要想理解家人或长期亲近关系'},
  CTX_SPACE_CONCERN:{label:'现实中较在意个人空间'},
  CTX_RESPONSIBILITY_CONCERN:{label:'现实中较在意责任分配'},
  CTX_SUPPORT_CONCERN:{label:'现实中较在意支持是否对等'},
  CTX_BOUNDARY_TENSION:{label:'现实中正在处理边界摩擦'}
});

const STRONG_BANDS=new Set(['BALANCED_STRONG','STRONG','VERY_STRONG']);
const WEAK_BANDS=new Set(['VERY_WEAK','WEAK','BALANCED_WEAK']);
const PEER_STRUCTURES=new Set(['JIAN_LU','YUE_JIE','YANG_REN']);
const AUTHORITY_STRUCTURES=new Set(['DIRECT_OFFICER','SEVEN_KILLINGS']);
const RESOURCE_STRUCTURES=new Set(['DIRECT_RESOURCE','INDIRECT_RESOURCE']);
const FLEX_STRUCTURES=new Set(['DIRECT_WEALTH','INDIRECT_WEALTH','EATING_GOD','HURTING_OFFICER']);
const COMPLEX_STAGES=new Set(['BROKEN','REVIEW','FORMED_WITH_FLAW']);

function normalizeContext(contextId='CTX_NONE'){
  const found=RELATIONSHIP_BOUNDARIES_CONTEXTS[contextId];
  if(!found){
    const e=new Error(`Unknown RELATIONSHIP_BOUNDARIES context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:found.label,rewritesEvidence:false,rewritesState:false};
}

function finding({id,role='PRIMARY',bridge='B2_TYPED_RELATIONSHIP',sourceType,sourceKey,semantic,tags=[],magnitude='MODERATE',plainMeaning,technicalBasis=[]}){
  return {
    id,role,bridge,domain:'RELATIONSHIP',topic:'RelationshipNeedsAndBoundaries',
    sourceType,sourceKey,semantic,tags:[...new Set(tags)],magnitude,
    timingScope:'NATAL',certainty:'CONFIRMED',plainMeaning,technicalBasis,
    spouseStarEvidence:false,genderDependent:false,relationshipPreferenceDependent:false
  };
}

function b1b2Evidence(strength,pattern){
  const structureKey=pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE';
  const stage=pattern.stage ?? 'UNKNOWN';
  const evidence=[];

  const strengthTags=['COORDINATION_BASELINE'];
  let strengthSemantic='AutonomyEqualityCoordinationInteraction';
  let strengthMagnitude='MODERATE';
  if(STRONG_BANDS.has(strength.strengthBand)){
    strengthTags.push('AUTONOMY_NEED','SPACE_NEED','EQUALITY_COORDINATION');
    strengthMagnitude=new Set(['STRONG','VERY_STRONG']).has(strength.strengthBand)?'HIGH':'MODERATE';
  } else if(WEAK_BANDS.has(strength.strengthBand)){
    strengthTags.push('SUPPORT_RECEPTION_NEED','BOUNDARY_SUPPORT_NEED');
    strengthSemantic='SupportReceptionInteraction';
    strengthMagnitude=new Set(['VERY_WEAK','WEAK']).has(strength.strengthBand)?'HIGH':'MODERATE';
  } else {
    strengthTags.push('FLEXIBLE_COORDINATION','EQUALITY_COORDINATION');
  }
  evidence.push(finding({
    id:'REL_BOUNDARY_B2_STRENGTH_BRIDGE',sourceType:'STRENGTH',sourceKey:strength.strengthBand,
    semantic:strengthSemantic,tags:strengthTags,magnitude:strengthMagnitude,
    plainMeaning:'日主强弱在本题只用于理解互动中的自主空间、支持承接与协调节奏，不代表谁更强势，也不决定任何关系结果。',
    technicalBasis:[`StrengthBand=${strength.strengthBand}`]
  }));

  let structureSemantic='AutonomyEqualityCoordinationInteraction';
  const structureTags=['RELATIONSHIP_STRUCTURE_BASELINE'];
  if(PEER_STRUCTURES.has(structureKey)) structureTags.push('AUTONOMY_NEED','EQUALITY_COORDINATION','BOUNDARY_CLARITY');
  if(AUTHORITY_STRUCTURES.has(structureKey)){
    structureSemantic='ResponsibilityBoundaryRuleInteraction';
    structureTags.push('RULE_NEED','RESPONSIBILITY_CLARITY','BOUNDARY_CLARITY');
  }
  if(RESOURCE_STRUCTURES.has(structureKey)){
    structureSemantic='SupportReceptionInteraction';
    structureTags.push('SUPPORT_RECEPTION_NEED','RESPONSIBILITY_CLARITY');
  }
  if(FLEX_STRUCTURES.has(structureKey)) structureTags.push('FLEXIBLE_COORDINATION','NEGOTIABLE_BOUNDARY');
  evidence.push(finding({
    id:'REL_BOUNDARY_B2_STRUCTURE_BRIDGE',sourceType:'PATTERN_RESOLUTION',sourceKey:structureKey,
    semantic:structureSemantic,tags:structureTags,
    magnitude:(PEER_STRUCTURES.has(structureKey)||AUTHORITY_STRUCTURES.has(structureKey)||RESOURCE_STRUCTURES.has(structureKey))?'HIGH':'MODERATE',
    plainMeaning:'原局结构在本题只转换为边界、责任、支持与协调方式的中性互动语义；不转换为伴侣品质、婚姻适配或配偶星判断。',
    technicalBasis:[`StructureKey=${structureKey}`,`PatternStage=${stage}`]
  }));

  if(COMPLEX_STAGES.has(stage)) evidence.push(finding({
    id:'REL_BOUNDARY_B2_COMPLEXITY_BRIDGE',sourceType:'PATTERN_STAGE',sourceKey:stage,
    semantic:'ResponsibilityBoundaryRuleInteraction',tags:['BOUNDARY_COMPLEXITY','RENEGOTIATION_NEED'],
    magnitude:(stage==='BROKEN'||stage==='FORMED_WITH_FLAW')?'HIGH':'MODERATE',
    plainMeaning:'结构存在复合牵制或待确认条件时，本题只提示边界与责任需要更明确地协商和复盘，不代表现实关系一定冲突。',
    technicalBasis:[`PatternStage=${stage}`]
  }));

  return evidence;
}

function relationModifier(strength){
  const dayState=(strength.relationResolution?.positionStates ?? []).find(x=>x.position==='DAY_BRANCH');
  if(!dayState || dayState.state==='NONE') return [];
  return [finding({
    id:'REL_BOUNDARY_B3_DAY_POSITION_MODIFIER',role:'MODIFIER',bridge:'B3_EXACT_LINKED_RELATION',
    sourceType:'RELATION_TRANSFORMATION',sourceKey:dayState.state,
    semantic:'AutonomyEqualityCoordinationInteraction',tags:['MODIFIER_ONLY','RELATION_FRICTION_OR_MEDIATION_NUANCE'],
    magnitude:'MODERATE',
    plainMeaning:'日支位置存在关系事实时，只作为互动边界的修饰线索；它不是“配偶宫结论”，也不能直接推出婚姻、分手或对象特征。',
    technicalBasis:[`DayBranchPositionState=${dayState.state}`,`ActivePrimary=${(dayState.activePrimary??[]).join('|')||'NONE'}`]
  })];
}

function supportingNuance(pattern){
  const m=pattern.mechanisms ?? {};
  const total=(m.routes?.length??0)+(m.failure?.length??0)+(m.rescue?.length??0)+(m.review?.length??0);
  if(!total) return [];
  return [finding({
    id:'REL_BOUNDARY_B4_PATTERN_NUANCE',role:'SUPPORTING',bridge:'B4_SUPPORTING_ONLY',
    sourceType:'PATTERN_MECHANISM',sourceKey:'MECHANISMS_PRESENT',
    semantic:'ResponsibilityBoundaryRuleInteraction',tags:['SUPPORTING_ONLY','REFLECTION_NUANCE'],
    magnitude:'MODERATE',
    plainMeaning:'结构机制只补充“哪些边界需要更常复盘”的说明，不拥有独立 State 决定权。',
    technicalBasis:[`RouteCount=${m.routes?.length??0}`,`FailureCount=${m.failure?.length??0}`,`RescueCount=${m.rescue?.length??0}`,`ReviewCount=${m.review?.length??0}`]
  })];
}

function primaryLevel(evidence,tags){
  const xs=evidence.filter(x=>x.role==='PRIMARY' && x.bridge==='B2_TYPED_RELATIONSHIP' && tags.some(t=>x.tags.includes(t)));
  if(xs.some(x=>x.magnitude==='HIGH') || xs.length>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveRelationshipBoundariesState(evidence){
  const autonomyNeed=primaryLevel(evidence,['AUTONOMY_NEED','SPACE_NEED']);
  const ruleNeed=primaryLevel(evidence,['RULE_NEED','RESPONSIBILITY_CLARITY','BOUNDARY_CLARITY']);
  const supportNeed=primaryLevel(evidence,['SUPPORT_RECEPTION_NEED','BOUNDARY_SUPPORT_NEED']);
  const coordinationNeed=primaryLevel(evidence,['FLEXIBLE_COORDINATION','NEGOTIABLE_BOUNDARY','EQUALITY_COORDINATION']);
  const complexityReview=primaryLevel(evidence,['BOUNDARY_COMPLEXITY','RENEGOTIATION_NEED']);

  let state='FLEXIBLE_COORDINATION';
  if(complexityReview==='STRONG') state='BOUNDARY_COMPLEXITY_REVIEW';
  else if(autonomyNeed==='STRONG') state='AUTONOMY_SPACE_FIRST';
  else if(ruleNeed==='STRONG') state='CLEAR_ROLES_AND_RULES';
  else if(supportNeed==='STRONG') state='MUTUAL_SUPPORT_WITH_BOUNDARIES';

  return {
    state,
    dimensions:{autonomyNeed,ruleNeed,supportNeed,coordinationNeed,complexityReview},
    stateDrivenByRoles:['PRIMARY'],
    b3CanOwnState:false,
    b4CanOwnState:false,
    spouseStarUsed:false,
    genderUsedForEvidence:false,
    relationshipPreferenceUsedForEvidence:false,
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

const COPY=Object.freeze({
  AUTONOMY_SPACE_FIRST:{
    direct:'你更需要先保留清楚的个人空间与自主决定范围，再进入共同协调。',
    current:'边界清楚并不等于疏离；重点是哪些事自己负责、哪些事共同决定、哪些事需要提前说明。',
    action:'把个人时间、隐私、资源使用与共同事项分别说清楚，避免把“亲近”自动等同于“所有事情都必须共享”。',
    caution:'自主空间不是要求另一方必须退让，更不能据此判断任何具体关系一定合适或不合适。'
  },
  CLEAR_ROLES_AND_RULES:{
    direct:'你更适合责任与规则说得清楚的关系安排，模糊分工容易增加不必要的猜测。',
    current:'明确谁负责什么、哪些决定要共同确认，通常比依赖默契更稳定。',
    action:'对长期承诺、时间安排、共同责任与可调整范围做具体约定，并保留重新协商的入口。',
    caution:'规则是为了减少误解，不代表关系必须僵化，也不能用命盘替现实双方做决定。'
  },
  MUTUAL_SUPPORT_WITH_BOUNDARIES:{
    direct:'你更需要一种“可以接受支持，也不会失去自身边界”的互动方式。',
    current:'支持对你有意义，但支持与责任最好分开：接受帮助不等于自动承担对方的全部期待。',
    action:'把“我需要什么支持”“我能承担什么”“超出什么范围需要再谈”分别表达清楚。',
    caution:'需要支持不代表依赖，也不代表现实中的某个人一定适合承担这些角色。'
  },
  FLEXIBLE_COORDINATION:{
    direct:'你更适合保留弹性，通过持续协调来调整个人空间、共同责任与支持方式。',
    current:'与其一次把所有边界定死，更适合先有基本原则，再根据现实阶段重新协调。',
    action:'先约定少数不可模糊的底线，其余事项用定期沟通与复盘保持弹性。',
    caution:'弹性不等于没有边界；现实中的尊重、安全与双方同意仍是必要前提。'
  },
  BOUNDARY_COMPLEXITY_REVIEW:{
    direct:'你的关系边界更适合用“明确＋复盘”的方式处理，而不是依赖一次性的默契。',
    current:'当自主、责任、支持与现实安排容易互相牵动时，边界需要分层，并允许阶段性重新协商。',
    action:'先处理最容易互相挤压的两三项：个人空间、共同责任、支持范围；每次只调整一个具体规则并观察效果。',
    caution:'这里的“复杂”只描述边界管理需要更多复盘，不代表现实关系必然冲突、分手或婚姻不顺。'
  }
});

function contextAction(contextId){
  const map={
    CTX_NONE:null,
    CTX_SINGLE:'即使目前没有固定关系，也可以先从家人、朋友与长期合作关系观察：哪些互动会让你觉得空间被侵入，哪些责任约定反而让你更安心。',
    CTX_PARTNERED:'在固定关系中，优先把“个人决定”“共同决定”“需要告知但不需批准”三类事情分开，比讨论谁对谁错更具体。',
    CTX_FAMILY_OR_CLOSE_RELATION:'面对家人或长期亲近关系时，血缘或熟悉感不自动取消边界；仍可以明确时间、责任与可提供支持的范围。',
    CTX_SPACE_CONCERN:'若现实中最在意个人空间，可先从时间、隐私与独处安排建立可执行边界，再讨论更抽象的关系期待。',
    CTX_RESPONSIBILITY_CONCERN:'若现实中最在意责任分配，把任务、期限、决定权与临时变更方式写清楚，能减少“以为对方会知道”的落差。',
    CTX_SUPPORT_CONCERN:'若现实中最在意支持是否对等，可分别确认情绪支持、实际协助与长期责任，避免把不同类型的支持混成同一件事。',
    CTX_BOUNDARY_TENSION:'若现实中已经有边界摩擦，先处理具体行为与可执行规则；若涉及控制、威胁或安全问题，应优先寻求现实支持，而不是用命盘解释对方行为。'
  };
  return map[contextId] ?? null;
}

export function renderRelationshipBoundariesAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!RELATIONSHIP_BOUNDARIES_STATES.includes(state)) throw new Error(`Unknown RELATIONSHIP_BOUNDARIES state: ${state}`);
  normalizeContext(contextId);
  const copy=COPY[state];
  const modifiers=evidence.filter(x=>x.role!=='PRIMARY').map(x=>x.plainMeaning).slice(0,2);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    actions:[contextAction(contextId),copy.action,'现实关系仍要以双方真实表达、同意、尊重与安全为准；命盘不能替任何一方决定边界，也不能证明关系结果。'].filter(Boolean).slice(0,3),
    caution:copy.caution,
    why:evidence.filter(x=>x.role==='PRIMARY').slice(0,4).map(x=>x.plainMeaning),
    modifiers,
    deepAwareness:'这道题回答的是你较适合怎样组织“自主、责任、支持与协调”的边界，不是在判断某个对象是不是正缘、适不适合结婚，或关系会不会发生某个事件。',
    realityBoundary:'现实中的边界是否有效，需要由双方真实沟通、明确同意、可执行规则与安全感来验证；若存在控制、威胁、暴力或强迫，应优先处理现实安全与寻求专业/社会支持，而不是用八字解释。',
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

export function buildRelationshipBoundariesSynthesis({chart,contextId='CTX_NONE',gender=null,relationshipReadingPreference='UNSPECIFIED'}={}){
  if(!chart) throw new Error('chart is required');
  const context=normalizeContext(contextId);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const primary=b1b2Evidence(strength,pattern);
  const modifiers=relationModifier(strength);
  const supporting=supportingNuance(pattern);
  const evidence=[...primary,...modifiers,...supporting];
  const resolution=resolveRelationshipBoundariesState(evidence);
  const answer=renderRelationshipBoundariesAnswer(resolution.state,contextId,evidence);
  return {
    version:RELATIONSHIP_BOUNDARIES_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:RELATIONSHIP_BOUNDARIES_QUESTION,
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
      relationshipPreferenceChangesEvidence:false
    },
    trace:[
      `STRENGTH=${strength.strengthBand}`,
      `STRUCTURE=${pattern.baseStructure?.key??'UNKNOWN_STRUCTURE'}`,
      `PATTERN_STAGE=${pattern.stage??'UNKNOWN'}`,
      `STATE=${resolution.state}`,
      `PRIMARY_EVIDENCE=${primary.map(x=>x.id).join('|')}`,
      `B3_MODIFIERS=${modifiers.map(x=>x.sourceKey).join('|')||'NONE'}`,
      `B4_SUPPORT=${supporting.length?'PRESENT':'NONE'}`,
      'SPOUSE_STAR=EXCLUDED',
      'MONTH_TIMING=NOT_USED'
    ]
  };
}
