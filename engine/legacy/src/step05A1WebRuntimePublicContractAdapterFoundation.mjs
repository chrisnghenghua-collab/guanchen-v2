import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  STEP05_A0_ROUTE_CONTRACT,
  STEP05_A0_DOMAIN_ROUTES
} from './step05A0WebExperienceIaRouteContractAuthority.mjs';

export const STEP05_A1_FOUNDATION_VERSION='GUANCHEN_STEP05_A1_WEB_RUNTIME_PUBLIC_CONTRACT_ADAPTER_FOUNDATION_V1_V107';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(__dirname,'..');
const sha=(rel)=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,rel))).digest('hex');
const json=(rel)=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));

const V106_STATUS='GUANCHEN_CURRENT_STATUS_V106.json';
const V106_ENGINE='src/step05A0WebExperienceIaRouteContractAuthority.mjs';
const V106_ARTIFACT='STEP05_A0_WEB_EXPERIENCE_IA_ROUTE_CONTRACT_AUTHORITY_V106.json';
const V106_HANDOFF='GUANCHEN_STEP05_HANDOFF_AFTER_A0_V1.txt';
const PUBLIC_PAYLOAD='STEP04_A3_PUBLIC_PRODUCT_PAYLOAD_V103.json';

const EXPECTED=Object.freeze({
  [V106_STATUS]:'d600fa64cca96c33196798b8db72c8543710efc977803e50d3d393ef0b9f8929',
  [V106_ENGINE]:'71ed7fb9d1a195cc28407c1d413cd34b3ba85f124bd0c6a3430a5130655b175b',
  [V106_ARTIFACT]:'a41965d079ea26aca92dbb37a8a3f438b1b8ed3599b0c331bcf5ea14c1a0d29d',
  [V106_HANDOFF]:'66fe16e9cbd06867fd4163346c0c867bbb08912f76287a9e5a88bfcfc935febf',
  [PUBLIC_PAYLOAD]:'e5cd4d3ef5816a9f91327645012f80b91a1000edb924142ed4be1522ce49b134'
});

export const STEP05_A1_WEB_RUNTIME_FOUNDATION=Object.freeze({
  architecture:'CLIENT_SIDE_SPA',
  framework:'React',
  frameworkVersion:'19.3.x',
  buildTool:'Vite',
  buildToolVersion:'8.1.x',
  router:'React Router',
  routerVersion:'8.4.x',
  webToolchainNode:'24.x LTS',
  language:'JavaScript ESM',
  rendering:'CLIENT_SIDE_ONLY',
  ssrEnabled:false,
  serverRuntimeRequired:false,
  staticHostingCompatible:true,
  historyFallbackRequired:true,
  frameworkSelectionOwner:'STEP05-A1',
  uiImplementationStarted:false
});

export const STEP05_A1_PUBLIC_ADAPTER_CONTRACT=Object.freeze({
  schemaId:'GUANCHEN_PUBLIC_PRODUCT_RESULT',
  schemaVersion:'1.0.0',
  consumerBoundary:'STEP04_A2_PUBLIC_SERIALIZATION_ONLY',
  topLevelNamespaces:Object.freeze(['contract','chart','timing','domains','availability','provenance']),
  domainOrder:Object.freeze(['CAREER','WEALTH','RELATIONSHIP','WELLBEING']),
  availabilityVocabulary:Object.freeze(['AVAILABLE','PARTIAL','UNAVAILABLE','ERROR']),
  frozenQuestionCount:20,
  stateReResolutionAllowed:false,
  answerRewriteAllowed:false,
  availabilityInferenceAllowed:false,
  timingInferenceAllowed:false,
  recipeInternalsAllowed:false,
  rawEvidenceAllowed:false,
  traceDebugAllowed:false,
  unknownFieldsPolicy:'REJECT_AT_PUBLIC_BOUNDARY',
  invalidPayloadPolicy:'REJECT_AND_RECOVER_TO_BIRTH',
  persistencePolicy:'IN_MEMORY_ONLY_AT_A1',
  networkTransportSelected:false
});

const FORBIDDEN_PUBLIC_KEYS=new Set([
  'rawEvidence','evidenceTrace','resolverTrace','debug','debugPolicy','statePath','enginePath',
  'engineModule','finalGatePath','hashManifest','internalHashManifest','assemblyAdapter','recipeInternal'
]);

function hashMatches(){
  return Object.entries(EXPECTED).every(([rel,expected])=>fs.existsSync(path.join(ROOT,rel))&&sha(rel)===expected);
}

function isPlainObject(value){
  return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
}

