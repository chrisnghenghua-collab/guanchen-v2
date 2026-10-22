import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';
import { resolveTimingRelations } from '../../src/timingRelationResolutionEngine.mjs';

export const CAREER_NEW_OPPORTUNITY_VERSION = 'GUANCHENG_CAREER_NEW_OPPORTUNITY_PROTO_V2_STEP02_F2';

export const CAREER_NEW_OPPORTUNITY_QUESTION = Object.freeze({
  questionId:'CAREER_NEW_OPPORTUNITY',
  domain:'CAREER',
  userText:'这个新工作机会怎么样？',
  intent:'EVALUATE_SPECIFIC_JOB_OPPORTUNITY',
  timeHorizon:'CURRENT_OPPORTUNITY_DECISION',
  evidenceRecipeId:'RECIPE_CAREER_NEW_OPPORTUNITY_V1',
  contextRequired:true,
  contextModel:'STAGE_PLUS_STRUCTURED_FACTS',
  timingRequired:['DAYUN','YEAR'],
  outputTemplate:'OPPORTUNITY_SYNTHESIS_V1'
});

export const OPPORTUNITY_STAGES = Object.freeze({
  EARLY_CONTACT:'刚接触 / 还在了解',
  INTERVIEWING:'正在面试',
  OFFER_RECEIVED:'已经收到 Offer',
  INTERNAL_TRANSFER:'内部转岗 / 升迁机会'
});

export const OPPORTUNITY_FACTS = Object.freeze({
  ROLE_UPGRADE:'职责或职位明显升级',
  PAY_UPGRADE:'薪资或整体回报明显改善',
  LEARNING_UPGRADE:'学习与成长空间明显增加',
  RESOURCE_UPGRADE:'团队、资源或平台条件更好',
  STABILITY_CLEAR:'组织与岗位稳定性较清楚',
  ROLE_UNCLEAR:'职责边界仍不清楚',
  PAY_UNCLEAR:'薪资或回报条件仍不清楚',
  HIGHER_PRESSURE:'压力或责任明显增加',
  STABILITY_CONCERN:'组织或岗位稳定性存在疑问',
  LOCATION_CHANGE:'需要明显地点 / 通勤变化',
  INDUSTRY_CHANGE:'需要跨行业或大幅转换专业环境'
});

export const OPPORTUNITY_TIMING_STATES = Object.freeze([
  'TIMING_NEUTRAL',
  'TIMING_SUPPORTIVE',
  'TIMING_STRONGLY_SUPPORTIVE',
  'TIMING_MIXED',
  'TIMING_HIGH_FRICTION'
]);

export const CAREER_NEW_OPPORTUNITY_STATES = Object.freeze([
  'VERIFY_FIRST',
  'PROMISING_COMPARE',
  'GOOD_IF_TERMS_FIT',
  'STRONG_UPGRADE_WINDOW',
  'CAUTION_OR_PAUSE'
]);

const POSITIVE_FACTS = new Set(['ROLE_UPGRADE','PAY_UPGRADE','LEARNING_UPGRADE','RESOURCE_UPGRADE','STABILITY_CLEAR']);
const MATERIAL_UPGRADE_FACTS = new Set(['ROLE_UPGRADE','PAY_UPGRADE','LEARNING_UPGRADE','RESOURCE_UPGRADE']);
const MAJOR_RISK_FACTS = new Set(['ROLE_UNCLEAR','STABILITY_CONCERN']);
const RISK_FACTS = new Set(['ROLE_UNCLEAR','PAY_UNCLEAR','HIGHER_PRESSURE','STABILITY_CONCERN']);
const MAGNITUDE_ORDER = {LOW:1,MODERATE:2,HIGH:3};

