import { tenGod } from './patternEngine.mjs';
import { resolvePattern } from './patternResolutionEngine.mjs';
import { resolveTimingRelations } from './timingRelationResolutionEngine.mjs';
import { synthesizeCareerNext6m } from './careerNext6mSynthesisEngine.mjs';

export const MONTH_TIMING_ADAPTER_VERSION = 'GUANCHENG_MONTH_TIMING_ADAPTER_PROTO_V2_STEP02_J3_REFINEMENT';

export const JIE_MONTH_BRANCH = Object.freeze({
  '立春':'寅','惊蛰':'卯','清明':'辰','立夏':'巳','芒种':'午','小暑':'未',
  '立秋':'申','白露':'酉','寒露':'戌','立冬':'亥','大雪':'子','小寒':'丑'
});

export const JIE_ORDER = Object.freeze(['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒']);
const BRANCH_ORDER = Object.freeze(['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑']);
const STEMS = Object.freeze(['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']);
const BRANCHES = Object.freeze(['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']);

const JIAZI = Object.freeze(Array.from({length:60},(_,i)=>`${STEMS[i%10]}${BRANCHES[i%12]}`));

const TIGER_START = Object.freeze({
  '甲':'丙','己':'丙',
  '乙':'戊','庚':'戊',
  '丙':'庚','辛':'庚',
  '丁':'壬','壬':'壬',
  '戊':'甲','癸':'甲'
});

const BRANCH_HIDDEN = Object.freeze({
  子:['癸'], 丑:['己','癸','辛'], 寅:['甲','丙','戊'], 卯:['乙'],
  辰:['戊','乙','癸'], 巳:['丙','戊','庚'], 午:['丁','己'], 未:['己','丁','乙'],
  申:['庚','壬','戊'], 酉:['辛'], 戌:['戊','辛','丁'], 亥:['壬','甲']
});

const FAMILY = Object.freeze({
  PEER:'PEER', ROB_WEALTH:'PEER',
  EATING_GOD:'OUTPUT', HURTING_OFFICER:'OUTPUT',
  DIRECT_WEALTH:'WEALTH', INDIRECT_WEALTH:'WEALTH',
  DIRECT_OFFICER:'AUTHORITY', SEVEN_KILLINGS:'AUTHORITY',
  DIRECT_RESOURCE:'RESOURCE', INDIRECT_RESOURCE:'RESOURCE'
});

const FAMILY_META = Object.freeze({
  AUTHORITY:{polarity:'SUPPORTIVE',tags:['RESPONSIBILITY','AUTHORITY','ROLE_EXPANSION'],meaning:'本月职位、职责、规则或组织角色主题被带到前台。'},
  RESOURCE:{polarity:'SUPPORTIVE',tags:['SUPPORT','STABILITY_SUPPORT','DEVELOPMENT_SUPPORT'],meaning:'本月学习、资历、支持与承接条件更值得利用。'},
  WEALTH:{polarity:'SUPPORTIVE',tags:['MATERIAL_SUPPORT','DEVELOPMENT_SUPPORT','OPPORTUNITY'],meaning:'本月资源、回报、成果与现实承接主题增强。'},
  OUTPUT:{polarity:'MIXED',tags:['GROWTH','GROWTH_DRIVE','TRANSITION'],meaning:'本月表达、输出、主动争取与改变工作方式的力量增强。'},
  PEER:{polarity:'MIXED',tags:['GROWTH_DRIVE','TRANSITION','MOBILITY'],meaning:'本月自主性、同侪竞争与自我主张主题增强。'}
});

