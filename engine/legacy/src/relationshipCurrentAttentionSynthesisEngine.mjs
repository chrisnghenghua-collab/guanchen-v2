import { assessTimingActivation } from '../../src/timingActivationEngine.mjs';
import { buildRelationshipBoundariesSynthesis } from './relationshipBoundariesSynthesisEngine.mjs';
import { buildRelationshipCommunicationSynthesis } from './relationshipCommunicationSynthesisEngine.mjs';
import { buildRelationshipSupportCareSynthesis } from './relationshipSupportCareSynthesisEngine.mjs';

export const RELATIONSHIP_CURRENT_ATTENTION_VERSION='GUANCHEN_RELATIONSHIP_CURRENT_ATTENTION_PROTO_V1_STEP03_REL4_A1';

export const RELATIONSHIP_CURRENT_ATTENTION_QUESTION=Object.freeze({
  questionId:'RELATIONSHIP_CURRENT_ATTENTION',
  domain:'RELATIONSHIP',
  userText:'最近关系互动更需要留意哪些议题？',
  intent:'ATTACH_CURRENT_DAYUN_ANNUAL_ATTENTION_TO_EXISTING_RELATIONSHIP_NATAL_CLAIMS',
  classification:'TIMING_CURRENT_ATTENTION',
  primaryTopics:Object.freeze(['RelationshipNeedsAndBoundaries','RelationshipInteractionPattern']),
  primarySemantics:Object.freeze(['Existing Natal Relationship claim only']),
  behaviorTarget:'ContextualReflection',
  evidenceRecipeId:'RECIPE_RELATIONSHIP_CURRENT_ATTENTION_V1',
  spouseStarV1Policy:'EXCLUDED',
  timingRequired:Object.freeze(['ACTIVE_DAYUN_OR_ANNUAL_FROM_STEP01_CORE']),
  monthTimingAdapterRequired:false,
  outputTemplate:'RELATIONSHIP_CURRENT_ATTENTION_SYNTHESIS_V1'
});

export const RELATIONSHIP_CURRENT_ATTENTION_STATES=Object.freeze([
  'DAYUN_ONLY_CURRENT_ATTENTION',
  'ANNUAL_ONLY_CURRENT_ATTENTION',
  'PARALLEL_DAYUN_ANNUAL_ATTENTION',
  'SHARED_CROSS_TEMPORAL_ATTENTION',
  'MIXED_SHARED_PARALLEL_ATTENTION'
]);

export const RELATIONSHIP_CURRENT_ATTENTION_CONTEXTS=Object.freeze({
  CTX_NONE:{label:'不补充现实关系情境'},
  CTX_SINGLE:{label:'目前没有固定伴侣／关系对象'},
  CTX_PARTNERED:{label:'目前处于固定关系中'},
  CTX_FAMILY_OR_CLOSE_RELATION:{label:'主要想理解家人或长期亲近关系'},
  CTX_BOUNDARY_CONCERN:{label:'现实中较在意空间、责任或边界协调'},
  CTX_COMMUNICATION_CONCERN:{label:'现实中较在意表达、回应或误解'},
  CTX_SUPPORT_CONCERN:{label:'现实中较在意照料、支持或责任负荷'},
  CTX_MIXED_INTERACTION_CONCERN:{label:'现实中有多个关系议题同时需要整理'}
});

// 07-B2/B6 frozen neutral relationship interaction functions.
const FAMILY_TO_SEMANTIC=Object.freeze({
  AUTHORITY:'ResponsibilityBoundaryRuleInteraction',
  OUTPUT:'ExpressionResponseInteraction',
  RESOURCE:'SupportReceptionInteraction',
  WEALTH:'PracticalInvestmentCareInteraction',
  PEER:'AutonomyEqualityCoordinationInteraction'
});

const FAMILY_LABEL=Object.freeze({
  AUTHORITY:'责任／规则',
  OUTPUT:'表达／回应',
  RESOURCE:'支持接收',
  WEALTH:'实际照料／投入',
  PEER:'自主／平等协调'
});

const SEMANTIC_OBSERVATION=Object.freeze({
  ResponsibilityBoundaryRuleInteraction:'观察责任、规则、承诺与分工是否说清楚，并区分哪些是共同责任、哪些需要各自承担。',
  ExpressionResponseInteraction:'观察表达、回应、复述与澄清是否顺畅，尤其留意“以为对方知道”与“实际已经说清”的差别。',
  SupportReceptionInteraction:'观察自己是否能提出需要、接受支持，并确认帮助的方式是否真的适合当前关系。',
  PracticalInvestmentCareInteraction:'观察时间、行动、照料与承诺是否可持续；这里的“投入”只指实际照料与行动，不是金融投资。',
  AutonomyEqualityCoordinationInteraction:'观察彼此空间、决定权与协商方式是否清楚，避免把熟悉感当成默认同意。'
});

