import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';
import { resolveTimingRelations } from '../../src/timingRelationResolutionEngine.mjs';

export const WEALTH_CURRENT_STATE_VERSION = 'GUANCHENG_WEALTH_CURRENT_STATE_PROTO_V1_STEP02_K1';

export const WEALTH_CURRENT_STATE_QUESTION = Object.freeze({
  questionId:'WEALTH_CURRENT_STATE',
  domain:'WEALTH',
  userText:'最近财运整体怎么样？',
  intent:'ASSESS_CURRENT_WEALTH_PHASE',
  timeHorizon:'CURRENT_TO_NEXT_6_MONTHS',
  evidenceRecipeId:'RECIPE_WEALTH_CURRENT_STATE_V1',
  contextRequired:false,
  contextSetId:'CTX_WEALTH_CURRENT_OPTIONAL',
  timingRequired:['DAYUN','YEAR'],
  outputTemplate:'WEALTH_CURRENT_STATE_SYNTHESIS_V1'
});

export const WEALTH_CURRENT_CONTEXTS = Object.freeze({
  CTX_NONE:{label:'不补充现实财务状态'},
  CTX_INCOME_STABLE:{label:'目前收入整体稳定'},
  CTX_INCOME_RISING:{label:'最近收入有所增加'},
  CTX_CASHFLOW_TIGHT:{label:'最近现金流偏紧'},
  CTX_DEBT_OBLIGATIONS:{label:'目前有较明显债务／固定偿还压力'},
  CTX_NEW_INCOME_STREAM:{label:'最近开始新的收入来源／副业'},
  CTX_INVESTMENT_VOLATILITY:{label:'最近投资或资产价格波动较明显'}
});

export const WEALTH_CURRENT_STATES = Object.freeze([
  'STEADY_RESOURCE_FLOW',
  'INCOME_MOMENTUM_BUILDING',
  'MONETIZATION_OPPORTUNITY_WINDOW',
  'FINANCIAL_PRESSURE_CAUTION',
  'VOLATILE_MIXED_FLOW'
]);

const MAGNITUDE_ORDER={LOW:1,MODERATE:2,HIGH:3};

