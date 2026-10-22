import { assessStrength } from '../../src/strengthEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';
import { resolveTimingRelations } from '../../src/timingRelationResolutionEngine.mjs';

export const WEALTH_INCOME_GROWTH_VERSION = 'GUANCHENG_WEALTH_INCOME_GROWTH_PROTO_V1_STEP02_L1';

export const WEALTH_INCOME_GROWTH_QUESTION = Object.freeze({
  questionId:'WEALTH_INCOME_GROWTH',
  domain:'WEALTH',
  userText:'近期收入有没有提升机会？',
  intent:'ASSESS_INCOME_GROWTH_OPPORTUNITY',
  timeHorizon:'CURRENT_TO_NEXT_6_MONTHS',
  evidenceRecipeId:'RECIPE_WEALTH_INCOME_GROWTH_V1',
  contextRequired:false,
  contextSetId:'CTX_WEALTH_INCOME_GROWTH_OPTIONAL',
  timingRequired:['DAYUN','YEAR'],
  outputTemplate:'WEALTH_INCOME_GROWTH_SYNTHESIS_V1'
});

export const WEALTH_INCOME_GROWTH_CONTEXTS = Object.freeze({
  CTX_NONE:{label:'不补充收入形式'},
  CTX_SALARIED:{label:'目前以固定薪资／主业收入为主'},
  CTX_SELF_EMPLOYED:{label:'目前以自营／接案／生意收入为主'},
  CTX_MIXED_INCOME:{label:'目前同时有主业与副业／多种收入'},
  CTX_EXPECTING_RAISE:{label:'近期正在争取加薪／调薪'},
  CTX_COMMISSION_VARIABLE:{label:'收入较依赖佣金／业绩／项目'},
  CTX_INCOME_STAGNANT:{label:'近期收入停滞或增长不明显'},
  CTX_CASHFLOW_TIGHT:{label:'现实现金流偏紧'}
});

export const WEALTH_INCOME_GROWTH_STATES = Object.freeze([
  'STABLE_INCOME_BASE',
  'EARNING_CAPACITY_BUILDING',
  'INCOME_UPGRADE_WINDOW',
  'VARIABLE_INCOME_WINDOW',
  'INCOME_PRESSURE_CAUTION'
]);

const MAGNITUDE_ORDER={LOW:1,MODERATE:2,HIGH:3};

function assertTiming(timing){
  if(!timing?.dayun || !timing?.year){
    const e=new Error('WEALTH_INCOME_GROWTH requires active Dayun and Year from STEP 01 Core');
    e.code='TIMING_INPUT_REQUIRED';
    throw e;
  }
}
function normalizeContext(contextId='CTX_NONE'){
  if(!WEALTH_INCOME_GROWTH_CONTEXTS[contextId]){
    const e=new Error(`Unknown WEALTH_INCOME_GROWTH context: ${contextId}`);
    e.code='INVALID_CONTEXT';
    throw e;
  }
  return {id:contextId,label:WEALTH_INCOME_GROWTH_CONTEXTS[contextId].label,rewritesEvidence:false,rewritesState:false};
}
function finding({id,role,category,sourceType,sourceKey,polarity='NEUTRAL',magnitude='LOW',timingScope='NATAL',certainty='CONFIRMED',tags=[],plainMeaning,technicalBasis=[]}){
  return {id,role,category,sourceType,sourceKey,domainTags:['WEALTH'],polarity,magnitude,timingScope,certainty,tags:[...new Set(tags)],plainMeaning,technicalBasis};
}

