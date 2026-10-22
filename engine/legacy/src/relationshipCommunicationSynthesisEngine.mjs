import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';

export const RELATIONSHIP_COMMUNICATION_VERSION='GUANCHEN_RELATIONSHIP_COMMUNICATION_PROTO_V1_STEP03_REL2_A1';

export const RELATIONSHIP_COMMUNICATION_QUESTION=Object.freeze({
  questionId:'RELATIONSHIP_COMMUNICATION',
  domain:'RELATIONSHIP',
  userText:'我在关系中通常怎样表达、回应与协调？',
  intent:'ASSESS_NATAL_RELATIONSHIP_EXPRESSION_RESPONSE_COORDINATION_PATTERN',
  classification:'NATAL',
  primaryTopic:'RelationshipInteractionPattern',
  primarySemantics:Object.freeze([
    'ExpressionResponseInteraction',
    'AutonomyEqualityCoordinationInteraction'
  ]),
  behaviorTarget:'CommunicationPractice',
  evidenceRecipeId:'RECIPE_RELATIONSHIP_COMMUNICATION_V1',
  spouseStarV1Policy:'EXCLUDED',
  timingRequired:[],
  monthTimingAdapterRequired:false,
  outputTemplate:'RELATIONSHIP_COMMUNICATION_SYNTHESIS_V1'
});

export const RELATIONSHIP_COMMUNICATION_STATES=Object.freeze([
  'DIRECT_CLEAR_EXCHANGE',
  'REFLECTIVE_RESPONSE_FIRST',
  'MUTUAL_TURN_COORDINATION',
  'ADAPTIVE_DIALOGUE',
  'CLARIFY_AND_REPAIR_FIRST'
]);

export const RELATIONSHIP_COMMUNICATION_CONTEXTS=Object.freeze({
  CTX_NONE:{label:'不补充现实关系情境'},
  CTX_SINGLE:{label:'目前没有固定伴侣／关系对象'},
  CTX_PARTNERED:{label:'目前处于固定关系中'},
  CTX_FAMILY_OR_CLOSE_RELATION:{label:'主要想理解家人或长期亲近关系'},
  CTX_EXPRESSION_CONCERN:{label:'现实中较在意自己是否表达得够清楚'},
  CTX_RESPONSE_CONCERN:{label:'现实中较在意回应速度或理解落差'},
  CTX_MISUNDERSTANDING:{label:'现实中正在处理反复误解'},
  CTX_CONFLICT_TENSION:{label:'现实中正在处理沟通摩擦或冲突'}
});

const STRONG_BANDS=new Set(['BALANCED_STRONG','STRONG','VERY_STRONG']);
const WEAK_BANDS=new Set(['VERY_WEAK','WEAK','BALANCED_WEAK']);
const OUTPUT_STRUCTURES=new Set(['EATING_GOD','HURTING_OFFICER']);
const RESOURCE_STRUCTURES=new Set(['DIRECT_RESOURCE','INDIRECT_RESOURCE']);
const PEER_STRUCTURES=new Set(['JIAN_LU','YUE_JIE','YANG_REN']);
const AUTHORITY_STRUCTURES=new Set(['DIRECT_OFFICER','SEVEN_KILLINGS']);
const FLEX_STRUCTURES=new Set(['DIRECT_WEALTH','INDIRECT_WEALTH']);
const COMPLEX_STAGES=new Set(['BROKEN','REVIEW','FORMED_WITH_FLAW']);