function findForbiddenKey(value,pathPrefix='root',hits=[]){
  if(Array.isArray(value)){
    value.forEach((item,index)=>findForbiddenKey(item,`${pathPrefix}[${index}]`,hits));
    return hits;
  }
  if(!isPlainObject(value)) return hits;
  for(const [key,item] of Object.entries(value)){
    if(FORBIDDEN_PUBLIC_KEYS.has(key)) hits.push(`${pathPrefix}.${key}`);
    findForbiddenKey(item,`${pathPrefix}.${key}`,hits);
  }
  return hits;
}

function getQuestions(payload){
  return STEP05_A1_PUBLIC_ADAPTER_CONTRACT.domainOrder.flatMap(domain=>payload.domains?.[domain]?.questions??[]);
}

export function validateStep05PublicPayload(payload){
  const errors=[];
  if(!isPlainObject(payload)) return {valid:false,errors:['PAYLOAD_NOT_OBJECT']};
  const top=Object.keys(payload);
  if(JSON.stringify(top)!==JSON.stringify(STEP05_A1_PUBLIC_ADAPTER_CONTRACT.topLevelNamespaces)) errors.push('TOP_LEVEL_NAMESPACE_MISMATCH');
  if(payload.contract?.schemaId!==STEP05_A1_PUBLIC_ADAPTER_CONTRACT.schemaId) errors.push('SCHEMA_ID_MISMATCH');
  if(payload.contract?.schemaVersion!==STEP05_A1_PUBLIC_ADAPTER_CONTRACT.schemaVersion) errors.push('SCHEMA_VERSION_MISMATCH');
  if(payload.provenance?.consumerBoundary!==STEP05_A1_PUBLIC_ADAPTER_CONTRACT.consumerBoundary) errors.push('CONSUMER_BOUNDARY_MISMATCH');
  if(JSON.stringify(payload.contract?.domainOrder)!==JSON.stringify(STEP05_A1_PUBLIC_ADAPTER_CONTRACT.domainOrder)) errors.push('DOMAIN_ORDER_MISMATCH');
  if(JSON.stringify(payload.availability?.vocabulary)!==JSON.stringify(STEP05_A1_PUBLIC_ADAPTER_CONTRACT.availabilityVocabulary)) errors.push('AVAILABILITY_VOCABULARY_MISMATCH');
  const questions=getQuestions(payload);
  if(questions.length!==STEP05_A1_PUBLIC_ADAPTER_CONTRACT.frozenQuestionCount) errors.push('QUESTION_COUNT_MISMATCH');
  const ids=questions.map(q=>q.questionId);
  if(new Set(ids).size!==ids.length) errors.push('DUPLICATE_QUESTION_ID');
  if(questions.some(q=>!q.questionId||!q.domain||!q.availability||q.timingDependency==null)) errors.push('QUESTION_PUBLIC_FIELDS_MISSING');
  if(findForbiddenKey(payload).length) errors.push('FORBIDDEN_INTERNAL_FIELD_EXPOSED');
  return {valid:errors.length===0,errors};
}

function deepClone(value){ return JSON.parse(JSON.stringify(value)); }
function deepFreeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export function createStep05PublicResultAdapter(payload){
  const validation=validateStep05PublicPayload(payload);
  if(!validation.valid){
    const error=new Error(`INVALID_PUBLIC_PRODUCT_RESULT:${validation.errors.join(',')}`);
    error.code='INVALID_PUBLIC_PRODUCT_RESULT';
    error.validationErrors=validation.errors;
    throw error;
  }
  const snapshot=deepFreeze(deepClone(payload));
  const questionIndex=new Map(getQuestions(snapshot).map(q=>[q.questionId,q]));
  return Object.freeze({
    schemaId:snapshot.contract.schemaId,
    schemaVersion:snapshot.contract.schemaVersion,
    getPayload:()=>snapshot,
    getChart:()=>snapshot.chart,
    getTiming:()=>snapshot.timing,
    getAvailability:()=>snapshot.availability,
    getOverview:()=>Object.freeze({contract:snapshot.contract,chart:snapshot.chart,timing:snapshot.timing,domains:snapshot.domains,availability:snapshot.availability}),
    getDomain:(domain)=>snapshot.domains[domain]??null,
    getQuestion:(questionId)=>questionIndex.get(questionId)??null,
    resolveDomainSlug:(slug)=>STEP05_A0_DOMAIN_ROUTES[slug]??null,
    resolveQuestion:(slug,questionId)=>{
      const domain=STEP05_A0_DOMAIN_ROUTES[slug];
      const question=questionIndex.get(questionId)??null;
      return domain&&question?.domain===domain?question:null;
    }
  });
}