function natalEvidence(strength,pattern){
  const stage=pattern.stage;
  const patternPolarity=['FORMED','RESCUED'].includes(stage)?'SUPPORTIVE':stage==='BROKEN'?'CHALLENGING':'NEUTRAL';
  return [
    finding({
      id:'WEALTH_INCOME_NATAL_STRUCTURE',role:'PRIMARY',category:'STRUCTURAL',sourceType:'PATTERN_RESOLUTION',
      sourceKey:pattern.baseStructure?.key ?? 'UNKNOWN_STRUCTURE',polarity:patternPolarity,magnitude:patternPolarity==='NEUTRAL'?'LOW':'MODERATE',timingScope:'NATAL',tags:['BASELINE','EARNING_MODEL'],
      plainMeaning:'原局结构用于理解长期收入形成方式与承接习惯，不单独证明现实工资、营业额或净收入。',
      technicalBasis:[`StructureKey=${pattern.baseStructure?.key ?? 'NONE'}`,`PatternStage=${stage}`]
    }),
    finding({
      id:'WEALTH_INCOME_NATAL_STRENGTH',role:'SECONDARY',category:'STRUCTURAL',sourceType:'STRENGTH',
      sourceKey:strength.strengthBand,polarity:'NEUTRAL',magnitude:'LOW',timingScope:'NATAL',tags:['BASELINE','CAPACITY'],
      plainMeaning:'日主强弱用于理解承载输出与资源需求，不等于现实收入高低。',
      technicalBasis:[`StrengthBand=${strength.strengthBand}`]
    })
  ];
}

const FAMILY_META={
  WEALTH:{polarity:'SUPPORTIVE',tags:['INCOME_OPPORTUNITY','MONETIZATION','REAL_WORLD_RETURN'],plain:'现实回报、收入承接或交易资源主题进入当前时运。'},
  OUTPUT:{polarity:'MIXED',tags:['EARNING_CAPACITY','ACTIVE_OUTPUT','MONETIZATION'],plain:'输出、技能、产品与把能力转成收入的主题增强。'},
  RESOURCE:{polarity:'SUPPORTIVE',tags:['CAPABILITY_SUPPORT','STABILITY_SUPPORT'],plain:'知识、方法、资历与支撑条件增强，有利于巩固收入能力，但不等于自动加薪。'},
  AUTHORITY:{polarity:'NEUTRAL',tags:['ROLE_STABILITY','RESPONSIBILITY','SALARY_STRUCTURE'],plain:'责任、制度与职位结构主题增强，可能影响主业收入条件，但不能证明公司一定调薪。'},
  PEER:{polarity:'MIXED',tags:['COMPETITION','RESOURCE_SHARING','VARIABLE_INCOME','PRESSURE'],plain:'竞争、同业分配或自主资源配置主题增强，收入机会与压力可能同时增加。'}
};

function timingLayerEvidence(activation){
  const out=[];
  for(const layer of activation.layers){
    const meta=FAMILY_META[layer.stemFamily] ?? {polarity:'NEUTRAL',tags:[],plain:'新的收入相关时运主题进入。'};
    out.push(finding({
      id:`WEALTH_INCOME_${layer.layer}_${layer.stemGod}`,role:'TIMING',category:'TIMING',sourceType:'TEN_GOD_ENTRY',
      sourceKey:`${layer.stemGod}_VISIBLE_ENTERED`,polarity:meta.polarity,magnitude:'MODERATE',timingScope:layer.layer,tags:meta.tags,
      plainMeaning:meta.plain,technicalBasis:[`${layer.layer}=${layer.pillar}`,`VisibleTenGod=${layer.stemGod}`]
    }));
    if(layer.branchMainFamily==='WEALTH') out.push(finding({
      id:`WEALTH_INCOME_${layer.layer}_BRANCH_WEALTH`,role:'TIMING',category:'TIMING',sourceType:'BRANCH_MAIN_TEN_GOD',
      sourceKey:`${layer.branchMainGod}_BRANCH_MAIN_ENTERED`,polarity:'SUPPORTIVE',magnitude:'MODERATE',timingScope:layer.layer,tags:['INCOME_OPPORTUNITY','REAL_WORLD_RETURN'],
      plainMeaning:'地支主气带入收入与现实回报主题，值得留意可重复的收入来源。',technicalBasis:[`${layer.layer}=${layer.pillar}`,`BranchMainTenGod=${layer.branchMainGod}`]
    }));
  }
  return out;
}