function assertTiming(timing){
  if(!timing?.dayun || !timing?.year){
    const e=new Error('WEALTH_CURRENT_STATE requires active Dayun and Year from STEP 01 Core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}
function normalizeContext(contextId='CTX_NONE'){
  if(!WEALTH_CURRENT_CONTEXTS[contextId]){
    const e=new Error(`Unknown WEALTH_CURRENT_STATE context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:WEALTH_CURRENT_CONTEXTS[contextId].label,rewritesEvidence:false,rewritesState:false};
}
function finding({id,role,category,sourceType,sourceKey,polarity='NEUTRAL',magnitude='LOW',timingScope='NATAL',certainty='CONFIRMED',tags=[],plainMeaning,technicalBasis=[]}){
  return {id,role,category,sourceType,sourceKey,domainTags:['WEALTH'],polarity,magnitude,timingScope,certainty,tags:[...new Set(tags)],plainMeaning,technicalBasis};
}

function natalEvidence(strength,pattern){
  const stage=pattern.stage;
  const patternPolarity=['FORMED','RESCUED'].includes(stage)?'SUPPORTIVE':stage==='BROKEN'?'CHALLENGING':'NEUTRAL';
  return [
    finding({
      id:'WEALTH_CURRENT_NATAL_STRUCTURE',role:'PRIMARY',category:'STRUCTURAL',sourceType:'PATTERN_RESOLUTION',
      sourceKey:pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE',polarity:patternPolarity,magnitude:patternPolarity==='NEUTRAL'?'LOW':'MODERATE',timingScope:'NATAL',tags:['BASELINE','RESOURCE_STRUCTURE'],
      plainMeaning:'原局结构用于理解长期取得、承接与运用资源的方式，但不会单独证明当前实际收入或资产状况。',
      technicalBasis:[`StructureKey=${pattern.baseStructure?.key ?? 'NONE'}`,`PatternStage=${stage}`]
    }),
    finding({
      id:'WEALTH_CURRENT_NATAL_STRENGTH',role:'SECONDARY',category:'STRUCTURAL',sourceType:'STRENGTH',
      sourceKey:strength.strengthBand,polarity:'NEUTRAL',magnitude:'LOW',timingScope:'NATAL',tags:['BASELINE','CAPACITY'],
      plainMeaning:'日主强弱用于理解承载、输出与资源需求，不直接等同于财富高低。',
      technicalBasis:[`StrengthBand=${strength.strengthBand}`]
    })
  ];
}

const FAMILY_META={
  WEALTH:{polarity:'SUPPORTIVE',tags:['INCOME_OPPORTUNITY','RESOURCE_ACCESS','MONETIZATION'],plain:'收入、资源取得、交易或现实回报主题进入当前时运。'},
  OUTPUT:{polarity:'MIXED',tags:['MONETIZATION','INCOME_GENERATION','ACTIVE_OUTPUT'],plain:'输出、产品、表达与把能力转成现实成果的主题增强。'},
  RESOURCE:{polarity:'SUPPORTIVE',tags:['STABILITY_SUPPORT','CAPABILITY_SUPPORT'],plain:'知识、资历、方法与承接资源的条件增强。'},
  AUTHORITY:{polarity:'NEUTRAL',tags:['STRUCTURE_STABILITY','OBLIGATION'],plain:'规则、责任与组织结构主题增强，可能影响收入稳定性与固定责任。'},
  PEER:{polarity:'MIXED',tags:['RESOURCE_COMPETITION','RESOURCE_SHARING','VOLATILITY'],plain:'竞争、同侪分配或自主资源配置主题增强。'}
};

function timingLayerEvidence(activation){
  const out=[];
  for(const layer of activation.layers){
    const meta=FAMILY_META[layer.stemFamily] ?? {polarity:'NEUTRAL',tags:[],plain:'新的时运主题进入。'};
    out.push(finding({
      id:`WEALTH_CURRENT_${layer.layer}_${layer.stemGod}`,role:'TIMING',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.stemGod}_VISIBLE_ENTERED`,polarity:meta.polarity,magnitude:'MODERATE',timingScope:layer.layer,tags:meta.tags,
      plainMeaning:meta.plain,technicalBasis:[`${layer.layer}=${layer.pillar}`,`VisibleTenGod=${layer.stemGod}`]
    }));
    if(layer.branchMainFamily==='WEALTH') out.push(finding({
      id:`WEALTH_CURRENT_${layer.layer}_BRANCH_WEALTH`,role:'TIMING',category:'TIMING',sourceType:'BRANCH_MAIN_TEN_GOD',
      sourceKey:`${layer.branchMainGod}_BRANCH_MAIN_ENTERED`,polarity:'SUPPORTIVE',magnitude:'MODERATE',timingScope:layer.layer,tags:['INCOME_OPPORTUNITY','RESOURCE_ACCESS'],
      plainMeaning:'地支主气带入财富／资源主题，现实回报与资源配置更值得关注。',technicalBasis:[`${layer.layer}=${layer.pillar}`,`BranchMainTenGod=${layer.branchMainGod}`]
    }));
  }
  return out;
}

function patternActivationEvidence(activation){
  return activation.patternActivation.map((x,i)=>{
    let polarity='MIXED',magnitude='MODERATE',tags=['WEALTH_STRUCTURE_ACTIVATED'];
    if(x.classification==='PATTERN_SUPPORT_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='HIGH';tags.push('STABILITY_SUPPORT');
    } else if(x.classification==='PATTERN_ROUTE_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='MODERATE';tags.push('INCOME_OPPORTUNITY');
    } else if(x.classification==='PATTERN_PRESSURE_CANDIDATE'){
      polarity='CHALLENGING';magnitude='HIGH';tags.push('RESOURCE_PRESSURE','FRICTION');
    } else if(x.classification==='PATTERN_COMPLEXITY_REVIEW'){
      polarity='MIXED';magnitude='MODERATE';tags.push('VOLATILITY','REVIEW');
    }
    const key=String(x.key);
    if(/WEALTH|OUTPUT_GENERATES|EATING_GOD|HURTING_OFFICER_WEALTH/.test(key)) tags.push('MONETIZATION','INCOME_OPPORTUNITY');
    if(/PEER_PRESSURE_ON_WEALTH|WEALTH_PRESSURES_RESOURCE|WEALTH_FEEDS_KILLING/.test(key)) tags.push('RESOURCE_PRESSURE','VOLATILITY');
    return finding({
      id:`WEALTH_CURRENT_PATTERN_${i}_${x.key}`,role:'PRIMARY',category:'TIMING',sourceType:'PATTERN_ACTIVATION',sourceKey:x.key,
      polarity,magnitude,timingScope:x.layer,certainty:'CONDITIONAL',tags,
      plainMeaning:polarity==='SUPPORTIVE'?'当前时运对资源取得、成果转化或现实承接形成可利用的支持。':polarity==='CHALLENGING'?'当前时运对资源与回报结构形成较明显压力，需要更重视现金流与风险边界。':'财富与资源主题进入复杂调整期，需要把机会、压力与波动分开看。',
      technicalBasis:[`Layer=${x.layer}`,`Activation=${x.key}`,`Class=${x.classification}`]
    });
  });
}

function relationEvidence(timingResolution){
  const out=[]; let seq=0;
  for(const c of timingResolution.clashes.filter(x=>x.originLayer!=='NATAL')){
    if(c.status==='ACTIVE') out.push(finding({
      id:`WEALTH_CURRENT_REL_${seq++}_CLASH`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_CLASH',
      polarity:'MIXED',magnitude:'HIGH',timingScope:c.originLayer,tags:['VOLATILITY','RESOURCE_FLOW_CHANGE'],
      plainMeaning:'当前资源、收入方式或支出结构更容易出现明显调整，波动性需要提高关注。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`,`Reason=${c.reason}`]
    }));
    else if(c.status==='MEDIATED_CONFIRMED') out.push(finding({
      id:`WEALTH_CURRENT_REL_${seq++}_CLASH_MEDIATED`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MEDIATED_CLASH',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,tags:['VOLATILITY','MEDIATED'],
      plainMeaning:'资源变化关系存在，但同时有其它关系缓和，整体更像调整而非完全失序。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
    else if(String(c.status).includes('REVIEW')) out.push(finding({
      id:`WEALTH_CURRENT_REL_${seq++}_CLASH_REVIEW`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MULTI_RELATION_REVIEW',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,certainty:'CONDITIONAL',tags:['VOLATILITY','FRICTION','REVIEW'],
      plainMeaning:'多个关系同时作用，近期财富与资源节奏更复杂，不宜只看单一机会。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
  }
  for(const p of timingResolution.punishments.filter(x=>x.originLayer!=='NATAL')){
    if(['ACTIVE','ACTIVE_COMPLETE'].includes(p.status)) out.push(finding({
      id:`WEALTH_CURRENT_REL_${seq++}_PUNISHMENT`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_PUNISHMENT',
      polarity:'CHALLENGING',magnitude:p.status==='ACTIVE_COMPLETE'?'HIGH':'MODERATE',timingScope:p.originLayer,tags:['RESOURCE_PRESSURE','FRICTION'],
      plainMeaning:'反复消耗、费用压力或资源配置上的摩擦更容易被放大。',technicalBasis:[`Origin=${p.originLayer}`,`Status=${p.status}`]
    }));
  }
  for(const a of timingResolution.assemblies.filter(x=>x.originLayer!=='NATAL')){
    if(['FORMATION_COMPLETED_BY_TIMING','FORMATION_CONFIRMED'].includes(a.status)) out.push(finding({
      id:`WEALTH_CURRENT_REL_${seq++}_ASSEMBLY`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_ASSEMBLY',sourceKey:a.type,
      polarity:'MIXED',magnitude:'MODERATE',timingScope:a.originLayer,tags:['RESOURCE_REORGANIZATION','VOLATILITY'],
      plainMeaning:'时运补全新的组合结构，资源来源、合作或支出配置更容易重新组合。',technicalBasis:[`Origin=${a.originLayer}`,`Type=${a.type}`]
    }));
  }
  for(const s of timingResolution.crossLayerSignals ?? []){
    if(s.key==='STACKED_CLASH_ON_SAME_NATAL_POSITION') out.push(finding({
      id:`WEALTH_CURRENT_REL_${seq++}_STACKED_CLASH`,role:'PRIMARY',category:'TIMING',sourceType:'CROSS_LAYER_SIGNAL',sourceKey:s.key,
      polarity:'MIXED',magnitude:'HIGH',timingScope:'PERIOD',tags:['VOLATILITY','RESOURCE_FLOW_CHANGE'],
      plainMeaning:'大运与流年同时强调同一资源变化主题，近期更需要保留现金流弹性与风险缓冲。',technicalBasis:[`Signal=${s.key}`,`Target=${s.target ?? 'UNKNOWN'}`]
    }));
  }
  return out;
}

function srcCount(items){ return new Set(items.map(x=>`${x.sourceType}:${x.sourceKey}`)).size; }
function dimension(evidence,tags,{supportiveOnly=false,challengingOnly=false}={}){
  const xs=evidence.filter(x=>tags.some(t=>x.tags.includes(t)) && (!supportiveOnly || x.polarity==='SUPPORTIVE') && (!challengingOnly || x.polarity==='CHALLENGING'));
  const high=xs.some(x=>x.magnitude==='HIGH');
  if(high || srcCount(xs)>=2) return 'STRONG';
  return xs.length?'PRESENT':'NONE';
}

export function resolveWealthCurrentState(evidence){
  const active=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER');
  const stability=dimension(active,['STABILITY_SUPPORT','STRUCTURE_STABILITY','CAPABILITY_SUPPORT'],{supportiveOnly:true});
  const income=dimension(active,['INCOME_OPPORTUNITY','RESOURCE_ACCESS']);
  const monetization=dimension(active,['MONETIZATION','INCOME_GENERATION']);
  const pressure=dimension(active,['RESOURCE_PRESSURE','FRICTION'],{challengingOnly:true});
  const volatility=dimension(active,['VOLATILITY','RESOURCE_FLOW_CHANGE','RESOURCE_REORGANIZATION']);

  let state='STEADY_RESOURCE_FLOW';
  if(pressure==='STRONG' && (income!=='NONE' || monetization!=='NONE' || volatility!=='NONE')) state='VOLATILE_MIXED_FLOW';
  else if(pressure==='STRONG' && stability!=='STRONG') state='FINANCIAL_PRESSURE_CAUTION';
  else if(volatility==='STRONG' && (income!=='NONE' || monetization!=='NONE')) state='VOLATILE_MIXED_FLOW';
  else if((income==='STRONG' || monetization==='STRONG') && stability!=='NONE' && pressure!=='STRONG') state='MONETIZATION_OPPORTUNITY_WINDOW';
  else if(income!=='NONE' || monetization!=='NONE') state='INCOME_MOMENTUM_BUILDING';
  else state='STEADY_RESOURCE_FLOW';

  return {state,dimensions:{stability,income,monetization,pressure,volatility},numericScoreUsed:false,percentConfidenceUsed:false};
}

const STATE_COPY=Object.freeze({
  STEADY_RESOURCE_FLOW:{
    direct:'最近财富节奏整体偏稳，更适合把现有收入、储备与支出结构整理好。',
    current:'当前没有出现很强的扩张或高压信号，重点更像维持稳定、巩固收入来源与提高资金使用效率。',
    development:'接下来可优先把固定收入、必要支出、储备和可投资资金分开管理。',
    caution:'稳定不等于没有机会，也不代表可以忽略预算、负债和现金流。'
  },
  INCOME_MOMENTUM_BUILDING:{
    direct:'最近收入与变现动能正在增强，但更像逐步形成，还不是可以放松风险管理的阶段。',
    current:'资源取得、输出变现或新收入主题开始变得明显，适合观察哪些努力正在真正转成现实回报。',
    development:'优先放大已经验证有效的收入来源，同时记录成本、时间投入与实际净收益。',
    caution:'收入机会增加不等于净资产一定增加，支出与投入也需要一起核对。'
  },
  MONETIZATION_OPPORTUNITY_WINDOW:{
    direct:'最近处在较明显的成果变现与资源承接窗口，可以主动推进，但仍要以现实数据确认质量。',
    current:'收入、资源取得与承接支持同时增强，更适合把成熟能力、项目或合作转成实际回报。',
    development:'把重点放在可重复的收入、清楚的合同条件与可持续利润，而不是只看一次性的金额。',
    caution:'时运支持不能证明某个项目一定赚钱，更不能替代市场、合同与风险核查。'
  },
  FINANCIAL_PRESSURE_CAUTION:{
    direct:'最近财富主题更需要先守住现金流与风险边界，不适合只追求扩张。',
    current:'资源压力、反复消耗或承接不足的信号较突出，现实中更应该先确认固定支出、债务与资金缓冲。',
    development:'优先降低不可控支出、保留周转空间，并把新增承诺放到真实现金流之后。',
    caution:'命盘不能证明你现实中已经缺钱；是否紧张必须直接看收入、支出、负债与储备。'
  },
  VOLATILE_MIXED_FLOW:{
    direct:'最近机会与波动同时存在，财富节奏更适合边推进、边保留缓冲。',
    current:'资源变化、收入机会与压力信号交织，可能出现“有进账也有投入／支出增加”的混合状态。',
    development:'把每个机会拆成收入、成本、回款时间与最坏情况，避免只看表面金额。',
    caution:'波动期尤其不适合把短期收益当成长期稳定，也不要用命理替代投资风险评估。'
  }
});

function contextAction(contextId,state){
  const map={
    CTX_NONE:null,
    CTX_INCOME_STABLE:'现实收入稳定时，可以优先提高储备、预算清晰度与长期可持续性。',
    CTX_INCOME_RISING:'现实收入已经增加时，先确认增长来自一次性收入还是可重复来源，并同步管理生活方式膨胀。',
    CTX_CASHFLOW_TIGHT:'现实现金流已经偏紧时，优先处理必要支出、回款周期与资金缓冲，不必等命盘证明风险。',
    CTX_DEBT_OBLIGATIONS:'已有债务或固定偿还压力时，先核对还款能力、利率与期限，再考虑新的高风险资金承诺。',
    CTX_NEW_INCOME_STREAM:'新的收入来源已经出现时，重点验证客户、复购、成本、税务与可持续净收益。',
    CTX_INVESTMENT_VOLATILITY:'资产价格已经明显波动时，先确认仓位、流动性与自己能承受的损失范围，不用命盘替代投资判断。'
  };
  return map[contextId] ?? STATE_COPY[state].development;
}

export function renderWealthCurrentStateAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!WEALTH_CURRENT_STATES.includes(state)) throw new Error(`Unknown WEALTH_CURRENT_STATE state: ${state}`);
  normalizeContext(contextId);
  const copy=STATE_COPY[state];
  const why=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER').slice().sort((a,b)=>MAGNITUDE_ORDER[b.magnitude]-MAGNITUDE_ORDER[a.magnitude]).slice(0,4).map(x=>x.plainMeaning);
  const actions=[contextAction(contextId,state),copy.development,'把最近三个月的实际收入、固定支出、债务与储备放在同一张表里看，先确认现实现金流。'].filter(Boolean);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    development:copy.development,
    actions:[...new Set(actions)].slice(0,3),
    caution:copy.caution,
    why,
    technicalBasis:evidence.filter(x=>x.magnitude!=='LOW').slice(0,8).flatMap(x=>(x.technicalBasis ?? []).map(b=>`${x.sourceKey}: ${b}`)),
    deepAwareness:'财富不只是“钱有没有进来”，还包括收入是否可重复、钱能不能留下、资源是否被有效配置，以及为了获得回报承担了多少风险。',
    realityBoundary:'真实财务状态必须直接核对收入、支出、负债、储备、合同、税务与投资表现；命盘不能证明实际收益，也不能替代投资、借贷或重大财务决策。',
    certaintyLanguage:'NON_DETERMINISTIC'
  };
}

export function buildWealthCurrentStateEvidence(chart,timing){
  assertTiming(timing);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const timingResolution=resolveTimingRelations(chart,timing);
  const evidence=[...natalEvidence(strength,pattern),...timingLayerEvidence(timingResolution.activation),...patternActivationEvidence(timingResolution.activation),...relationEvidence(timingResolution)];
  return {
    version:WEALTH_CURRENT_STATE_VERSION,
    questionId:WEALTH_CURRENT_STATE_QUESTION.questionId,
    evidence,
    primary:evidence.filter(x=>x.role==='PRIMARY'),
    secondary:evidence.filter(x=>x.role==='SECONDARY'),
    timing:evidence.filter(x=>x.role==='TIMING'),
    modifiers:evidence.filter(x=>x.role==='MODIFIER'),
    sourceSnapshot:{
      strengthBand:strength.strengthBand,
      structureKey:pattern.baseStructure?.key ?? null,
      patternStage:pattern.stage,
      natalStrengthRewritten:timingResolution.natalInvariant.natalStrengthRewritten,
      natalStructureRewritten:timingResolution.natalInvariant.natalStructureRewritten
    }
  };
}

export function synthesizeWealthCurrentState(chart,timing,contextId='CTX_NONE'){
  const context=normalizeContext(contextId);
  const built=buildWealthCurrentStateEvidence(chart,timing);
  const resolution=resolveWealthCurrentState(built.evidence);
  const answer=renderWealthCurrentStateAnswer(resolution.state,contextId,built.evidence);
  return {
    version:WEALTH_CURRENT_STATE_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:WEALTH_CURRENT_STATE_QUESTION,
    context,
    evidenceStack:built,
    synthesis:{...resolution,contextChangedEvidenceState:false},
    answer,
    trace:[
      `QUESTION=${WEALTH_CURRENT_STATE_QUESTION.questionId}`,
      `STRUCTURE=${built.sourceSnapshot.structureKey}`,
      `PATTERN_STAGE=${built.sourceSnapshot.patternStage}`,
      `STRENGTH=${built.sourceSnapshot.strengthBand}`,
      `STATE=${resolution.state}`,
      `STABILITY=${resolution.dimensions.stability}`,
      `INCOME=${resolution.dimensions.income}`,
      `MONETIZATION=${resolution.dimensions.monetization}`,
      `PRESSURE=${resolution.dimensions.pressure}`,
      `VOLATILITY=${resolution.dimensions.volatility}`,
      `CONTEXT=${contextId}`,
      'CONTEXT_REWRITES_EVIDENCE=NO',
      'CONTEXT_REWRITES_STATE=NO',
      'ACTUAL_FINANCIAL_POSITION_INFERRED=NO',
      'INVESTMENT_RETURN_GUARANTEE=NO',
      'NUMERIC_SCORE=NO',
      'PERCENT_CONFIDENCE=NO'
    ]
  };
}