function assertTiming(timing) {
  if (!timing?.dayun || !timing?.year) {
    const e=new Error('CAREER_NEW_OPPORTUNITY requires active Dayun and Year from STEP 01 Core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}

function normalizeContext(context) {
  if (!context || !OPPORTUNITY_STAGES[context.stage]) {
    const e=new Error('CAREER_NEW_OPPORTUNITY requires a valid structured opportunity stage');
    e.code='INVALID_OPPORTUNITY_STAGE';
    throw e;
  }
  const facts=[...new Set(context.facts ?? [])];
  for (const fact of facts) {
    if (!OPPORTUNITY_FACTS[fact]) {
      const e=new Error(`Unknown opportunity fact: ${fact}`);
      e.code='INVALID_OPPORTUNITY_FACT';
      throw e;
    }
  }
  return {stage:context.stage,facts};
}

function finding({id,role,category,sourceType,sourceKey,polarity='NEUTRAL',magnitude='LOW',timingScope='NATAL',certainty='CONFIRMED',tags=[],plainMeaning,technicalBasis=[]}) {
  if (!['PRIMARY','SECONDARY','TIMING','MODIFIER'].includes(role)) throw new Error(`Invalid role: ${role}`);
  if (!['STRUCTURAL','RELATIONAL','TIMING','MODIFIER','SUPPORTING'].includes(category)) throw new Error(`Invalid category: ${category}`);
  if (!['SUPPORTIVE','CHALLENGING','MIXED','NEUTRAL'].includes(polarity)) throw new Error(`Invalid polarity: ${polarity}`);
  if (!MAGNITUDE_ORDER[magnitude]) throw new Error(`Invalid magnitude: ${magnitude}`);
  return {id,role,category,sourceType,sourceKey,domainTags:['CAREER'],polarity,magnitude,timingScope,certainty,tags:[...new Set(tags)],plainMeaning,technicalBasis};
}

function natalEvidence(strength,pattern) {
  const stage=pattern.stage;
  const supportive=['FORMED','RESCUED'].includes(stage);
  const challenging=stage==='BROKEN';
  return [
    finding({
      id:'OPPORTUNITY_NATAL_STRUCTURE',role:'PRIMARY',category:'STRUCTURAL',sourceType:'PATTERN_RESOLUTION',
      sourceKey:pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE',
      polarity:supportive?'SUPPORTIVE':challenging?'CHALLENGING':'NEUTRAL',
      magnitude:supportive||challenging?'MODERATE':'LOW',
      tags:['BASELINE','CAREER_STRUCTURE'],
      plainMeaning:'原局结构说明长期职业承载方式，但不能单独证明眼前这个机会本身优质。',
      technicalBasis:[`StructureKey=${pattern.baseStructure?.key ?? 'NONE'}`,`PatternStage=${stage}`]
    }),
    finding({
      id:'OPPORTUNITY_NATAL_STRENGTH',role:'SECONDARY',category:'STRUCTURAL',sourceType:'STRENGTH',
      sourceKey:strength.strengthBand,polarity:'NEUTRAL',magnitude:'LOW',tags:['BASELINE','CAPACITY'],
      plainMeaning:'日主强弱只用于理解承压、适应与资源需求，不直接等于该 Offer 好或不好。',
      technicalBasis:[`StrengthBand=${strength.strengthBand}`]
    })
  ];
}

const FAMILY_META = {
  AUTHORITY:{polarity:'SUPPORTIVE',tags:['ROLE_GROWTH','RESPONSIBILITY'],plain:'职位、职责、规则或组织角色主题进入当前时运。'},
  RESOURCE:{polarity:'SUPPORTIVE',tags:['ADAPTATION_SUPPORT','LEARNING'],plain:'学习、资历、支持与适应新体系的条件增强。'},
  WEALTH:{polarity:'SUPPORTIVE',tags:['MATERIAL_SUPPORT','COMPENSATION'],plain:'收入、资源或现实回报主题进入当前时运。'},
  OUTPUT:{polarity:'MIXED',tags:['MOBILITY','AGENCY'],plain:'表达、输出、谈判与主动改变的力量增强。'},
  PEER:{polarity:'MIXED',tags:['COMPETITION','AGENCY'],plain:'自主性、同侪竞争或自我主张主题增强。'}
};

function timingLayerEvidence(activation) {
  const out=[];
  for (const layer of activation.layers) {
    const m=FAMILY_META[layer.stemFamily] ?? {polarity:'NEUTRAL',tags:[],plain:'新的时运主题进入。'};
    out.push(finding({
      id:`OPPORTUNITY_${layer.layer}_VISIBLE_${layer.stemGod}`,role:'TIMING',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.stemGod}_VISIBLE_ENTERED`,polarity:m.polarity,magnitude:'MODERATE',timingScope:layer.layer,
      tags:m.tags,plainMeaning:m.plain,
      technicalBasis:[`${layer.layer}=${layer.pillar}`,`VisibleTenGod=${layer.stemGod}`]
    }));
  }
  return out;
}

function patternActivationEvidence(activation) {
  return activation.patternActivation.map((x,i)=>{
    let polarity='MIXED',magnitude='MODERATE',tags=['CAREER_STRUCTURE_ACTIVATED'];
    if (x.classification==='PATTERN_SUPPORT_CANDIDATE') {polarity='SUPPORTIVE';magnitude='HIGH';tags.push('OPPORTUNITY_SUPPORT');}
    if (x.classification==='PATTERN_ROUTE_CANDIDATE') {polarity='SUPPORTIVE';magnitude='MODERATE';tags.push('ROLE_GROWTH','OPPORTUNITY_SUPPORT');}
    if (x.classification==='PATTERN_PRESSURE_CANDIDATE') {polarity='CHALLENGING';magnitude='HIGH';tags.push('FRICTION','PRESSURE');}
    if (x.classification==='PATTERN_COMPLEXITY_REVIEW') {polarity='MIXED';magnitude='MODERATE';tags.push('FRICTION','REVIEW');}
    return finding({
      id:`OPPORTUNITY_PATTERN_${i}_${x.key}`,role:'PRIMARY',category:'TIMING',sourceType:'PATTERN_ACTIVATION',
      sourceKey:x.key,polarity,magnitude,timingScope:x.layer,certainty:'CONDITIONAL',tags,
      plainMeaning:polarity==='SUPPORTIVE'?'当前时运对原局事业结构形成可利用的承接或发展路线。':polarity==='CHALLENGING'?'当前时运对原局事业结构形成明显压力，不能把压力直接当作好机会。':'当前时运让事业结构更复杂，需要结合现实 Offer 条件判断。',
      technicalBasis:[`Layer=${x.layer}`,`Activation=${x.key}`,`Class=${x.classification}`]
    });
  });
}

function relationEvidence(timingResolution) {
  const out=[];let seq=0;
  for (const c of timingResolution.clashes.filter(x=>x.originLayer!=='NATAL')) {
    if (c.status==='ACTIVE') out.push(finding({
      id:`OPPORTUNITY_REL_${seq++}_CLASH`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_CLASH',
      polarity:'MIXED',magnitude:'HIGH',timingScope:c.originLayer,tags:['MOBILITY','ENVIRONMENT_SHIFT'],
      plainMeaning:'当前时运存在明显环境或职责调整信号，适合把“变化”与“机会质量”分开判断。',
      technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`,`Reason=${c.reason}`]
    }));
    else if (c.status==='MEDIATED_CONFIRMED') out.push(finding({
      id:`OPPORTUNITY_REL_${seq++}_CLASH_MEDIATED`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MEDIATED_CLASH',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,tags:['MOBILITY','MEDIATED'],
      plainMeaning:'变化信号存在，但同时受到其它关系牵制，不宜理解为必须立即转换。',
      technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`,`Reason=${c.reason}`]
    }));
    else if (String(c.status).includes('REVIEW')) out.push(finding({
      id:`OPPORTUNITY_REL_${seq++}_CLASH_REVIEW`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MULTI_RELATION_REVIEW',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,certainty:'CONDITIONAL',tags:['MOBILITY','REVIEW'],
      plainMeaning:'变化关系与其它合会结构重叠，只能视为复杂的环境变动信号。',
      technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`,`Reason=${c.reason}`]
    }));
  }
  for (const p of timingResolution.punishments.filter(x=>x.originLayer!=='NATAL')) {
    if (['ACTIVE','ACTIVE_COMPLETE'].includes(p.status)) out.push(finding({
      id:`OPPORTUNITY_REL_${seq++}_PUNISHMENT`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_PUNISHMENT',
      polarity:'CHALLENGING',magnitude:p.status==='ACTIVE_COMPLETE'?'HIGH':'MODERATE',timingScope:p.originLayer,tags:['FRICTION','PRESSURE'],
      plainMeaning:'当前时运的摩擦或压力较明显，评估新机会时需要特别核对职责与承压条件。',
      technicalBasis:[`Origin=${p.originLayer}`,`Status=${p.status}`,`Reason=${p.reason}`]
    }));
  }
  for (const a of timingResolution.assemblies.filter(x=>x.originLayer!=='NATAL')) {
    if (['FORMATION_COMPLETED_BY_TIMING','FORMATION_CONFIRMED'].includes(a.status)) out.push(finding({
      id:`OPPORTUNITY_REL_${seq++}_ASSEMBLY`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_ASSEMBLY',sourceKey:a.type,
      polarity:'MIXED',magnitude:'MODERATE',timingScope:a.originLayer,tags:['MOBILITY','ENVIRONMENT_RECONFIGURATION'],
      plainMeaning:'当前时运补全新的组合结构，环境与资源配置更容易出现重新组合。',
      technicalBasis:[`Origin=${a.originLayer}`,`Status=${a.status}`]
    }));
  }
  return out;
}