const CLAIM_ORDER=Object.freeze([
  'RELATIONSHIP_BOUNDARIES',
  'RELATIONSHIP_COMMUNICATION',
  'RELATIONSHIP_SUPPORT_CARE'
]);

function normalizeContext(contextId='CTX_NONE'){
  const found=RELATIONSHIP_CURRENT_ATTENTION_CONTEXTS[contextId];
  if(!found){
    const e=new Error(`Unknown RELATIONSHIP_CURRENT_ATTENTION context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:found.label,rewritesEvidence:false,rewritesState:false};
}

function requireTiming(timing={}){
  if(!timing || (!timing.dayun && !timing.year)){
    const e=new Error('RELATIONSHIP_CURRENT_ATTENTION requires active Dayun and/or Annual pillar resolved by STEP01 core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}

function buildExistingNatalClaims(chart){
  const rel1=buildRelationshipBoundariesSynthesis({chart,contextId:'CTX_NONE'});
  const rel2=buildRelationshipCommunicationSynthesis({chart,contextId:'CTX_NONE'});
  const rel3=buildRelationshipSupportCareSynthesis({chart,contextId:'CTX_NONE'});
  const pack=(r,source)=>({
    questionId:r.question.questionId,userText:r.question.userText,primarySemantics:[...r.question.primarySemantics],
    natalState:r.resolution.state,sourceVersion:r.version,source,
    b3Modifiers:r.evidence.filter(x=>x.role==='MODIFIER').map(x=>({id:x.id,bridge:x.bridge,sourceKey:x.sourceKey,plainMeaning:x.plainMeaning})),
    b4Supporting:r.evidence.filter(x=>x.role==='SUPPORTING').map(x=>({id:x.id,bridge:x.bridge,sourceKey:x.sourceKey,plainMeaning:x.plainMeaning}))
  });
  return [
    pack(rel1,'REL1_FINAL_FROZEN_RECIPE'),
    pack(rel2,'REL2_FINAL_FROZEN_RECIPE'),
    pack(rel3,'REL3_FINAL_FROZEN_RECIPE')
  ];
}

function layerFamilies(layer){
  const raw=[
    {component:'VISIBLE_STEM',family:layer.stemFamily,god:layer.stemGod},
    {component:'BRANCH_MAIN',family:layer.branchMainFamily,god:layer.branchMainGod}
  ].filter(x=>FAMILY_TO_SEMANTIC[x.family]);
  const order=[];
  const byFamily=new Map();
  for(const x of raw){
    if(!byFamily.has(x.family)){
      order.push(x.family);
      byFamily.set(x.family,{family:x.family,semantic:FAMILY_TO_SEMANTIC[x.family],components:[],gods:[]});
    }
    const row=byFamily.get(x.family);
    row.components.push(x.component);
    row.gods.push(x.god);
  }
  return order.map(f=>byFamily.get(f));
}

function claimTargetsForSemantic(natalClaims,semantic){
  return CLAIM_ORDER.flatMap(questionId=>{
    const claim=natalClaims.find(x=>x.questionId===questionId);
    return claim && claim.primarySemantics.includes(semantic) ? [claim] : [];
  });
}

function buildCurrentAttentionAttachments(activation,natalClaims){
  const rows=[];
  for(const layer of activation.layers){
    for(const familyInfo of layerFamilies(layer)){
      const targets=claimTargetsForSemantic(natalClaims,familyInfo.semantic);
      for(const claim of targets){
        rows.push({
          id:`REL_CURRENT_B5_${layer.layer}_${familyInfo.family}_${claim.questionId}`,
          role:'CURRENT_ATTENTION',
          bridge:'B5_CURRENT_ATTENTION_ONLY',
          domain:'RELATIONSHIP',
          timingLayer:layer.layer,
          timingPillar:layer.pillar,
          groupFamily:familyInfo.family,
          familyLabel:FAMILY_LABEL[familyInfo.family],
          semantic:familyInfo.semantic,
          sourceComponents:[...familyInfo.components],
          sourceGods:[...familyInfo.gods],
          targetQuestionId:claim.questionId,
          targetNatalState:claim.natalState,
          targetKey:`${claim.questionId}:${familyInfo.semantic}`,
          priority:'SUPPORTING',
          polarity:'NEUTRAL',
          direction:'OBSERVE',
          raisesAttentionOnly:true,
          createsNatalClaim:false,
          rewritesNatalState:false,
          eventPrediction:false,
          probabilityMeaning:false,
          rankMeaning:false,
          plainMeaning:`${layer.layer==='DAYUN'?'当前大运':'当前流年'}的 ${FAMILY_LABEL[familyInfo.family]} 主题只把既有的「${claim.userText}」相关内容带入当前观察范围，不改变原本关系 State，也不代表某件关系事件会发生。`,
          observationPrompt:SEMANTIC_OBSERVATION[familyInfo.semantic]
        });
      }
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

export function resolveRelationshipCurrentAttentionState(attachments){
  const hasDayun=attachments.some(x=>x.timingLayer==='DAYUN');
  const hasYear=attachments.some(x=>x.timingLayer==='YEAR');
  const targetMap=targetSourceMap(attachments);
  const shared=[...targetMap.values()].filter(s=>s.has('DAYUN')&&s.has('YEAR')).length;
  const single=[...targetMap.values()].filter(s=>s.size===1).length;

  let state;
  if(hasDayun && !hasYear) state='DAYUN_ONLY_CURRENT_ATTENTION';
  else if(!hasDayun && hasYear) state='ANNUAL_ONLY_CURRENT_ATTENTION';
  else if(hasDayun && hasYear && shared===0) state='PARALLEL_DAYUN_ANNUAL_ATTENTION';
  else if(hasDayun && hasYear && shared>0 && single===0) state='SHARED_CROSS_TEMPORAL_ATTENTION';
  else state='MIXED_SHARED_PARALLEL_ATTENTION';

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
    multipleSourcesMeanHigherProbability:false
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
        familyLabel:x.familyLabel,
        temporalSources:[],
        observationPrompt:x.observationPrompt,
        priority:'SUPPORTING',polarity:'NEUTRAL',direction:'OBSERVE',
        eventPrediction:false,rank:null,score:null,confidencePercent:null
      });
    }
    const row=map.get(x.targetKey);
    row.temporalSources.push({layer:x.timingLayer,pillar:x.timingPillar,groupFamily:x.groupFamily,sourceComponents:x.sourceComponents});
  }
  return order.map(k=>{
    const x=map.get(k);
    return {...x,sourceMultiplicity:x.temporalSources.length>1?'MULTIPLE':'SINGLE',multipleDoesNotMeanStronger:x.temporalSources.length>1};
  });
}

const STATE_COPY=Object.freeze({
  DAYUN_ONLY_CURRENT_ATTENTION:'目前可确认的是大运层带来的关系关注线索；它只提高既有关系主题的观察度，不建立新的关系结论。',
  ANNUAL_ONLY_CURRENT_ATTENTION:'目前可确认的是流年层带来的关系关注线索；即使缺少大运层，也可以保留合法的流年 CurrentAttention，但不能补造缺失的大运信息。',
  PARALLEL_DAYUN_ANNUAL_ATTENTION:'当前大运与流年分别把不同的既有关系主题带入观察范围；这些主题并列存在，不代表其中任何一个更重要或更可能发生事件。',
  SHARED_CROSS_TEMPORAL_ATTENTION:'当前大运与流年都关联到同一个既有关系主题；Multiple 只表示有两个 distinct temporal sources，不表示结论更强、概率更高或事件更接近。',
  MIXED_SHARED_PARALLEL_ATTENTION:'当前既有某些关系主题同时受到大运与流年关注，也有其他主题只来自单一时运层；应按原有顺序分别观察，不做 Top-N 或强弱排名。'
});

function contextReflection(contextId){
  const map={
    CTX_NONE:null,
    CTX_SINGLE:'即使目前没有固定伴侣，也可以把 CurrentAttention 用在家人、朋友或长期合作关系的互动观察上，不需要把它强行解释成恋爱事件。',
    CTX_PARTNERED:'在固定关系中，把当前关注点当成讨论清单而不是预测清单：哪些议题现实中确实出现，再处理哪些。',
    CTX_FAMILY_OR_CLOSE_RELATION:'面对家人或长期亲近关系时，可用这些关注点检查默认期待是否说清楚，但不要把熟悉关系等同于自动同意。',
    CTX_BOUNDARY_CONCERN:'若现实中正好有边界或责任议题，可对照相关 CurrentFocus 做观察；没有出现的现实问题不要因为命盘提示而补造。',
    CTX_COMMUNICATION_CONCERN:'若现实中正好有表达或误解议题，可优先核对实际对话内容；CurrentAttention 不能代替对方真实说过的话。',
    CTX_SUPPORT_CONCERN:'若现实中正好有照料或支持议题，可检查分工、请求与承接是否可持续；“投入”仍只指实际照料与行动，不是金融投资。',
    CTX_MIXED_INTERACTION_CONCERN:'若现实中确实有多个议题同时出现，可以逐项处理；CurrentFocus 数量不代表哪个议题更严重或更重要。'
  };
  return map[contextId] ?? null;
}

export function renderRelationshipCurrentAttentionAnswer(resolution,currentFocus,contextId='CTX_NONE'){
  normalizeContext(contextId);
  return {
    directAnswer:STATE_COPY[resolution.state],
    currentFocus,
    reflectionPrompts:[contextReflection(contextId),...currentFocus.map(x=>x.observationPrompt)].filter(Boolean),
    caution:'CurrentAttention 只表示“最近值得观察哪些既有关系主题”，不是结婚、分手、新恋情或其他关系事件的预测，也没有概率或时间点含义。',
    deepAwareness:'这里不会把大运与流年重新计算成第二套 Relationship Natal 结论；时运只能附着在已经成立的关系 claim 上，提高观察度。',
    realityBoundary:'现实关系仍以双方真实表达、同意、边界、责任与安全为准；若涉及控制、威胁、暴力或强迫，应优先处理现实安全并寻求可信支持。',
    topNUsed:false,rankingUsed:false,numericScoreUsed:false,percentConfidenceUsed:false,eventPredictionUsed:false
  };
}

export function buildRelationshipCurrentAttentionSynthesis({chart,timing={},contextId='CTX_NONE',gender=null,relationshipReadingPreference='UNSPECIFIED'}={}){
  if(!chart) throw new Error('chart is required');
  requireTiming(timing);
  const context=normalizeContext(contextId);
  const natalClaims=buildExistingNatalClaims(chart);
  const activation=assessTimingActivation(chart,timing);
  const attachments=buildCurrentAttentionAttachments(activation,natalClaims);
  const resolution=resolveRelationshipCurrentAttentionState(attachments);
  const currentFocus=summarizeCurrentFocus(attachments);
  const answer=renderRelationshipCurrentAttentionAnswer(resolution,currentFocus,contextId);

  return {
    version:RELATIONSHIP_CURRENT_ATTENTION_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:RELATIONSHIP_CURRENT_ATTENTION_QUESTION,
    context,
    inputFraming:{genderProvided:gender!=null,relationshipReadingPreference:relationshipReadingPreference??'UNSPECIFIED',usedForEvidence:false},
    timingInput:{dayun:timing.dayun??null,year:timing.year??null,authority:'STEP01_CORE_RESOLVED_ACTIVE_DAYUN_ANNUAL'},
    natalClaims,
    timingActivation:{
      version:activation.version,
      authorityStatus:activation.authorityStatus,
      natalInvariant:activation.natalInvariant,
      layers:activation.layers.map(x=>({layer:x.layer,pillar:x.pillar,stemGod:x.stemGod,stemFamily:x.stemFamily,branchMainGod:x.branchMainGod,branchMainFamily:x.branchMainFamily})),
      natalRewritten:false
    },
    evidence:attachments,
    resolution,
    currentFocus,
    answer,
    policy:{
      spouseStarV1Policy:'EXCLUDED',
      b3Role:'MODIFIER_ONLY_FROM_EXISTING_NATAL_CLAIM',
      b4Role:'SUPPORTING_ONLY_FROM_EXISTING_NATAL_CLAIM',
      b5Role:'CURRENT_ATTENTION_ONLY',
      temporalCreatesNatalClaim:false,
      temporalRewritesNatalState:false,
      dayunAnnualComparisonCreatesClaim:false,
      monthTimingAdapterUsed:false,
      eventPredictionUsed:false,
      exactRelationshipEventDateUsed:false,
      currentAttentionProbabilityUsed:false,
      genderChangesEvidence:false,
      relationshipPreferenceChangesEvidence:false,
      topNUsed:false,
      claimCountVotingUsed:false
    },
    trace:[
      `NATAL_CLAIMS=${natalClaims.map(x=>`${x.questionId}:${x.natalState}`).join('|')}`,
      `TIMING_LAYERS=${activation.layers.map(x=>`${x.layer}:${x.pillar}`).join('|')}`,
      `B5_ATTACHMENTS=${attachments.map(x=>`${x.timingLayer}:${x.groupFamily}->${x.targetQuestionId}:${x.semantic}`).join('|')}`,
      `CURRENT_FOCUS=${currentFocus.map(x=>`${x.targetKey}:${x.sourceMultiplicity}`).join('|')}`,
      `STATE=${resolution.state}`,
      'B5_CURRENT_ATTENTION_ONLY=YES',
      'NATAL_REWRITE=NO',
      'MONTH_TIMING=NOT_USED',
      'EVENT_PREDICTION=NO',
      'RANKING=NO'
    ]
  };
}