function patternActivationEvidence(activation){
  return activation.patternActivation.map((x,i)=>{
    let polarity='MIXED',magnitude='MODERATE',tags=['INCOME_STRUCTURE_ACTIVATED'];
    if(x.classification==='PATTERN_SUPPORT_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='HIGH';tags.push('STABILITY_SUPPORT');
    } else if(x.classification==='PATTERN_ROUTE_CANDIDATE'){
      polarity='SUPPORTIVE';magnitude='MODERATE';tags.push('INCOME_OPPORTUNITY');
    } else if(x.classification==='PATTERN_PRESSURE_CANDIDATE'){
      polarity='CHALLENGING';magnitude='HIGH';tags.push('INCOME_PRESSURE','FRICTION');
    } else if(x.classification==='PATTERN_COMPLEXITY_REVIEW'){
      polarity='MIXED';magnitude='MODERATE';tags.push('VARIABLE_INCOME','VOLATILITY','REVIEW');
    }
    const key=String(x.key);
    if(/OUTPUT_GENERATES_WEALTH|WEALTH_ROUTE_FROM_EATING_GOD|HURTING_OFFICER_WEALTH_ROUTE/.test(key)) tags.push('EARNING_CAPACITY','MONETIZATION','INCOME_OPPORTUNITY','VARIABLE_INCOME');
    if(/WEALTH_SUPPORTS_OFFICER/.test(key)) tags.push('INCOME_OPPORTUNITY','STABILITY_SUPPORT','SALARY_STRUCTURE');
    if(/PEER_PRESSURE_ON_WEALTH|WEALTH_PRESSURES_RESOURCE|WEALTH_FEEDS_KILLING/.test(key)) tags.push('INCOME_PRESSURE','COMPETITION','VOLATILITY');
    return finding({
      id:`WEALTH_INCOME_PATTERN_${i}_${x.key}`,role:'PRIMARY',category:'TIMING',sourceType:'PATTERN_ACTIVATION',sourceKey:x.key,
      polarity,magnitude,timingScope:x.layer,certainty:'CONDITIONAL',tags,
      plainMeaning:polarity==='SUPPORTIVE'?'当前时运对收入形成、成果变现或主业承接提供较明显支持。':polarity==='CHALLENGING'?'当前收入提升同时伴随明显承接或竞争压力，现实上要先控制风险。':'收入形成路径进入调整或多来源并行阶段，需要区分稳定收入与波动收入。',
      technicalBasis:[`Layer=${x.layer}`,`Activation=${x.key}`,`Class=${x.classification}`]
    });
  });
}