const STEM_COMBINATIONS = [
  ['甲','己'],['乙','庚'],['丙','辛'],['丁','壬'],['戊','癸']
];
const BRANCH_CLASHES = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
const BRANCH_COMBINATIONS = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
const BRANCH_HARMS = [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']];
const BRANCH_BREAKS = [['子','酉'],['丑','辰'],['寅','亥'],['卯','午'],['巳','申'],['未','戌']];
const MUTUAL_PUNISH = [['子','卯']];
const THREE_PUNISHMENTS = [
  {branches:['寅','巳','申'],key:'UNGRATEFUL_THREE_PUNISHMENT'},
  {branches:['丑','戌','未'],key:'POWER_THREE_PUNISHMENT'}
];
const SELF_PUNISHMENTS = new Set(['辰','午','酉','亥']);
const THREE_HARMONIES = [
  {branches:['申','子','辰'],element:'WATER'},
  {branches:['亥','卯','未'],element:'WOOD'},
  {branches:['寅','午','戌'],element:'FIRE'},
  {branches:['巳','酉','丑'],element:'METAL'}
];
const THREE_MEETINGS = [
  {branches:['亥','子','丑'],element:'WATER'},
  {branches:['寅','卯','辰'],element:'WOOD'},
  {branches:['巳','午','未'],element:'FIRE'},
  {branches:['申','酉','戌'],element:'METAL'}
];

const pairKey=(a,b)=>[a,b].sort().join('');
const pairSet=(xs)=>new Set(xs.map(([a,b])=>pairKey(a,b)));
const STEM_COMBO_SET=pairSet(STEM_COMBINATIONS);
const CLASH_SET=pairSet(BRANCH_CLASHES);
const COMBO_SET=pairSet(BRANCH_COMBINATIONS);
const HARM_SET=pairSet(BRANCH_HARMS);
const BREAK_SET=pairSet(BRANCH_BREAKS);
const MUTUAL_PUNISH_SET=pairSet(MUTUAL_PUNISH);
const PUNISH_PAIR_SET=new Set(THREE_PUNISHMENTS.flatMap(g=>[
  pairKey(g.branches[0],g.branches[1]),pairKey(g.branches[0],g.branches[2]),pairKey(g.branches[1],g.branches[2])
]));

function parsePillar(p){
  if(typeof p!=='string' || p.length<2 || !STEMS.includes(p[0]) || !BRANCHES.includes(p[1])) throw new Error(`Invalid pillar: ${p}`);
  return {stem:p[0],branch:p[1]};
}
function parseInstant(s,label='instant'){
  if(typeof s!=='string' || !/(Z|[+-]\d{2}:\d{2})$/.test(s)) throw new Error(`${label} must be offset-aware ISO instant`);
  const ms=Date.parse(s); if(!Number.isFinite(ms)) throw new Error(`Invalid ${label}: ${s}`); return ms;
}
function iso(ms){ return new Date(ms).toISOString(); }

function parseOffsetParts(s){
  const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(s);
  if(!m) throw new Error('asOf must be offset-aware ISO instant');
  const [,ys,mos,ds,hs,mis,ss='0',mss='0',off]=m;
  let offsetMinutes=0;
  if(off!=='Z'){
    const sign=off[0]==='-'?-1:1; const [oh,om]=off.slice(1).split(':').map(Number);
    offsetMinutes=sign*(oh*60+om);
  }
  return {year:+ys,month:+mos,day:+ds,hour:+hs,minute:+mis,second:+ss,millisecond:+mss.padEnd(3,'0'),offsetMinutes};
}
function daysInMonth(y,m){ return new Date(Date.UTC(y,m,0)).getUTCDate(); }
function addCivilMonthsToInstant(asOf,n){
  const p=parseOffsetParts(asOf); let total=(p.year*12+(p.month-1))+n; const y=Math.floor(total/12); const mo=(total%12)+1;
  const d=Math.min(p.day,daysInMonth(y,mo));
  return Date.UTC(y,mo-1,d,p.hour,p.minute,p.second,p.millisecond)-p.offsetMinutes*60000;
}

export function nextJiazi(pillar){
  const i=JIAZI.indexOf(pillar); if(i<0) throw new Error(`Pillar is not valid Jiazi: ${pillar}`);
  return JIAZI[(i+1)%60];
}

export function deriveMonthPillar(yearStem,monthBranch){
  if(!TIGER_START[yearStem]) throw new Error(`Unsupported year stem: ${yearStem}`);
  const branchIndex=BRANCH_ORDER.indexOf(monthBranch); if(branchIndex<0) throw new Error(`Unsupported month branch: ${monthBranch}`);
  const startStemIndex=STEMS.indexOf(TIGER_START[yearStem]);
  return `${STEMS[(startStemIndex+branchIndex)%10]}${monthBranch}`;
}

function previousMonthBranchForBoundary(boundaryName){
  const i=JIE_ORDER.indexOf(boundaryName); if(i<0) throw new Error(`Unknown Jie: ${boundaryName}`);
  return JIE_MONTH_BRANCH[JIE_ORDER[(i+11)%12]];
}

function normalizeJieBoundaries(asOfMs,horizonEnd,boundaries){
  if(!Array.isArray(boundaries) || boundaries.length<6) throw new Error('Month Timing Adapter requires a continuous future exact Jie timeline');
  const normalized=boundaries.map((b,i)=>{
    if(!b || !JIE_MONTH_BRANCH[b.name]) throw new Error(`Invalid Jie boundary at index ${i}`);
    const ms=parseInstant(b.instant,`Jie boundary ${b.name}`);
    if(ms<=asOfMs) throw new Error(`Jie boundary ${b.name} must be strictly after as-of instant`);
    if(b.confirmed!==true) throw new Error(`Jie boundary ${b.name} must be confirmed by upstream STEP 01 authority`);
    if(!String(b.source ?? '').startsWith('STEP01_EXACT_JIE')) throw new Error(`Jie boundary ${b.name} must come from STEP01_EXACT_JIE source`);
    return {...b,ms,monthBranch:JIE_MONTH_BRANCH[b.name]};
  }).sort((a,b)=>a.ms-b.ms);
  for(let i=1;i<normalized.length;i++){
    if(normalized[i].ms<=normalized[i-1].ms) throw new Error('Jie boundaries must be strictly increasing');
    const prev=JIE_ORDER.indexOf(normalized[i-1].name);
    const expected=JIE_ORDER[(prev+1)%12];
    if(normalized[i].name!==expected) throw new Error(`Jie boundary sequence discontinuity: expected ${expected}, got ${normalized[i].name}`);
  }
  if(!normalized.some(x=>x.ms>horizonEnd)) throw new Error('Jie timeline must include the first exact Jie boundary after the six-month horizon');
  return normalized;
}

function normalizeDayunTransitions(asOfMs,horizonEnd,items=[]){
  if(!Array.isArray(items)) throw new Error('dayunTransitions must be an array');
  const xs=items.map((x,i)=>{
    const ms=parseInstant(x.instant,`Dayun transition ${i}`);
    parsePillar(x.pillarAfter);
    if(x.confirmed!==true) throw new Error('Dayun transition must be confirmed by upstream STEP 01 authority');
    if(!String(x.source ?? '').startsWith('STEP01_DAYUN_EXACT')) throw new Error('Dayun transition must come from STEP01_DAYUN_EXACT source');
    return {...x,ms};
  }).filter(x=>x.ms>=asOfMs && x.ms<horizonEnd).sort((a,b)=>a.ms-b.ms);
  for(let i=1;i<xs.length;i++) if(xs[i].ms===xs[i-1].ms) throw new Error('Duplicate Dayun transition instant');
  return xs;
}

function sourcesForChart(chart,dayun,year){
  const y=parsePillar(chart.year),m=parsePillar(chart.month),d=parsePillar(chart.day),h=parsePillar(chart.hour);
  const dy=parsePillar(dayun),yr=parsePillar(year);
  return {
    dayStem:d.stem,
    stems:[
      {scope:'NATAL',position:'YEAR_STEM',value:y.stem},{scope:'NATAL',position:'MONTH_STEM',value:m.stem},
      {scope:'NATAL',position:'DAY_STEM',value:d.stem},{scope:'NATAL',position:'HOUR_STEM',value:h.stem},
      {scope:'DAYUN',position:'DAYUN_STEM',value:dy.stem},{scope:'YEAR',position:'YEAR_STEM_TIMING',value:yr.stem}
    ],
    branches:[
      {scope:'NATAL',position:'YEAR_BRANCH',value:y.branch},{scope:'NATAL',position:'MONTH_BRANCH',value:m.branch},
      {scope:'NATAL',position:'DAY_BRANCH',value:d.branch},{scope:'NATAL',position:'HOUR_BRANCH',value:h.branch},
      {scope:'DAYUN',position:'DAYUN_BRANCH',value:dy.branch},{scope:'YEAR',position:'YEAR_BRANCH_TIMING',value:yr.branch}
    ]
  };
}

function groupCompletions(monthBranch,existingBranches,groups,type){
  const before=new Set(existingBranches.map(x=>x.value)); const after=new Set([...before,monthBranch]);
  return groups.filter(g=>!g.branches.every(b=>before.has(b)) && g.branches.every(b=>after.has(b))).map(g=>({
    type,status:'COMPLETED_BY_MONTH',branches:g.branches,candidateElement:g.element??null,
    sources:existingBranches.filter(x=>g.branches.includes(x.value))
  }));
}

function analyzeMonthRelations(chart,dayun,year,monthPillar){
  const src=sourcesForChart(chart,dayun,year); const m=parsePillar(monthPillar); const edges=[];
  for(const s of src.stems){
    if(STEM_COMBO_SET.has(pairKey(m.stem,s.value))) edges.push({type:'STEM_COMBINATION',target:s,status:'TRIGGERED_NOT_AUTO_TRANSFORMED'});
  }
  for(const b of src.branches){
    const k=pairKey(m.branch,b.value); const base={target:b};
    if(CLASH_SET.has(k)) edges.push({...base,type:'CLASH',status:'ACTIVE_CANDIDATE'});
    if(COMBO_SET.has(k)) edges.push({...base,type:'SIX_COMBINATION',status:'BINDING_CANDIDATE_NOT_AUTO_TRANSFORMED'});
    if(HARM_SET.has(k)) edges.push({...base,type:'HARM',status:'SECONDARY_MODIFIER'});
    if(BREAK_SET.has(k)) edges.push({...base,type:'BREAK',status:'SECONDARY_MODIFIER'});
    if(MUTUAL_PUNISH_SET.has(k)) edges.push({...base,type:'MUTUAL_PUNISHMENT',status:'ACTIVE'});
    if(PUNISH_PAIR_SET.has(k)) edges.push({...base,type:'THREE_PUNISHMENT_PARTIAL',status:'REVIEW_PARTIAL'});
    if(m.branch===b.value && SELF_PUNISHMENTS.has(m.branch)) edges.push({...base,type:'SELF_PUNISHMENT',status:'ACTIVE'});
    if(m.branch===b.value) edges.push({...base,type:'BRANCH_REPEAT',status:'FACT_ONLY'});
  }
  const assemblies=[
    ...groupCompletions(m.branch,src.branches,THREE_HARMONIES,'THREE_HARMONY'),
    ...groupCompletions(m.branch,src.branches,THREE_MEETINGS,'THREE_MEETING')
  ];
  const punishmentCompletions=groupCompletions(m.branch,src.branches,THREE_PUNISHMENTS,'THREE_PUNISHMENT');
  const monthHasBinding=edges.some(x=>x.type==='SIX_COMBINATION');
  const monthInAssembly=assemblies.length>0;
  for(const e of edges.filter(x=>x.type==='CLASH')){
    e.status=(monthHasBinding||monthInAssembly)?'MULTI_RELATION_REVIEW':'ACTIVE';
  }
  return {edges,assemblies,punishmentCompletions};
}

function evidence(id,sourceType,sourceKey,{polarity='MIXED',magnitude='MODERATE',tags=[],plainMeaning,technicalBasis=[],certainty='CONFIRMED'}={}){
  return {id,role:'TIMING',category:'TIMING',sourceType,sourceKey,polarity,magnitude,tags:[...new Set(tags)],plainMeaning,technicalBasis,certainty};
}

function patternMonthEvidence(chart,monthPillar){
  const pattern=resolvePattern(chart); const dayStem=parsePillar(chart.day).stem; const stem=parsePillar(monthPillar).stem;
  const god=tenGod(dayStem,stem); const base=pattern.baseStructure?.key; const out=[];
  const add=(key,polarity,magnitude,tags,meaning)=>out.push(evidence(`MONTH_PATTERN_${key}`,'MONTH_PATTERN_ACTIVATION',key,{polarity,magnitude,tags,plainMeaning:meaning,technicalBasis:[`StructureKey=${base}`,`MonthVisibleGod=${god}`],certainty:'CONDITIONAL'}));
  if(base==='DIRECT_OFFICER'){
    if(god==='HURTING_OFFICER') add('HURTING_OFFICER_PRESSURES_OFFICER','CHALLENGING','HIGH',['FRICTION','PRESSURE'],'本月输出与规则之间的拉扯较强，工作推进更需要处理边界与沟通。');
    if(['DIRECT_RESOURCE','INDIRECT_RESOURCE','DIRECT_WEALTH','INDIRECT_WEALTH'].includes(god)) add('OFFICER_ROUTE_SUPPORTED','SUPPORTIVE','HIGH',['SUPPORT','RESPONSIBILITY'],'本月对职位、责任与组织承接形成较明确支持。');
  }
  if(base==='SEVEN_KILLINGS'){
    if(god==='EATING_GOD') add('EATING_GOD_CONTROL_KILLING','SUPPORTIVE','HIGH',['SUPPORT','RESPONSIBILITY','GROWTH'],'本月更适合把压力转成可控输出与成果。');
    if(['DIRECT_RESOURCE','INDIRECT_RESOURCE'].includes(god)) add('KILLING_RESOURCE_TRANSFORMATION','SUPPORTIVE','HIGH',['SUPPORT','STABILITY_SUPPORT'],'本月支持与承接条件有助于消化高责任主题。');
  }
  if(['DIRECT_WEALTH','INDIRECT_WEALTH'].includes(base) && ['EATING_GOD','HURTING_OFFICER'].includes(god)) add('OUTPUT_GENERATES_WEALTH','SUPPORTIVE','HIGH',['GROWTH','OPPORTUNITY','MATERIAL_SUPPORT'],'本月输出与现实成果之间的连接更容易被激活。');
  if(['DIRECT_RESOURCE','INDIRECT_RESOURCE'].includes(base) && ['DIRECT_WEALTH','INDIRECT_WEALTH'].includes(god)) add('WEALTH_PRESSURES_RESOURCE','CHALLENGING','HIGH',['FRICTION','PRESSURE'],'本月现实成果与资源承接之间容易出现拉扯。');
  if(base==='EATING_GOD' && god==='INDIRECT_RESOURCE') add('INDIRECT_RESOURCE_PRESSURES_EATING_GOD','CHALLENGING','HIGH',['FRICTION','PRESSURE'],'本月输出节奏较容易受到资源或规则牵制。');
  if(base==='HURTING_OFFICER' && ['DIRECT_WEALTH','INDIRECT_WEALTH'].includes(god)) add('HURTING_OFFICER_WEALTH_ROUTE','SUPPORTIVE','HIGH',['GROWTH','OPPORTUNITY'],'本月主动输出较容易连接到现实成果。');
  if(base==='YANG_REN' && ['DIRECT_OFFICER','SEVEN_KILLINGS'].includes(god)) add('YANG_REN_AUTHORITY_ACTIVATED','MIXED','HIGH',['RESPONSIBILITY','FRICTION'],'本月责任与约束主题被明显激活，需要同时看承接与压力。');
  return out;
}

function monthEvidenceForSegment(chart,{dayun,year,monthPillar,segmentId}){
  const d=parsePillar(chart.day),m=parsePillar(monthPillar); const god=tenGod(d.stem,m.stem); const family=FAMILY[god];
  const meta=FAMILY_META[family] ?? {polarity:'MIXED',tags:[],meaning:'本月新的时运主题进入。'};
  const out=[evidence(`${segmentId}_VISIBLE_${god}`,'MONTH_TEN_GOD',`${god}_VISIBLE`,{
    polarity:meta.polarity,magnitude:'MODERATE',tags:meta.tags,plainMeaning:meta.meaning,
    technicalBasis:[`MonthPillar=${monthPillar}`,`VisibleTenGod=${god}`,`Dayun=${dayun}`,`Year=${year}`]
  })];
  out.push(...patternMonthEvidence(chart,monthPillar).map(x=>({...x,id:`${segmentId}_${x.id}`})));
  const graph=analyzeMonthRelations(chart,dayun,year,monthPillar); let n=0;
  for(const e of graph.edges){
    if(e.type==='CLASH') {
      const careerCoreTarget = e.target.scope==='DAYUN' || e.target.scope==='YEAR' || e.target.position==='MONTH_BRANCH';
      const activeCareerClash = e.status==='ACTIVE' && careerCoreTarget;
      out.push(evidence(`${segmentId}_REL_${n++}_CLASH`,'MONTH_RELATION','MONTH_CLASH',{
        polarity:'MIXED',
        magnitude:activeCareerClash?'HIGH':'MODERATE',
        tags:activeCareerClash?['TRANSITION','ENVIRONMENT_SHIFT']:(careerCoreTarget?['TRANSITION','FRICTION','REVIEW']:['RELATIONAL_RECONFIGURATION','REVIEW']),
        plainMeaning:activeCareerClash?'本月与事业核心时序或月令结构形成明显冲动，工作环境或职责更容易出现调整。':careerCoreTarget?'本月事业核心关系出现冲动，但同时存在其它牵制，需要保守综合。':'本月与原局其它位置形成关系变化；它会保留在技术依据中，但不单独升级为事业转折。',
        technicalBasis:[`Target=${e.target.scope}:${e.target.position}:${e.target.value}`,`Status=${e.status}`,`CareerCoreTarget=${careerCoreTarget}`],
        certainty:e.status.includes('REVIEW')?'CONDITIONAL':'CONFIRMED'
      }));
    }
    else if(['MUTUAL_PUNISHMENT','SELF_PUNISHMENT'].includes(e.type)) out.push(evidence(`${segmentId}_REL_${n++}_PUNISH`,'MONTH_RELATION',e.type,{
      polarity:'CHALLENGING',magnitude:'MODERATE',tags:['FRICTION','PRESSURE'],plainMeaning:'本月重复摩擦或压力主题更值得留意。',technicalBasis:[`Target=${e.target.scope}:${e.target.position}:${e.target.value}`]
    }));
    else if(e.type==='HARM') out.push(evidence(`${segmentId}_REL_${n++}_HARM`,'MONTH_RELATION','MONTH_HARM',{
      polarity:'CHALLENGING',magnitude:'LOW',tags:['FRICTION'],plainMeaning:'本月存在次级摩擦信号，需要结合现实协作状态观察。',technicalBasis:[`Target=${e.target.scope}:${e.target.position}:${e.target.value}`]
    }));
    else if(e.type==='SIX_COMBINATION') {
      const careerCoreTarget = e.target.scope==='DAYUN' || e.target.scope==='YEAR' || e.target.position==='MONTH_BRANCH';
      out.push(evidence(`${segmentId}_REL_${n++}_BIND`,'MONTH_RELATION','MONTH_BINDING',{
        polarity:'MIXED',magnitude:'MODERATE',tags:careerCoreTarget?['TRANSITION','RELATIONAL_RECONFIGURATION']:['RELATIONAL_RECONFIGURATION'],plainMeaning:careerCoreTarget?'本月与事业核心时序或月令结构出现牵制／重新组合，但不自动解释为吉凶或合化。':'本月出现关系牵制；它保留为技术修饰，不单独升级为事业转折。',technicalBasis:[`Target=${e.target.scope}:${e.target.position}:${e.target.value}`,`CareerCoreTarget=${careerCoreTarget}`]
      }));
    }
  }
  for(const a of graph.assemblies) out.push(evidence(`${segmentId}_ASSEMBLY_${a.type}_${a.candidateElement}`,'MONTH_ASSEMBLY',a.type,{
    polarity:'MIXED',magnitude:'MODERATE',tags:['TRANSITION','STRUCTURE_REORGANIZATION'],plainMeaning:'本月补全新的组合结构，工作资源或职责配置更容易重新组合。',technicalBasis:[`Branches=${a.branches.join('')}`,`Element=${a.candidateElement}`]
  }));
  for(const p of graph.punishmentCompletions) out.push(evidence(`${segmentId}_PUNISHMENT_COMPLETION`,'MONTH_PUNISHMENT_COMPLETION',p.type,{
    polarity:'CHALLENGING',magnitude:'HIGH',tags:['FRICTION','PRESSURE'],plainMeaning:'本月补全完整三刑结构，压力与摩擦主题需要提高警觉。',technicalBasis:[`Branches=${p.branches.join('')}`]
  }));
  return {evidence:out,relationGraph:graph,monthGod:god,monthFamily:family};
}

function dedupeEvidence(items){
  const seen=new Set(); const out=[];
  for(const x of items){
    const k=`${x.sourceType}|${x.sourceKey}|${x.polarity}|${x.magnitude}|${[...(x.tags??[])].sort().join(',')}|${(x.technicalBasis??[]).join('|')}`;
    if(seen.has(k)) continue; seen.add(k); out.push(x);
  }
  return out;
}

function currentDayunAt(ms,activeDayun,transitions){
  let p=activeDayun; for(const t of transitions) if(t.ms<=ms) p=t.pillarAfter; else break; return p;
}

function segmentWindow(startMs,endMs,activeDayun,transitions){
  const cuts=transitions.filter(t=>t.ms>startMs && t.ms<endMs);
  const points=[startMs,...cuts.map(x=>x.ms),endMs]; const out=[];
  for(let i=0;i<points.length-1;i++) out.push({startMs:points[i],endMs:points[i+1],dayun:currentDayunAt(points[i],activeDayun,transitions)});
  return out;
}

export function buildSixMonthTimingWindows({chart,asOf,activeDayun,activeYearPillar,jieBoundaries,dayunTransitions=[]}){
  parsePillar(chart.year); parsePillar(chart.month); parsePillar(chart.day); parsePillar(chart.hour);
  parsePillar(activeDayun); parsePillar(activeYearPillar);
  if(!JIAZI.includes(activeDayun)) throw new Error(`Active Dayun is not valid Jiazi: ${activeDayun}`);
  if(!JIAZI.includes(activeYearPillar)) throw new Error(`Active year pillar is not valid Jiazi: ${activeYearPillar}`);
  const asOfMs=parseInstant(asOf,'asOf');
  const rollingEnds=Array.from({length:6},(_,i)=>addCivilMonthsToInstant(asOf,i+1));
  const horizonEnd=rollingEnds[5];
  const boundaries=normalizeJieBoundaries(asOfMs,horizonEnd,jieBoundaries);
  const transitions=normalizeDayunTransitions(asOfMs,horizonEnd,dayunTransitions);
  const initialMonthBranch=previousMonthBranchForBoundary(boundaries[0].name);

  function stateAt(ms){
    let yearPillar=activeYearPillar; let monthBranch=initialMonthBranch;
    for(const b of boundaries){
      if(b.ms>ms) break;
      if(b.name==='立春') yearPillar=nextJiazi(yearPillar);
      monthBranch=b.monthBranch;
    }
    return {
      yearPillar,
      monthBranch,
      monthPillar:deriveMonthPillar(parsePillar(yearPillar).stem,monthBranch),
      dayun:currentDayunAt(ms,activeDayun,transitions)
    };
  }

  const windows=[];
  let bucketStart=asOfMs;
  for(let i=0;i<6;i++){
    const startMs=bucketStart; const endMs=rollingEnds[i]; bucketStart=endMs;
    const jieCuts=boundaries.filter(b=>b.ms>startMs && b.ms<endMs);
    const dayunCuts=transitions.filter(t=>t.ms>startMs && t.ms<endMs);
    const cutMap=new Map();
    for(const b of jieCuts) cutMap.set(b.ms,{type:'JIE',record:b});
    for(const t of dayunCuts) cutMap.set(t.ms,cutMap.has(t.ms)?{type:'MULTI',records:[cutMap.get(t.ms).record,t]}:{type:'DAYUN',record:t});
    const points=[startMs,...[...cutMap.keys()].sort((a,b)=>a-b),endMs];
    const segmentResults=[]; let ev=[];
    for(let sidx=0;sidx<points.length-1;sidx++){
      const segStart=points[sidx],segEnd=points[sidx+1]; const st=stateAt(segStart);
      const r=monthEvidenceForSegment(chart,{dayun:st.dayun,year:st.yearPillar,monthPillar:st.monthPillar,segmentId:`M${i+1}S${sidx+1}`});
      const windowCoverageRatio=(segEnd-segStart)/(endMs-startMs);
      const windowInfluence=windowCoverageRatio>=0.35?'PRIMARY':windowCoverageRatio>=0.15?'SECONDARY':'TRACE_ONLY';
      segmentResults.push({start:iso(segStart),end:iso(segEnd),...st,monthGod:r.monthGod,monthFamily:r.monthFamily,relationGraph:r.relationGraph,windowCoverageRatio,windowInfluence});
      ev.push(...r.evidence.map(x=>({...x,windowCoverageRatio,windowInfluence})));
    }
    if(dayunCuts.length) ev.push(evidence(`M${i+1}_DAYUN_TRANSITION`,'MONTH_BOUNDARY_EVENT','DAYUN_TRANSITION_INSIDE_WINDOW',{
      polarity:'MIXED',magnitude:'HIGH',tags:['TRANSITION','STRUCTURE_REORGANIZATION'],plainMeaning:'本分析月内部发生大运交接，前后阶段需要分开看。',technicalBasis:dayunCuts.map(t=>`DayunTransition=${iso(t.ms)}:${t.pillarAfter}`)
    }));
    for(const b of jieCuts){
      ev.push(evidence(`M${i+1}_JIE_${b.name}`,'MONTH_BOUNDARY_METADATA','EXACT_JIE_BOUNDARY_INSIDE_WINDOW',{
        polarity:'NEUTRAL',magnitude:'LOW',tags:['TIMING_BOUNDARY'],plainMeaning:'本分析月内部跨过节令月边界，前后月柱不同；这个技术边界本身不等于事业发生转折。',technicalBasis:[`Jie=${b.name}`,`Boundary=${b.instant}`]
      }));
      if(b.name==='立春') ev.push(evidence(`M${i+1}_LICHUN_YEAR_CHANGE`,'MONTH_BOUNDARY_EVENT','BAZI_YEAR_CHANGED_AT_LICHUN',{
        polarity:'MIXED',magnitude:'MODERATE',tags:['TRANSITION'],plainMeaning:'本分析月跨过立春，八字年度层在边界后切换。',technicalBasis:[`Boundary=${b.instant}`,`YearAfter=${stateAt(b.ms).yearPillar}`]
      }));
    }
    ev=dedupeEvidence(ev);
    const monthPillars=[...new Set(segmentResults.map(x=>x.monthPillar))];
    const yearPillars=[...new Set(segmentResults.map(x=>x.yearPillar))];
    const dayunPillars=[...new Set(segmentResults.map(x=>x.dayun))];
    windows.push({
      id:`M${i+1}`,index:i,label:`第${i+1}个月`,start:iso(startMs),end:iso(endMs),
      monthPillar:monthPillars.length===1?monthPillars[0]:null,monthPillars,yearPillars,dayunPillars,
      source:'MONTH_TIMING_ADAPTER_J2',upstreamBoundaryConfirmed:true,
      boundariesInside:jieCuts.map(b=>({name:b.name,instant:b.instant})),
      evidence:ev,segments:segmentResults,
      contracts:{leftClosedRightOpen:true,rollingCivilMonthBucket:true,exactJieSubsegments:true,natalRewritten:false}
    });
  }

  const baselineTiming=resolveTimingRelations(chart,{dayun:activeDayun,year:activeYearPillar});
  return {
    version:MONTH_TIMING_ADAPTER_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    asOf:iso(asOfMs),activeDayun,activeYearPillar,windows,
    horizon:{start:iso(asOfMs),end:iso(horizonEnd),model:'SIX_ROLLING_CIVIL_MONTH_BUCKETS_WITH_EXACT_JIE_SUBSEGMENTS'},
    upstream:{jieAuthority:'STEP01_EXACT_JIE_REQUIRED',dayunAuthority:'STEP01_DAYUN_EXACT_REQUIRED_IF_TRANSITION_IN_HORIZON'},
    contracts:{
      exactSixCivilMonths:true,
      exactJieBoundariesRequired:true,
      yearChangesOnlyAtLiChunBoundary:true,
      monthBranchChangesOnlyAtJieBoundary:true,
      jieMaySplitAnalysisWindow:true,
      dayunMaySplitAnalysisWindow:true,
      dayunTransitionDoesNotRewriteNatal:true,
      monthLayerDoesNotRewriteNatal:true,
      monthLayerDoesNotAutoTransformCombinations:true,
      segmentCoverageAwareAggregation:true,
      minorSegmentTraceDoesNotEqualFullWindowSignal:true,
      numericScoreUsed:false,percentConfidenceUsed:false
    },
    baselineNatalInvariant:baselineTiming.natalInvariant,
    trace:[
      `ASOF=${iso(asOfMs)}`,`HORIZON_END=${iso(horizonEnd)}`,`ACTIVE_YEAR=${activeYearPillar}`,`ACTIVE_DAYUN=${activeDayun}`,
      `WINDOWS=${windows.map(w=>`${w.id}:${w.monthPillars.join('/')}:${w.start}->${w.end}`).join('|')}`,
      `DAYUN_TRANSITIONS=${transitions.map(t=>`${iso(t.ms)}:${t.pillarAfter}`).join('|')||'NONE'}`,
      'ANALYSIS_WINDOWS=ROLLING_CIVIL_MONTHS','MONTH_BRANCH_BOUNDARY=EXACT_JIE','YEAR_BOUNDARY=LICHUN_ONLY','NATAL_REWRITE=NO'
    ]
  };
}

/**
 * P2 12-month extension of the frozen J2 Month Timing Adapter.
 * It reuses the same exact-Jie, Five-Tigers, relation, Dayun-transition and
 * segment-coverage authority. The frozen six-month builder above is unchanged.
 */
export function buildTwelveMonthTimingWindows({chart,asOf,activeDayun,activeYearPillar,jieBoundaries,dayunTransitions=[]}){
  parsePillar(chart.year); parsePillar(chart.month); parsePillar(chart.day); parsePillar(chart.hour);
  parsePillar(activeDayun); parsePillar(activeYearPillar);
  if(!JIAZI.includes(activeDayun)) throw new Error(`Active Dayun is not valid Jiazi: ${activeDayun}`);
  if(!JIAZI.includes(activeYearPillar)) throw new Error(`Active year pillar is not valid Jiazi: ${activeYearPillar}`);
  const asOfMs=parseInstant(asOf,'asOf');
  const rollingEnds=Array.from({length:12},(_,i)=>addCivilMonthsToInstant(asOf,i+1));
  const horizonEnd=rollingEnds[11];
  const boundaries=normalizeJieBoundaries(asOfMs,horizonEnd,jieBoundaries);
  const transitions=normalizeDayunTransitions(asOfMs,horizonEnd,dayunTransitions);
  const initialMonthBranch=previousMonthBranchForBoundary(boundaries[0].name);

  function stateAt(ms){
    let yearPillar=activeYearPillar; let monthBranch=initialMonthBranch;
    for(const b of boundaries){
      if(b.ms>ms) break;
      if(b.name==='立春') yearPillar=nextJiazi(yearPillar);
      monthBranch=b.monthBranch;
    }
    return {
      yearPillar,
      monthBranch,
      monthPillar:deriveMonthPillar(parsePillar(yearPillar).stem,monthBranch),
      dayun:currentDayunAt(ms,activeDayun,transitions)
    };
  }

  const windows=[];
  let bucketStart=asOfMs;
  for(let i=0;i<12;i++){
    const startMs=bucketStart; const endMs=rollingEnds[i]; bucketStart=endMs;
    const jieCuts=boundaries.filter(b=>b.ms>startMs && b.ms<endMs);
    const dayunCuts=transitions.filter(t=>t.ms>startMs && t.ms<endMs);
    const cutMap=new Map();
    for(const b of jieCuts) cutMap.set(b.ms,{type:'JIE',record:b});
    for(const t of dayunCuts) cutMap.set(t.ms,cutMap.has(t.ms)?{type:'MULTI',records:[cutMap.get(t.ms).record,t]}:{type:'DAYUN',record:t});
    const points=[startMs,...[...cutMap.keys()].sort((a,b)=>a-b),endMs];
    const segmentResults=[]; let ev=[];
    for(let sidx=0;sidx<points.length-1;sidx++){
      const segStart=points[sidx],segEnd=points[sidx+1]; const st=stateAt(segStart);
      const r=monthEvidenceForSegment(chart,{dayun:st.dayun,year:st.yearPillar,monthPillar:st.monthPillar,segmentId:`M${i+1}S${sidx+1}`});
      const windowCoverageRatio=(segEnd-segStart)/(endMs-startMs);
      const windowInfluence=windowCoverageRatio>=0.35?'PRIMARY':windowCoverageRatio>=0.15?'SECONDARY':'TRACE_ONLY';
      segmentResults.push({start:iso(segStart),end:iso(segEnd),...st,monthGod:r.monthGod,monthFamily:r.monthFamily,relationGraph:r.relationGraph,windowCoverageRatio,windowInfluence});
      ev.push(...r.evidence.map(x=>({...x,windowCoverageRatio,windowInfluence})));
    }
    if(dayunCuts.length) ev.push(evidence(`M${i+1}_DAYUN_TRANSITION`,'MONTH_BOUNDARY_EVENT','DAYUN_TRANSITION_INSIDE_WINDOW',{
      polarity:'MIXED',magnitude:'HIGH',tags:['TRANSITION','STRUCTURE_REORGANIZATION'],plainMeaning:'本分析月内部发生大运交接，前后阶段需要分开看。',technicalBasis:dayunCuts.map(t=>`DayunTransition=${iso(t.ms)}:${t.pillarAfter}`)
    }));
    for(const b of jieCuts){
      ev.push(evidence(`M${i+1}_JIE_${b.name}`,'MONTH_BOUNDARY_METADATA','EXACT_JIE_BOUNDARY_INSIDE_WINDOW',{
        polarity:'NEUTRAL',magnitude:'LOW',tags:['TIMING_BOUNDARY'],plainMeaning:'本分析月内部跨过节令月边界，前后月柱不同；这个技术边界本身不等于事业发生转折。',technicalBasis:[`Jie=${b.name}`,`Boundary=${b.instant}`]
      }));
      if(b.name==='立春') ev.push(evidence(`M${i+1}_LICHUN_YEAR_CHANGE`,'MONTH_BOUNDARY_EVENT','BAZI_YEAR_CHANGED_AT_LICHUN',{
        polarity:'MIXED',magnitude:'MODERATE',tags:['TRANSITION'],plainMeaning:'本分析月跨过立春，八字年度层在边界后切换。',technicalBasis:[`Boundary=${b.instant}`,`YearAfter=${stateAt(b.ms).yearPillar}`]
      }));
    }
    ev=dedupeEvidence(ev);
    const monthPillars=[...new Set(segmentResults.map(x=>x.monthPillar))];
    const yearPillars=[...new Set(segmentResults.map(x=>x.yearPillar))];
    const dayunPillars=[...new Set(segmentResults.map(x=>x.dayun))];
    windows.push({
      id:`M${i+1}`,index:i,label:`第${i+1}个月`,start:iso(startMs),end:iso(endMs),
      monthPillar:monthPillars.length===1?monthPillars[0]:null,monthPillars,yearPillars,dayunPillars,
      source:'MONTH_TIMING_ADAPTER_J2_P2_12M_EXTENSION',upstreamBoundaryConfirmed:true,
      boundariesInside:jieCuts.map(b=>({name:b.name,instant:b.instant})),
      evidence:ev,segments:segmentResults,
      contracts:{leftClosedRightOpen:true,rollingCivilMonthBucket:true,exactJieSubsegments:true,natalRewritten:false}
    });
  }

  const baselineTiming=resolveTimingRelations(chart,{dayun:activeDayun,year:activeYearPillar});
  return {
    version:'GUANCHENG_MONTH_TIMING_ADAPTER_12M_EXTENSION_V1_STEP02_P2',
    parentAuthorityVersion:MONTH_TIMING_ADAPTER_VERSION,
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    asOf:iso(asOfMs),activeDayun,activeYearPillar,windows,
    horizon:{start:iso(asOfMs),end:iso(horizonEnd),model:'TWELVE_ROLLING_CIVIL_MONTH_BUCKETS_WITH_EXACT_JIE_SUBSEGMENTS'},
    upstream:{jieAuthority:'STEP01_EXACT_JIE_REQUIRED',dayunAuthority:'STEP01_DAYUN_EXACT_REQUIRED_IF_TRANSITION_IN_HORIZON'},
    contracts:{
      exactTwelveCivilMonths:true,
      exactJieBoundariesRequired:true,
      yearChangesOnlyAtLiChunBoundary:true,
      monthBranchChangesOnlyAtJieBoundary:true,
      jieMaySplitAnalysisWindow:true,
      dayunMaySplitAnalysisWindow:true,
      dayunTransitionDoesNotRewriteNatal:true,
      monthLayerDoesNotRewriteNatal:true,
      monthLayerDoesNotAutoTransformCombinations:true,
      segmentCoverageAwareAggregation:true,
      minorSegmentTraceDoesNotEqualFullWindowSignal:true,
      numericScoreUsed:false,percentConfidenceUsed:false
    },
    baselineNatalInvariant:baselineTiming.natalInvariant,
    trace:[
      `ASOF=${iso(asOfMs)}`,`HORIZON_END=${iso(horizonEnd)}`,`ACTIVE_YEAR=${activeYearPillar}`,`ACTIVE_DAYUN=${activeDayun}`,
      `WINDOWS=${windows.map(w=>`${w.id}:${w.monthPillars.join('/')}:${w.start}->${w.end}`).join('|')}`,
      `DAYUN_TRANSITIONS=${transitions.map(t=>`${iso(t.ms)}:${t.pillarAfter}`).join('|')||'NONE'}`,
      'ANALYSIS_WINDOWS=TWELVE_ROLLING_CIVIL_MONTHS','MONTH_BRANCH_BOUNDARY=EXACT_JIE','YEAR_BOUNDARY=LICHUN_ONLY','NATAL_REWRITE=NO'
    ]
  };
}

export function synthesizeCareerNext6mWithMonthAdapter(input,contextId='CTX_NONE'){
  const adapter=buildSixMonthTimingWindows(input);
  const result=synthesizeCareerNext6m(input.chart,{dayun:input.activeDayun,year:input.activeYearPillar},adapter.windows,contextId);
  return {
    version:'GUANCHENG_CAREER_NEXT_6M_MONTH_ADAPTER_BRIDGE_V1_STEP02_J2',
    authorityStatus:'PROTOTYPE_NOT_FINAL',
    adapter,
    synthesis:result,
    contracts:{
      j1MonthAuthorityImplementedHere:false,
      j2MonthAdapterAuthorityImplemented:true,
      monthWindowsFromExactJieAuthority:true,
      contextRewritesMonthEvidence:false,
      natalStrengthRewritten:adapter.baselineNatalInvariant.natalStrengthRewritten,
      natalStructureRewritten:adapter.baselineNatalInvariant.natalStructureRewritten
    }
  };
}