function normalizeContext(contextId='CTX_NONE'){
  const found=RELATIONSHIP_COMMUNICATION_CONTEXTS[contextId];
  if(!found){
    const e=new Error(`Unknown RELATIONSHIP_COMMUNICATION context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:found.label,rewritesEvidence:false,rewritesState:false};
}

function finding({id,role='PRIMARY',bridge='B2_TYPED_RELATIONSHIP',sourceType,sourceKey,semantic,tags=[],magnitude='MODERATE',plainMeaning,technicalBasis=[]}){
  return {
    id,role,bridge,domain:'RELATIONSHIP',topic:'RelationshipInteractionPattern',
    sourceType,sourceKey,semantic,tags:[...new Set(tags)],magnitude,
    timingScope:'NATAL',certainty:'CONFIRMED',plainMeaning,technicalBasis,
    spouseStarEvidence:false,genderDependent:false,relationshipPreferenceDependent:false
  };
}

function b1b2Evidence(strength,pattern){
  const structureKey=pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE';
  const stage=pattern.stage ?? 'UNKNOWN';
  const evidence=[];

  let strengthSemantic='AutonomyEqualityCoordinationInteraction';
  let strengthMagnitude='MODERATE';
  const strengthTags=['COMMUNICATION_BASELINE'];
  if(STRONG_BANDS.has(strength.strengthBand)){
    strengthSemantic='ExpressionResponseInteraction';
    strengthTags.push('DIRECT_EXPRESSION','EXPLICIT_EXCHANGE');
    strengthMagnitude=new Set(['STRONG','VERY_STRONG']).has(strength.strengthBand)?'HIGH':'MODERATE';
  } else if(WEAK_BANDS.has(strength.strengthBand)){
    strengthSemantic='ExpressionResponseInteraction';
    strengthTags.push('REFLECTIVE_RESPONSE','PROCESS_BEFORE_RESPONSE');
    strengthMagnitude=new Set(['VERY_WEAK','WEAK']).has(strength.strengthBand)?'HIGH':'MODERATE';
  } else {
    strengthTags.push('MUTUAL_TURN','EQUALITY_COORDINATION','ADAPTIVE_DIALOGUE');
  }
  evidence.push(finding({
    id:'REL_COMM_B2_STRENGTH_BRIDGE',sourceType:'STRENGTH',sourceKey:strength.strengthBand,
    semantic:strengthSemantic,tags:strengthTags,magnitude:strengthMagnitude,
    plainMeaning:'日主强弱在本题只用于理解表达与回应的基础节奏：是较倾向直接说清、先处理再回应，还是保持双向协调；不代表谁更会沟通，也不决定关系结果。',
    technicalBasis:[`StrengthBand=${strength.strengthBand}`]
  }));

  let structureSemantic='AutonomyEqualityCoordinationInteraction';
  let structureMagnitude='MODERATE';
  const structureTags=['RELATIONSHIP_INTERACTION_BASELINE'];
  if(OUTPUT_STRUCTURES.has(structureKey)){
    structureSemantic='ExpressionResponseInteraction';
    structureTags.push('DIRECT_EXPRESSION','EXPLICIT_EXCHANGE','IDEA_EXTERNALIZATION');
    structureMagnitude='HIGH';
  } else if(RESOURCE_STRUCTURES.has(structureKey)){
    structureSemantic='ExpressionResponseInteraction';
    structureTags.push('REFLECTIVE_RESPONSE','PROCESS_BEFORE_RESPONSE','LISTENING_PROCESS');
    structureMagnitude='HIGH';
  } else if(PEER_STRUCTURES.has(structureKey)){
    structureTags.push('MUTUAL_TURN','EQUALITY_COORDINATION','DIRECT_NEGOTIATION');
    structureMagnitude='HIGH';
  } else if(AUTHORITY_STRUCTURES.has(structureKey)){
    structureSemantic='ExpressionResponseInteraction';
    structureTags.push('EXPLICIT_EXCHANGE','CLARIFY_EXPECTATIONS','STRUCTURED_RESPONSE');
    structureMagnitude='HIGH';
  } else if(FLEX_STRUCTURES.has(structureKey)){
    structureTags.push('ADAPTIVE_DIALOGUE','CONTEXTUAL_COORDINATION','NEGOTIABLE_RESPONSE');
    structureMagnitude='HIGH';
  } else {
    structureTags.push('ADAPTIVE_DIALOGUE','MUTUAL_TURN');
  }
  evidence.push(finding({
    id:'REL_COMM_B2_STRUCTURE_BRIDGE',sourceType:'PATTERN_RESOLUTION',sourceKey:structureKey,
    semantic:structureSemantic,tags:structureTags,magnitude:structureMagnitude,
    plainMeaning:'原局结构在本题只转换成表达、回应与协调方式的中性互动语义，不转换成伴侣性格、沟通匹配度或婚恋结论。',
    technicalBasis:[`StructureKey=${structureKey}`,`PatternStage=${stage}`]
  }));

  if(COMPLEX_STAGES.has(stage)) evidence.push(finding({
    id:'REL_COMM_B2_COMPLEXITY_BRIDGE',sourceType:'PATTERN_STAGE',sourceKey:stage,
    semantic:'ExpressionResponseInteraction',tags:['COMMUNICATION_COMPLEXITY','CLARIFICATION_REPAIR'],
    magnitude:new Set(['BROKEN','FORMED_WITH_FLAW']).has(stage)?'HIGH':'MODERATE',
    plainMeaning:'结构存在复合牵制或待确认条件时，本题只提示表达与回应更需要澄清、复述与修复步骤，不代表现实中一定经常争吵。',
    technicalBasis:[`PatternStage=${stage}`]
  }));

  return evidence;
}

function relationModifier(strength){
  const dayState=(strength.relationResolution?.positionStates ?? []).find(x=>x.position==='DAY_BRANCH');
  if(!dayState || dayState.state==='NONE') return [];
  return [finding({
    id:'REL_COMM_B3_DAY_POSITION_MODIFIER',role:'MODIFIER',bridge:'B3_EXACT_LINKED_RELATION',
    sourceType:'RELATION_TRANSFORMATION',sourceKey:dayState.state,
    semantic:'ExpressionResponseInteraction',tags:['MODIFIER_ONLY','FRICTION_OR_REPAIR_NUANCE'],
    magnitude:'MODERATE',
    plainMeaning:'日支位置存在关系事实时，只作为沟通摩擦、误解或修复方式的修饰线索；它不是“配偶宫沟通结论”，也不能直接推出双方一定合拍或冲突。',
    technicalBasis:[`DayBranchPositionState=${dayState.state}`,`ActivePrimary=${(dayState.activePrimary??[]).join('|')||'NONE'}`]
  })];
}

function supportingNuance(pattern){
  const m=pattern.mechanisms ?? {};
  const total=(m.routes?.length??0)+(m.failure?.length??0)+(m.rescue?.length??0)+(m.review?.length??0);
  if(!total) return [];
  return [finding({
    id:'REL_COMM_B4_PATTERN_NUANCE',role:'SUPPORTING',bridge:'B4_SUPPORTING_ONLY',
    sourceType:'PATTERN_MECHANISM',sourceKey:'MECHANISMS_PRESENT',
    semantic:'AutonomyEqualityCoordinationInteraction',tags:['SUPPORTING_ONLY','COMMUNICATION_REFLECTION_NUANCE'],
    magnitude:'MODERATE',
    plainMeaning:'结构机制只补充“哪些沟通步骤值得复盘”的说明，不拥有独立 State 决定权。',
    technicalBasis:[`RouteCount=${m.routes?.length??0}`,`FailureCount=${m.failure?.length??0}`,`RescueCount=${m.rescue?.length??0}`,`ReviewCount=${m.review?.length??0}`]
  })];
}

function primaryLevel(evidence,tags){
  const xs=evidence.filter(x=>x.role==='PRIMARY' && x.bridge==='B2_TYPED_RELATIONSHIP' && tags.some(t=>x.tags.includes(t)));
  if(xs.some(x=>x.magnitude==='HIGH') || xs.length>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveRelationshipCommunicationState(evidence){
  const directExpression=primaryLevel(evidence,['DIRECT_EXPRESSION','EXPLICIT_EXCHANGE']);
  const reflectiveResponse=primaryLevel(evidence,['REFLECTIVE_RESPONSE','PROCESS_BEFORE_RESPONSE','LISTENING_PROCESS']);
  const mutualCoordination=primaryLevel(evidence,['MUTUAL_TURN','EQUALITY_COORDINATION','DIRECT_NEGOTIATION']);
  const adaptiveDialogue=primaryLevel(evidence,['ADAPTIVE_DIALOGUE','CONTEXTUAL_COORDINATION','NEGOTIABLE_RESPONSE']);
  const clarificationRepair=primaryLevel(evidence,['COMMUNICATION_COMPLEXITY','CLARIFICATION_REPAIR']);

  let state='ADAPTIVE_DIALOGUE';
  if(clarificationRepair==='STRONG') state='CLARIFY_AND_REPAIR_FIRST';
  else if(directExpression==='STRONG') state='DIRECT_CLEAR_EXCHANGE';
  else if(reflectiveResponse==='STRONG') state='REFLECTIVE_RESPONSE_FIRST';
  else if(mutualCoordination==='STRONG') state='MUTUAL_TURN_COORDINATION';

  return {
    state,
    dimensions:{directExpression,reflectiveResponse,mutualCoordination,adaptiveDialogue,clarificationRepair},
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
  DIRECT_CLEAR_EXCHANGE:{
    direct:'你在关系沟通中更适合把重点直接说清楚，再邀请对方回应，而不是让关键信息长期停留在猜测里。',
    current:'直接并不等于强硬；有效的直接表达通常包含事实、感受、需要与可讨论范围，而不是只给结论。',
    action:'遇到重要议题时，先用一两句说明“我观察到什么、我在意什么、我希望一起确认什么”，再留出对方完整回应的时间。',
    caution:'表达直接不代表你永远正确，也不能据此判断某个对象一定与你沟通合拍。'
  },
  REFLECTIVE_RESPONSE_FIRST:{
    direct:'你更适合先听取、整理与确认理解，再给出回应；被要求立刻表态时，反而容易失去原本的判断节奏。',
    current:'需要处理时间不等于冷淡或逃避；重点是让对方知道你正在理解，并约定何时继续回应。',
    action:'可以先复述自己听到的重点，再明确“我需要一点时间整理，之后会在某个具体时间继续谈”。',
    caution:'先处理再回应不代表所有问题都适合拖延；现实中的紧急事项与安全问题仍应及时处理。'
  },
  MUTUAL_TURN_COORDINATION:{
    direct:'你更适合双方都有完整表达空间的沟通方式，通过轮流说明、确认与协调来形成共同理解。',
    current:'对你而言，沟通质量往往来自“双方都能被听见”，而不是谁一次把道理说完。',
    action:'讨论分歧时，可以约定一次只处理一个议题，并让双方分别说完观点、需求与可接受调整，再进入协商。',
    caution:'平等轮替不等于每件事必须五五分，也不能用命盘要求现实中的另一方必须采用同一种沟通方式。'
  },
  ADAPTIVE_DIALOGUE:{
    direct:'你更适合根据议题与情境调整沟通方式：有些事直接说清，有些事先听取，有些事需要多轮协调。',
    current:'固定一种沟通风格未必最有效；保留方式上的弹性，同时维持少数清楚原则，会更容易减少误解。',
    action:'先判断当前议题更需要“说明事实”“理解感受”还是“协调方案”，再选择相应的表达与回应方式。',
    caution:'弹性不等于迎合或放弃立场；清楚、同意、尊重与安全仍是现实沟通的基本条件。'
  },
  CLARIFY_AND_REPAIR_FIRST:{
    direct:'你的沟通更适合把“澄清与修复”当成正式步骤：先确认彼此到底听到了什么，再继续讨论立场。',
    current:'当表达、回应与协调容易互相牵动时，一次谈完所有问题往往不如先修正误解、再处理真正分歧。',
    action:'出现卡住时，先暂停新增论点，分别复述对方的意思并确认是否理解正确；确认后再处理下一项具体问题。',
    caution:'这里的“需要修复”只描述沟通流程需要更多澄清，不代表现实关系一定冲突、分手或不适合。'
  }
});

function contextAction(contextId){
  const map={
    CTX_NONE:null,
    CTX_SINGLE:'即使目前没有固定关系，也可以从家人、朋友与长期合作关系观察：你在什么议题上会直接表达、什么议题需要时间整理、什么情况下容易出现理解落差。',
    CTX_PARTNERED:'在固定关系中，可把“我想表达什么”“我希望对方先听什么”“最后需要共同决定什么”分开，减少一次对话承担太多任务。',
    CTX_FAMILY_OR_CLOSE_RELATION:'面对家人或长期亲近关系时，熟悉感不代表彼此会自动理解；重要事项仍值得说完整，并确认对方实际听到的意思。',
    CTX_EXPRESSION_CONCERN:'若最在意自己是否表达清楚，可先减少一次对话中的议题数量，并用具体事实、感受与请求代替含糊暗示。',
    CTX_RESPONSE_CONCERN:'若最在意回应速度或理解落差，可以明确区分“我听到了”“我理解了”“我同意了”三件不同的事。',
    CTX_MISUNDERSTANDING:'若反复出现误解，优先增加复述与确认步骤，不要只重复同一句话或不断提高表达强度。',
    CTX_CONFLICT_TENSION:'若现实中已有明显冲突，先降低一次对话要解决的问题数量；若涉及控制、威胁、暴力、强迫或安全问题，应优先寻求现实支持，而不是用八字解释对方行为。'
  };
  return map[contextId] ?? null;
}

export function renderRelationshipCommunicationAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!RELATIONSHIP_COMMUNICATION_STATES.includes(state)) throw new Error(`Unknown RELATIONSHIP_COMMUNICATION state: ${state}`);
  normalizeContext(contextId);
  const copy=COPY[state];
  const modifiers=evidence.filter(x=>x.role!=='PRIMARY').map(x=>x.plainMeaning).slice(0,2);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    actions:[contextAction(contextId),copy.action,'现实沟通仍要以双方实际表达、理解、同意与安全为准；命盘只能帮助整理沟通习惯，不能替任何一方定义事实或决定关系结果。'].filter(Boolean).slice(0,3),
    caution:copy.caution,
    why:evidence.filter(x=>x.role==='PRIMARY').slice(0,4).map(x=>x.plainMeaning),
    modifiers,
    deepAwareness:'这道题描述的是你较自然的表达、回应与协调节奏，不是在判断某个对象是不是正缘、双方匹配度高不高，或关系会不会发生某个事件。',
    realityBoundary:'现实沟通是否有效，要由双方真实理解、可执行协商、尊重与安全来验证；若存在控制、威胁、暴力或强迫，应优先处理现实安全并寻求可信支持，而不是用八字合理化。',
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

export function buildRelationshipCommunicationSynthesis({chart,contextId='CTX_NONE',gender=null,relationshipReadingPreference='UNSPECIFIED'}={}){
  if(!chart) throw new Error('chart is required');
  const context=normalizeContext(contextId);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const primary=b1b2Evidence(strength,pattern);
  const modifiers=relationModifier(strength);
  const supporting=supportingNuance(pattern);
  const evidence=[...primary,...modifiers,...supporting];
  const resolution=resolveRelationshipCommunicationState(evidence);
  const answer=renderRelationshipCommunicationAnswer(resolution.state,contextId,evidence);
  return {
    version:RELATIONSHIP_COMMUNICATION_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:RELATIONSHIP_COMMUNICATION_QUESTION,
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