function independentSources(items,tag,polarity=null) {
  const src=new Set(items.filter(x=>x.tags.includes(tag) && (!polarity || x.polarity===polarity)).map(x=>x.sourceType));
  return src.size;
}

function band(items,tag,{supportiveOnly=false}={}) {
  const xs=items.filter(x=>x.tags.includes(tag) && (!supportiveOnly || x.polarity==='SUPPORTIVE'));
  const high=xs.some(x=>x.magnitude==='HIGH');
  const independent=independentSources(xs,tag,supportiveOnly?'SUPPORTIVE':null);
  if (high || independent>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveOpportunityTimingState(evidence) {
  const supportTags=['OPPORTUNITY_SUPPORT','ROLE_GROWTH','ADAPTATION_SUPPORT','MATERIAL_SUPPORT'];
  const supportEvidence=evidence.filter(x=>supportTags.some(t=>x.tags.includes(t)) && x.polarity==='SUPPORTIVE');
  const mobilityEvidence=evidence.filter(x=>x.tags.includes('MOBILITY'));
  const frictionEvidence=evidence.filter(x=>x.tags.includes('FRICTION') || x.tags.includes('PRESSURE'));
  const supportStrong=supportEvidence.some(x=>x.magnitude==='HIGH') || new Set(supportEvidence.map(x=>x.sourceType)).size>=2;
  const supportPresent=supportEvidence.length>0;
  const mobilityStrong=mobilityEvidence.some(x=>x.magnitude==='HIGH') || new Set(mobilityEvidence.map(x=>x.sourceType)).size>=2;
  const mobilityPresent=mobilityEvidence.length>0;
  const frictionStrong=frictionEvidence.some(x=>x.magnitude==='HIGH') || new Set(frictionEvidence.map(x=>x.sourceType)).size>=2;
  const frictionPresent=frictionEvidence.length>0;

  let state='TIMING_NEUTRAL';
  if (frictionStrong && !supportStrong) state='TIMING_HIGH_FRICTION';
  else if (supportStrong && mobilityStrong && !frictionStrong) state='TIMING_STRONGLY_SUPPORTIVE';
  else if (supportStrong && !frictionStrong) state='TIMING_SUPPORTIVE';
  else if (supportPresent || mobilityPresent || frictionPresent) state='TIMING_MIXED';

  return {
    state,
    corroboration:{
      support:supportStrong?'STRONG':supportPresent?'PRESENT':'NONE',
      mobility:mobilityStrong?'STRONG':mobilityPresent?'PRESENT':'NONE',
      friction:frictionStrong?'STRONG':frictionPresent?'PRESENT':'NONE'
    },
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

export function assessOpportunityContext(contextInput) {
  const context=normalizeContext(contextInput);
  const facts=new Set(context.facts);
  const hasPositive=context.facts.some(x=>POSITIVE_FACTS.has(x));
  const hasMaterialUpgrade=context.facts.some(x=>MATERIAL_UPGRADE_FACTS.has(x));
  const hasMajorRisk=context.facts.some(x=>MAJOR_RISK_FACTS.has(x));
  const hasRisk=context.facts.some(x=>RISK_FACTS.has(x));
  const claritySupport=facts.has('STABILITY_CLEAR');

  let quality='UNCLEAR';
  if (hasMajorRisk && !hasMaterialUpgrade) quality='RISK_HEAVY';
  else if (hasMajorRisk && hasMaterialUpgrade) quality='MIXED_RISK';
  else if (hasMaterialUpgrade && claritySupport) quality='UPGRADE_CLEAR';
  else if (hasPositive) quality='UPGRADE_PARTIAL';
  else if (hasRisk) quality='RISK_HEAVY';

  return {
    ...context,
    quality,
    hasPositive,
    hasRisk,
    hasMajorRisk,
    rewritesBaZiEvidence:false,
    stageLabel:OPPORTUNITY_STAGES[context.stage]
  };
}

export function resolveCareerNewOpportunityState(timingAssessment,contextAssessment) {
  const t=timingAssessment.state;
  const q=contextAssessment.quality;
  let state='VERIFY_FIRST';

  if (q==='RISK_HEAVY') state='CAUTION_OR_PAUSE';
  else if (t==='TIMING_HIGH_FRICTION' && q!=='UPGRADE_CLEAR') state='CAUTION_OR_PAUSE';
  else if (t==='TIMING_STRONGLY_SUPPORTIVE' && q==='UPGRADE_CLEAR') state='STRONG_UPGRADE_WINDOW';
  else if (['TIMING_SUPPORTIVE','TIMING_STRONGLY_SUPPORTIVE'].includes(t) && q==='UPGRADE_CLEAR') state='GOOD_IF_TERMS_FIT';
  else if (q==='MIXED_RISK') state='PROMISING_COMPARE';
  else if (['UPGRADE_PARTIAL','UPGRADE_CLEAR'].includes(q) || ['TIMING_SUPPORTIVE','TIMING_STRONGLY_SUPPORTIVE'].includes(t)) state='PROMISING_COMPARE';
  else if (t==='TIMING_HIGH_FRICTION') state='CAUTION_OR_PAUSE';

  return {
    state,
    timingState:t,
    contextQuality:q,
    contextChangedBaZiEvidence:false,
    numericScoreUsed:false,
    percentConfidenceUsed:false
  };
}

const STATE_COPY = Object.freeze({
  VERIFY_FIRST:{
    direct:'这个机会现在还不适合急着下结论，先把职责、回报与稳定性核实清楚。',
    caution:'资料不清楚时，命盘时机不能替代现实尽调。'
  },
  PROMISING_COMPARE:{
    direct:'这个机会值得继续谈，但目前更适合比较条件，而不是马上答应。',
    caution:'有发展可能不等于条件已经成熟，先确认它真正改善了什么。'
  },
  GOOD_IF_TERMS_FIT:{
    direct:'这个机会可以认真考虑，如果职责、回报与稳定性谈得合适，具备接受价值。',
    caution:'关键是条款和实际工作内容要兑现，不要只看职位名称。'
  },
  STRONG_UPGRADE_WINDOW:{
    direct:'这个机会与当前时机的配合度较好，如果现实条件确实升级，可以积极推进。',
    caution:'时机支持不等于免除现实核对，合同、职责、资源与稳定性仍要确认。'
  },
  CAUTION_OR_PAUSE:{
    direct:'这个机会目前需要谨慎，先不要因为想改变或外部压力就快速承诺。',
    caution:'如果职责或稳定性仍有明显疑问，宁可继续谈清楚，也不要用换环境来替代风险判断。'
  }
});

function stageActions(stage,state) {
  const base={
    EARLY_CONTACT:['先拿到完整岗位说明与汇报关系','确认薪资区间、工作地点与团队情况','再决定是否投入更多面试时间'],
    INTERVIEWING:['利用面试反向确认职责与成功标准','核对团队资源、直属上级与试用期要求','不要只凭面试氛围判断机会质量'],
    OFFER_RECEIVED:['把 Offer 条款、职责与现职逐项比较','把尚未写清楚的条件在接受前确认','预留谈判与决定时间，不必当天答复'],
    INTERNAL_TRANSFER:['确认转岗后的职责、资源与考核标准','比较内部机会是否真的提升成长空间','确认原团队交接与新岗位承接']
  }[stage].slice();
  if (state==='CAUTION_OR_PAUSE') base[0]='优先把职责、稳定性与风险项问清楚，再决定是否继续。';
  if (state==='STRONG_UPGRADE_WINDOW') base[0]='如果现实条件已经明确升级，可以积极推进谈判与落地。';
  return base.slice(0,3);
}

export function renderCareerNewOpportunityAnswer(resolution,contextAssessment,evidence=[]) {
  const copy=STATE_COPY[resolution.state];
  const why=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER').slice().sort((a,b)=>MAGNITUDE_ORDER[b.magnitude]-MAGNITUDE_ORDER[a.magnitude]).slice(0,4).map(x=>x.plainMeaning);
  return {
    directAnswer:copy.direct,
    opportunityQualityBoundary:'命盘只能判断当前时机与结构承接，不能替代对具体公司、职位、薪资、合同和稳定性的现实核查。',
    timingState:resolution.timingState,
    realWorldQuality:contextAssessment.quality,
    actions:stageActions(contextAssessment.stage,resolution.state),
    caution:copy.caution,
    why,
    technicalBasis:evidence.filter(x=>x.magnitude!=='LOW').slice(0,8).flatMap(x=>(x.technicalBasis ?? []).map(b=>`${x.sourceKey}: ${b}`)),
    deepAwareness:'真正值得比较的不是“新”与“旧”，而是这个机会是否让职责、成长、资源、回报或生活结构出现实质改善。',
    certaintyLanguage:'NON_DETERMINISTIC'
  };
}

export function buildCareerNewOpportunityEvidence(chart,timing) {
  assertTiming(timing);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const timingResolution=resolveTimingRelations(chart,timing);
  const evidence=[
    ...natalEvidence(strength,pattern),
    ...timingLayerEvidence(timingResolution.activation),
    ...patternActivationEvidence(timingResolution.activation),
    ...relationEvidence(timingResolution)
  ];
  return {
    version:CAREER_NEW_OPPORTUNITY_VERSION,
    questionId:CAREER_NEW_OPPORTUNITY_QUESTION.questionId,
    evidence,
    primary:evidence.filter(x=>x.role==='PRIMARY'),
    secondary:evidence.filter(x=>x.role==='SECONDARY'),
    timing:evidence.filter(x=>x.role==='TIMING'),
    modifiers:evidence.filter(x=>x.role==='MODIFIER'),
    sourceSnapshot:{
      strengthBand:strength.strengthBand,
      structureKey:pattern.baseStructure?.key ?? null,
      patternStage:pattern.stage,
      timingVersion:timingResolution.version,
      natalStrengthRewritten:timingResolution.natalInvariant.natalStrengthRewritten,
      natalStructureRewritten:timingResolution.natalInvariant.natalStructureRewritten
    }
  };
}

export function synthesizeCareerNewOpportunity(chart,timing,contextInput) {
  const context=assessOpportunityContext(contextInput);
  const built=buildCareerNewOpportunityEvidence(chart,timing);
  const timingAssessment=resolveOpportunityTimingState(built.evidence);
  const resolution=resolveCareerNewOpportunityState(timingAssessment,context);
  const answer=renderCareerNewOpportunityAnswer(resolution,context,built.evidence);
  return {
    version:CAREER_NEW_OPPORTUNITY_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:CAREER_NEW_OPPORTUNITY_QUESTION,
    context,
    evidenceStack:built,
    timingAssessment,
    synthesis:resolution,
    answer,
    trace:[
      `QUESTION=${CAREER_NEW_OPPORTUNITY_QUESTION.questionId}`,
      `STRUCTURE=${built.sourceSnapshot.structureKey}`,
      `PATTERN_STAGE=${built.sourceSnapshot.patternStage}`,
      `STRENGTH=${built.sourceSnapshot.strengthBand}`,
      `TIMING_STATE=${timingAssessment.state}`,
      `CONTEXT_QUALITY=${context.quality}`,
      `STATE=${resolution.state}`,
      'CONTEXT_REWRITES_BAZI_EVIDENCE=NO',
      'SPECIFIC_JOB_QUALITY_FROM_BAZI=NO',
      'NUMERIC_SCORE=NO',
      'PERCENT_CONFIDENCE=NO'
    ]
  };
}