function relationEvidence(timingResolution){
  const out=[]; let seq=0;
  for(const c of timingResolution.clashes.filter(x=>x.originLayer!=='NATAL')){
    if(c.status==='ACTIVE') out.push(finding({
      id:`WEALTH_INCOME_REL_${seq++}_CLASH`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_CLASH',
      polarity:'MIXED',magnitude:'HIGH',timingScope:c.originLayer,tags:['VARIABLE_INCOME','VOLATILITY','INCOME_STRUCTURE_CHANGE'],
      plainMeaning:'收入来源、合作方式或工作回报结构更容易出现调整，收入波动性需要提高关注。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`,`Reason=${c.reason}`]
    }));
    else if(c.status==='MEDIATED_CONFIRMED') out.push(finding({
      id:`WEALTH_INCOME_REL_${seq++}_CLASH_MEDIATED`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MEDIATED_CLASH',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,tags:['VARIABLE_INCOME','VOLATILITY','MEDIATED'],
      plainMeaning:'收入结构有调整信号，但同时存在缓和因素，更适合边试边确认。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
    else if(String(c.status).includes('REVIEW')) out.push(finding({
      id:`WEALTH_INCOME_REL_${seq++}_CLASH_REVIEW`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'MULTI_RELATION_REVIEW',
      polarity:'MIXED',magnitude:'MODERATE',timingScope:c.originLayer,certainty:'CONDITIONAL',tags:['VARIABLE_INCOME','VOLATILITY','REVIEW'],
      plainMeaning:'多个关系同时作用，收入变化路径较复杂，不宜把单一信号解释成确定加薪或确定增收。',technicalBasis:[`Origin=${c.originLayer}`,`Status=${c.status}`]
    }));
  }
  for(const p of timingResolution.punishments.filter(x=>x.originLayer!=='NATAL')){
    if(['ACTIVE','ACTIVE_COMPLETE'].includes(p.status)) out.push(finding({
      id:`WEALTH_INCOME_REL_${seq++}_PUNISHMENT`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_RELATION',sourceKey:'ACTIVE_PUNISHMENT',
      polarity:'CHALLENGING',magnitude:p.status==='ACTIVE_COMPLETE'?'HIGH':'MODERATE',timingScope:p.originLayer,tags:['INCOME_PRESSURE','FRICTION'],
      plainMeaning:'为了提高收入而承担的时间、责任或成本压力更容易被放大。',technicalBasis:[`Origin=${p.originLayer}`,`Status=${p.status}`]
    }));
  }
  for(const a of timingResolution.assemblies.filter(x=>x.originLayer!=='NATAL')){
    if(['FORMATION_COMPLETED_BY_TIMING','FORMATION_CONFIRMED'].includes(a.status)) out.push(finding({
      id:`WEALTH_INCOME_REL_${seq++}_ASSEMBLY`,role:'TIMING',category:'RELATIONAL',sourceType:'TIMING_ASSEMBLY',sourceKey:a.type,
      polarity:'MIXED',magnitude:'MODERATE',timingScope:a.originLayer,tags:['INCOME_STRUCTURE_CHANGE','VARIABLE_INCOME'],
      plainMeaning:'新的组合结构形成，收入来源、职责或合作分配更容易重新组合。',technicalBasis:[`Origin=${a.originLayer}`,`Type=${a.type}`]
    }));
  }
  for(const s of timingResolution.crossLayerSignals ?? []){
    if(s.key==='STACKED_CLASH_ON_SAME_NATAL_POSITION') out.push(finding({
      id:`WEALTH_INCOME_REL_${seq++}_STACKED_CLASH`,role:'PRIMARY',category:'TIMING',sourceType:'CROSS_LAYER_SIGNAL',sourceKey:s.key,
      polarity:'MIXED',magnitude:'HIGH',timingScope:'PERIOD',tags:['VARIABLE_INCOME','VOLATILITY','INCOME_STRUCTURE_CHANGE'],
      plainMeaning:'大运与流年同时强调收入结构变化，短期更需要保留收入与现金流弹性。',technicalBasis:[`Signal=${s.key}`,`Target=${s.target ?? 'UNKNOWN'}`]
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

export function resolveWealthIncomeGrowthState(evidence){
  const active=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER');
  const stability=dimension(active,['STABILITY_SUPPORT','ROLE_STABILITY','SALARY_STRUCTURE','CAPABILITY_SUPPORT'],{supportiveOnly:true});
  const earningCapacity=dimension(active,['EARNING_CAPACITY','ACTIVE_OUTPUT']);
  const incomeOpportunity=dimension(active,['INCOME_OPPORTUNITY','REAL_WORLD_RETURN']);
  const variableIncome=dimension(active,['VARIABLE_INCOME','MONETIZATION','INCOME_STRUCTURE_CHANGE']);
  const pressure=dimension(active,['INCOME_PRESSURE','FRICTION','COMPETITION'],{challengingOnly:true});

  let state='STABLE_INCOME_BASE';
  if(pressure==='STRONG') state='INCOME_PRESSURE_CAUTION';
  else if(variableIncome==='STRONG' && stability==='NONE') state='VARIABLE_INCOME_WINDOW';
  else if(incomeOpportunity==='STRONG' && (earningCapacity!=='NONE' || stability!=='NONE')) state='INCOME_UPGRADE_WINDOW';
  else if(incomeOpportunity!=='NONE' || earningCapacity!=='NONE' || variableIncome!=='NONE') state='EARNING_CAPACITY_BUILDING';

  return {state,dimensions:{stability,earningCapacity,incomeOpportunity,variableIncome,pressure},numericScoreUsed:false,percentConfidenceUsed:false};
}

const STATE_COPY=Object.freeze({
  STABLE_INCOME_BASE:{
    direct:'近期收入更像维持现有基础，暂时没有很强的升级信号。',
    current:'现阶段更适合先巩固稳定收入、工作价值与可持续性，而不是为了增长强行增加风险。',
    development:'把重点放在提高可替代性较低的能力、稳定客户或更清楚的薪酬条件，为下一步增长打基础。',
    caution:'“暂时稳定”不等于以后没有提升空间，也不能据此判断公司、客户或市场不会变化。'
  },
  EARNING_CAPACITY_BUILDING:{
    direct:'近期收入提升的条件正在形成，更适合先把能力、产出和可变现成果做实。',
    current:'输出、收入机会或现实回报主题开始增强，但还需要更多承接条件才能形成更明确的收入升级。',
    development:'优先累积可量化成果、议价依据、稳定客户或可重复收入，再决定是否扩大投入。',
    caution:'能力增强不等于收入会自动同步上涨；薪资、价格和客户成交仍取决于现实条件。'
  },
  INCOME_UPGRADE_WINDOW:{
    direct:'近期存在较明显的收入升级窗口，可以主动争取，但需要现实条件配合。',
    current:'收入机会、成果转化与承接条件同时增强，更适合谈薪、提价、扩大成熟收入来源或争取更好的回报条件。',
    development:'把已有成果、市场价格、职责变化与可量化贡献整理好，用现实证据推进收入升级。',
    caution:'这只是收入升级条件增强，不代表调薪已经获批或收入增长已经确定；具体金额、时间与是否批准必须由雇主、客户、合同和市场实际决定。'
  },
  VARIABLE_INCOME_WINDOW:{
    direct:'近期更容易从项目、副业、佣金或多元收入中看到机会，但波动性也会更高。',
    current:'变现与收入结构变化信号较强，但稳定承接不足，更像可变收入窗口，而不是固定收入自动上调。',
    development:'适合小步验证新收入来源，并记录成交率、成本、回款周期和净收益，再决定是否扩大。',
    caution:'可变收入机会不能当成固定薪资，也不适合用一次高收入推断长期收入水平。'
  },
  INCOME_PRESSURE_CAUTION:{
    direct:'近期提升收入的同时伴随较明显压力，更适合先守住收入质量与现金流。',
    current:'竞争、责任、成本或结构摩擦较突出，若只追求更高收入，可能同步增加工作量、投入或不稳定性。',
    development:'先判断新增收入需要付出多少时间、成本、风险与固定承诺，再决定是否值得追。',
    caution:'命盘不能证明你现实中一定会降薪或收入受损；是否承压必须直接看合同、订单、工作量与现金流。'
  }
});

function contextAction(contextId,state){
  const map={
    CTX_NONE:null,
    CTX_SALARIED:'固定薪资为主时，整理近一年的职责变化、成果、市场薪资与可替代性，再决定是否谈薪或换取更好的薪酬结构。',
    CTX_SELF_EMPLOYED:'自营或接案为主时，优先看客单价、复购、毛利、回款周期与客户集中度，而不是只看营业额。',
    CTX_MIXED_INCOME:'多种收入并行时，把主业、副业与一次性收入分开记录，确认哪一条真正可重复、可持续。',
    CTX_EXPECTING_RAISE:'正在争取加薪时，用职责变化、可量化成果、市场薪资与预算周期作为现实依据，不用命盘替代谈薪判断。',
    CTX_COMMISSION_VARIABLE:'佣金或项目收入占比较高时，优先核对成交率、淡旺季、回款与波动区间，并保留现金缓冲。',
    CTX_INCOME_STAGNANT:'现实收入停滞时，先区分问题来自能力、岗位上限、定价、客户量还是市场环境，再选择对应突破方式。',
    CTX_CASHFLOW_TIGHT:'现实现金流偏紧时，先处理必要支出、回款和资金缓冲，不应为了“收入窗口”增加高风险承诺。'
  };
  return map[contextId] ?? STATE_COPY[state].development;
}

export function renderWealthIncomeGrowthAnswer(state,contextId='CTX_NONE',evidence=[]){
  if(!WEALTH_INCOME_GROWTH_STATES.includes(state)) throw new Error(`Unknown WEALTH_INCOME_GROWTH state: ${state}`);
  normalizeContext(contextId);
  const copy=STATE_COPY[state];
  const why=evidence.filter(x=>x.timingScope!=='NATAL' && x.role!=='MODIFIER').slice().sort((a,b)=>MAGNITUDE_ORDER[b.magnitude]-MAGNITUDE_ORDER[a.magnitude]).slice(0,4).map(x=>x.plainMeaning);
  const actions=[contextAction(contextId,state),copy.development,'把固定收入、可变收入、成本与实际净收入分开记录，先确认现实变化来自哪里。'].filter(Boolean);
  return {
    directAnswer:copy.direct,
    currentState:copy.current,
    development:copy.development,
    actions:[...new Set(actions)].slice(0,3),
    caution:copy.caution,
    why,
    technicalBasis:evidence.filter(x=>x.magnitude!=='LOW').slice(0,8).flatMap(x=>(x.technicalBasis ?? []).map(b=>`${x.sourceKey}: ${b}`)),
    deepAwareness:'收入提升并不只是“赚得更多”，还包括你的价值是否被更好定价、收入来源是否可重复，以及为了增加收入是否付出了过高的时间、成本与不稳定性。',
    realityBoundary:'实际收入、加薪结果、成交金额、营业额、净利润与现金流必须用工资单、合同、账目、客户和市场现实核对；命盘不能证明雇主已经批准调薪，也不能保证某项收入增长。',
    certaintyLanguage:'NON_DETERMINISTIC'
  };
}

export function buildWealthIncomeGrowthEvidence(chart,timing){
  assertTiming(timing);
  const strength=assessStrength(chart);
  const pattern=resolvePattern(chart);
  const timingResolution=resolveTimingRelations(chart,timing);
  const evidence=[...natalEvidence(strength,pattern),...timingLayerEvidence(timingResolution.activation),...patternActivationEvidence(timingResolution.activation),...relationEvidence(timingResolution)];
  return {
    version:WEALTH_INCOME_GROWTH_VERSION,
    questionId:WEALTH_INCOME_GROWTH_QUESTION.questionId,
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

export function synthesizeWealthIncomeGrowth(chart,timing,contextId='CTX_NONE'){
  const context=normalizeContext(contextId);
  const built=buildWealthIncomeGrowthEvidence(chart,timing);
  const resolution=resolveWealthIncomeGrowthState(built.evidence);
  const answer=renderWealthIncomeGrowthAnswer(resolution.state,contextId,built.evidence);
  return {
    version:WEALTH_INCOME_GROWTH_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    question:WEALTH_INCOME_GROWTH_QUESTION,
    context,
    evidenceStack:built,
    synthesis:{...resolution,contextChangedEvidenceState:false},
    answer,
    trace:[
      `QUESTION=${WEALTH_INCOME_GROWTH_QUESTION.questionId}`,
      `STRUCTURE=${built.sourceSnapshot.structureKey}`,
      `PATTERN_STAGE=${built.sourceSnapshot.patternStage}`,
      `STRENGTH=${built.sourceSnapshot.strengthBand}`,
      `STATE=${resolution.state}`,
      `STABILITY=${resolution.dimensions.stability}`,
      `EARNING_CAPACITY=${resolution.dimensions.earningCapacity}`,
      `INCOME_OPPORTUNITY=${resolution.dimensions.incomeOpportunity}`,
      `VARIABLE_INCOME=${resolution.dimensions.variableIncome}`,
      `PRESSURE=${resolution.dimensions.pressure}`,
      `CONTEXT=${contextId}`,
      'CONTEXT_REWRITES_EVIDENCE=NO',
      'CONTEXT_REWRITES_STATE=NO',
      'SALARY_RAISE_GUARANTEE=NO',
      'ACTUAL_INCOME_INFERRED=NO',
      'INVESTMENT_RETURN_GUARANTEE=NO',
      'NUMERIC_SCORE=NO',
      'PERCENT_CONFIDENCE=NO'
    ]
  };
}