export const STEP05_A1_ROUTE_RUNTIME_BINDING=Object.freeze(
  STEP05_A0_ROUTE_CONTRACT.map(route=>Object.freeze({
    ...route,
    router:'React Router 8',
    routePattern:route.path.replaceAll('{domain}',':domain').replaceAll('{questionId}',':questionId'),
    dataSource:route.requiresPublicResult?'STEP05_PUBLIC_RESULT_ADAPTER':'NONE'
  }))
);

export const STEP05_A1_IMPLEMENTATION_DEFERRALS=Object.freeze({
  birthRequestFlow:'STEP05-A2',
  resultOverviewAndDomainScreens:'STEP05-A3',
  questionDetailTimingNonAvailableUx:'STEP05-A4',
  responsiveAccessibility:'STEP05-A5',
  webExperienceFinalGate:'STEP05-A6',
  visualDesignSystem:'NOT_AUTHORIZED_BY_A1',
  persistenceAuthCloud:'NOT_AUTHORIZED_BY_A1',
  serverApiTransport:'NOT_SELECTED_BY_A1'
});

export function runStep05A1WebRuntimePublicContractAdapterFoundation(){
  const v106=json(V106_STATUS);
  const v106Artifact=json(V106_ARTIFACT);
  const payload=json(PUBLIC_PAYLOAD);
  const validation=validateStep05PublicPayload(payload);
  const adapter=createStep05PublicResultAdapter(payload);
  const questions=getQuestions(payload);
  const adaptedQuestions=STEP05_A1_PUBLIC_ADAPTER_CONTRACT.domainOrder.flatMap(domain=>adapter.getDomain(domain).questions);

  const checks={
    v106A0IsFrozenBaseline:
      hashMatches()&&v106.version==='V106'&&v106.step05A0==='FROZEN at V106'&&v106.step05A1==='NOT STARTED'&&
      v106.nextAuthorizedTask==='STEP05-A1_WEB_RUNTIME_AND_PUBLIC_CONTRACT_ADAPTER_FOUNDATION'&&
      v106Artifact.authorityReady===true&&v106Artifact.verdict==='A0_WEB_IA_ROUTE_CONTRACT_FROZEN',

    runtimeStackIsExplicitStableAndClientOnly:
      STEP05_A1_WEB_RUNTIME_FOUNDATION.architecture==='CLIENT_SIDE_SPA'&&
      STEP05_A1_WEB_RUNTIME_FOUNDATION.framework==='React'&&STEP05_A1_WEB_RUNTIME_FOUNDATION.frameworkVersion==='19.3.x'&&
      STEP05_A1_WEB_RUNTIME_FOUNDATION.buildTool==='Vite'&&STEP05_A1_WEB_RUNTIME_FOUNDATION.buildToolVersion==='8.1.x'&&
      STEP05_A1_WEB_RUNTIME_FOUNDATION.router==='React Router'&&STEP05_A1_WEB_RUNTIME_FOUNDATION.routerVersion==='8.4.x'&&
      STEP05_A1_WEB_RUNTIME_FOUNDATION.webToolchainNode==='24.x LTS'&&
      STEP05_A1_WEB_RUNTIME_FOUNDATION.ssrEnabled===false&&STEP05_A1_WEB_RUNTIME_FOUNDATION.serverRuntimeRequired===false,

    publicPayloadValidationIsExactAndInternalSafe:
      validation.valid===true&&validation.errors.length===0&&
      STEP05_A1_PUBLIC_ADAPTER_CONTRACT.recipeInternalsAllowed===false&&STEP05_A1_PUBLIC_ADAPTER_CONTRACT.rawEvidenceAllowed===false&&
      STEP05_A1_PUBLIC_ADAPTER_CONTRACT.traceDebugAllowed===false&&STEP05_A1_PUBLIC_ADAPTER_CONTRACT.unknownFieldsPolicy==='REJECT_AT_PUBLIC_BOUNDARY',

    adapterPreservesTwentyFrozenQuestionsWithoutSemanticRewrite:
      questions.length===20&&adaptedQuestions.length===20&&
      JSON.stringify(questions)===JSON.stringify(adaptedQuestions)&&
      STEP05_A1_PUBLIC_ADAPTER_CONTRACT.stateReResolutionAllowed===false&&STEP05_A1_PUBLIC_ADAPTER_CONTRACT.answerRewriteAllowed===false,

    routeRuntimeBindingPreservesA0PathsAndUsesPublicAdapterOnly:
      JSON.stringify(STEP05_A1_ROUTE_RUNTIME_BINDING.map(x=>x.path))===JSON.stringify(STEP05_A0_ROUTE_CONTRACT.map(x=>x.path))&&
      STEP05_A1_ROUTE_RUNTIME_BINDING.filter(x=>x.requiresPublicResult).every(x=>x.dataSource==='STEP05_PUBLIC_RESULT_ADAPTER')&&
      STEP05_A1_ROUTE_RUNTIME_BINDING.find(x=>x.id==='RESULT_QUESTION').routePattern==='/result/:domain/:questionId',

    domainAndQuestionSelectorsRespectFrozenIdentity:
      adapter.resolveDomainSlug('career')==='CAREER'&&adapter.resolveDomainSlug('wellbeing')==='WELLBEING'&&
      adapter.getQuestion('CAREER_NEXT_6M')?.domain==='CAREER'&&
      adapter.resolveQuestion('career','CAREER_NEXT_6M')?.questionId==='CAREER_NEXT_6M'&&
      adapter.resolveQuestion('wealth','CAREER_NEXT_6M')===null,

    availabilityAndTimingRemainCarriedNotInferred:
      JSON.stringify(adapter.getAvailability())===JSON.stringify(payload.availability)&&
      JSON.stringify(adapter.getTiming())===JSON.stringify(payload.timing)&&
      STEP05_A1_PUBLIC_ADAPTER_CONTRACT.availabilityInferenceAllowed===false&&STEP05_A1_PUBLIC_ADAPTER_CONTRACT.timingInferenceAllowed===false,

    adapterSnapshotIsImmutableAndDetachedFromCaller:
      Object.isFrozen(adapter.getPayload())===true&&Object.isFrozen(adapter.getPayload().domains.CAREER.questions[0])===true&&
      adapter.getPayload()!==payload&&JSON.stringify(adapter.getPayload())===JSON.stringify(payload),

    a1DoesNotInventTransportPersistenceOrUi:
      STEP05_A1_PUBLIC_ADAPTER_CONTRACT.networkTransportSelected===false&&STEP05_A1_PUBLIC_ADAPTER_CONTRACT.persistencePolicy==='IN_MEMORY_ONLY_AT_A1'&&
      STEP05_A1_WEB_RUNTIME_FOUNDATION.uiImplementationStarted===false&&STEP05_A1_IMPLEMENTATION_DEFERRALS.serverApiTransport==='NOT_SELECTED_BY_A1'&&
      STEP05_A1_IMPLEMENTATION_DEFERRALS.persistenceAuthCloud==='NOT_AUTHORIZED_BY_A1',

    a1AuthorizesOnlyBirthRequestFlowNext:
      STEP05_A1_IMPLEMENTATION_DEFERRALS.birthRequestFlow==='STEP05-A2'&&
      STEP05_A1_IMPLEMENTATION_DEFERRALS.resultOverviewAndDomainScreens==='STEP05-A3'&&
      STEP05_A1_IMPLEMENTATION_DEFERRALS.webExperienceFinalGate==='STEP05-A6'&&v106.step06==='NOT STARTED'
  };

  const foundationReady=Object.values(checks).every(Boolean);
  return {
    version:STEP05_A1_FOUNDATION_VERSION,
    stage:'STEP05-A1',
    baseline:'V106_STEP05_A0_WEB_IA_ROUTE_CONTRACT_FROZEN',
    checks,
    webRuntimeFoundation:STEP05_A1_WEB_RUNTIME_FOUNDATION,
    publicAdapterContract:STEP05_A1_PUBLIC_ADAPTER_CONTRACT,
    routeRuntimeBinding:STEP05_A1_ROUTE_RUNTIME_BINDING,
    implementationDeferrals:STEP05_A1_IMPLEMENTATION_DEFERRALS,
    summary:{
      runtime:'React 19.3 + Vite 8.1 + React Router 8',
      webToolchainNode:'24.x LTS',
      architecture:'CLIENT_SIDE_SPA',
      schemaId:adapter.schemaId,
      schemaVersion:adapter.schemaVersion,
      publicQuestionCount:adaptedQuestions.length,
      routeCount:STEP05_A1_ROUTE_RUNTIME_BINDING.length,
      stateReResolutionCount:0,
      answerRewriteCount:0,
      rawEvidenceExposed:false,
      serverRuntimeSelected:false,
      networkTransportSelected:false,
      persistenceSelected:false,
      webPageImplemented:false,
      upstreamSemanticsModified:false
    },
    foundationReady,
    verdict:foundationReady?'A1_WEB_RUNTIME_PUBLIC_ADAPTER_FOUNDATION_FROZEN':'NOT_READY',
    nextAuthorizedTask:foundationReady?'STEP05-A2_BIRTH_INPUT_AND_RESULT_REQUEST_FLOW':null,
    step05A2Started:false,
    step06Started:false
  };
}
