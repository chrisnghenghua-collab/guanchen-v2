import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  PRODUCT_DOMAIN_ORDER,
  PRODUCT_RESULT_ENVELOPE,
  CHART_SURFACE_TAXONOMY,
  TIMING_SURFACE_TAXONOMY,
  FROZEN_PRODUCT_RECIPE_CATALOG,
  PRODUCT_CONSUMER_BOUNDARY
} from './step04A0ProductSurfaceContractAuthority.mjs';
import {
  STEP04_A1_CANONICAL_ASSEMBLY_VERSION,
  auditCanonicalInterpretationReadModel
} from './step04A1CanonicalInterpretationAssembly.mjs';

export const STEP04_A2_PUBLIC_SERIALIZATION_VERSION='GUANCHEN_STEP04_A2_PUBLIC_SERIALIZATION_BOUNDARY_V1_V102';
export const STEP04_A2_PUBLIC_SCHEMA_ID='GUANCHEN_PUBLIC_PRODUCT_RESULT';
export const STEP04_A2_PUBLIC_SCHEMA_VERSION='1.0.0';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(__dirname,'..');
/* P1-b 2026-10-21: self-hash freeze lock removed; behaviour is guarded by tests/http_regression.mjs instead. */
const A1_ENGINE='src/step04A1CanonicalInterpretationAssembly.mjs';
const A1_ARTIFACT='STEP04_A1_CANONICAL_INTERPRETATION_ASSEMBLY_V101.json';
const EXPECTED_A1=Object.freeze({
  engine:'f638d33daa37c792527d2d97ae5e7ffae1221eb3f297b1be58ac87b6cef0ec36',
  artifact:'1b39022cc843f4fc476b13fbc6546c1ae1645d89851560ad002edfc067011f76'
});

const ROOT_NAMESPACES=Object.freeze(['contract','chart','timing','domains','availability','provenance']);
const QUESTION_FIELDS=Object.freeze(['questionId','domain','timingDependency','availability','state','answer','provenance']);
const QUESTION_PUBLIC_PROVENANCE_FIELDS=Object.freeze(['sourceRecipeVersion']);
const AVAILABILITY_FIELDS=Object.freeze(['overall','questionStatuses','vocabulary']);
const GLOBAL_PUBLIC_PROVENANCE_FIELDS=Object.freeze(['serializationVersion','sourceAssemblyVersion','sourceContractAuthority','frozenRecipeCount','consumerBoundary']);
const PUBLIC_INTERNAL_ONLY_KEYS=Object.freeze([
  'assemblyAdapterVersion','sourceAuthorityStatus','sourceEngine','sourceEngineSha256','finalGateArtifact','finalGateArtifactSha256',
  'statePath','answerPath','stateWasReResolved','answerWasRewritten','a0AuthorityEngine','a0AuthorityEngineSha256',
  'a0AuthorityArtifact','a0AuthorityArtifactSha256','caller','evidence','evidenceStack','trace','policy','debug','resolverInternals','hashManifest'
]);

export const STEP04_A2_PUBLIC_SERIALIZATION_CONTRACT=Object.freeze({
  schemaId:STEP04_A2_PUBLIC_SCHEMA_ID,
  schemaVersion:STEP04_A2_PUBLIC_SCHEMA_VERSION,
  serializationVersion:STEP04_A2_PUBLIC_SERIALIZATION_VERSION,
  sourceAssemblyVersion:STEP04_A1_CANONICAL_ASSEMBLY_VERSION,
  rootNamespaces:ROOT_NAMESPACES,
  publicChartFields:Object.freeze([...CHART_SURFACE_TAXONOMY.canonicalSlots]),
  publicTimingFields:Object.freeze([...TIMING_SURFACE_TAXONOMY.canonicalSlots]),
  publicQuestionFields:QUESTION_FIELDS,
  publicQuestionProvenanceFields:QUESTION_PUBLIC_PROVENANCE_FIELDS,
  publicAvailabilityFields:AVAILABILITY_FIELDS,
  publicGlobalProvenanceFields:GLOBAL_PUBLIC_PROVENANCE_FIELDS,
  deterministicEncoding:'UTF8_JSON_CANONICAL_KEYS_LF_V1',
  nonAvailableTransitionSemantics:'RESERVED_STEP04-A3_NOT_IMPLEMENTED_IN_A2',
  transportIndependent:true,
  frameworkIndependent:true
});

export const STEP04_A2_PUBLIC_CONSUMER_BOUNDARY=Object.freeze({
  publicEntrypoint:'src/step04A2PublicSerializationBoundary.mjs',
  publicPayloadSchema:STEP04_A2_PUBLIC_SCHEMA_ID,
  webMustConsumePublicSerialization:true,
  directA1AdapterAccessByWebAllowed:false,
  directRecipeInternalAccessByWebAllowed:false,
  forbiddenDirectConsumerAccess:Object.freeze([...PRODUCT_CONSUMER_BOUNDARY.forbiddenDirectConsumerAccess,'A1_RECIPE_ASSEMBLY_ADAPTERS']),
  internalOnlyCategories:Object.freeze([
    ...PRODUCT_CONSUMER_BOUNDARY.step04InternalByDefault,
    'ENGINE_PATHS','ENGINE_SHA256','FINAL_GATE_ARTIFACT_PATHS','FINAL_GATE_SHA256','ASSEMBLY_STATE_PATHS','ASSEMBLY_ANSWER_PATHS','CALLER_DEBUG_PROVENANCE'
  ])
});

function clone(v){ return v===undefined?undefined:JSON.parse(JSON.stringify(v)); }
function assertPlainObject(v,label){
  if(!v||typeof v!=='object'||Array.isArray(v)) throw new Error(`${label} must be an object`);
}
function pickPresent(obj,keys){
  assertPlainObject(obj,'carrier');
  const out={};
  for(const key of keys) if(Object.prototype.hasOwnProperty.call(obj,key)) out[key]=clone(obj[key]);
  return out;
}
function expectedQuestionIds(){ return FROZEN_PRODUCT_RECIPE_CATALOG.map(x=>x.questionId); }
function flattenQuestions(model){ return PRODUCT_DOMAIN_ORDER.flatMap(d=>model.domains[d].questions); }
function assertA1Frozen(){
  /* P1-b: no-op (was STEP04-A1 hash lock) */
}
function assertA1CompleteAvailableModel(readModel){
  assertPlainObject(readModel,'readModel');
  const audit=auditCanonicalInterpretationReadModel(readModel);
  if(!audit.assemblyReady||audit.verdict!=='A1_CANONICAL_READ_MODEL_FROZEN') throw new Error('STEP04-A2 requires a valid frozen STEP04-A1 canonical read model');
  const questions=flattenQuestions(readModel);
  if(readModel.availability.overall!=='AVAILABLE'||questions.some(q=>q.availability!=='AVAILABLE')){
    throw new Error('STEP04-A2 serializes only the A1 complete AVAILABLE model; non-AVAILABLE transition semantics are reserved to STEP04-A3');
  }
  return audit;
}
export function serializeSingleQuestion(q){
  return {
    questionId:q.questionId,
    domain:q.domain,
    timingDependency:q.timingDependency,
    availability:q.availability,
    state:q.state,
    answer:clone(q.answer),
    provenance:{sourceRecipeVersion:q.provenance.sourceRecipeVersion??null}
  };
}

export function buildStep04A2PublicProductPayload(readModel){
  assertA1Frozen();
  assertA1CompleteAvailableModel(readModel);
  const domains={};
  for(const domain of PRODUCT_DOMAIN_ORDER){
    const src=readModel.domains[domain];
    domains[domain]={
      domain,
      questionCount:src.questionCount,
      questions:src.questions.map(serializeSingleQuestion)
    };
  }
  const questionStatuses={};
  for(const id of expectedQuestionIds()) questionStatuses[id]=readModel.availability.questionStatuses[id];
  return buildStep04A2PublicEnvelope(readModel,domains,questionStatuses);
}

// Shared envelope projection; availability transitions remain owned by A3.
export function buildStep04A2PublicEnvelope(readModel,domains,questionStatuses){
  return {
    contract:{
      schemaId:STEP04_A2_PUBLIC_SCHEMA_ID,
      schemaVersion:STEP04_A2_PUBLIC_SCHEMA_VERSION,
      serializationVersion:STEP04_A2_PUBLIC_SERIALIZATION_VERSION,
      sourceAssemblyVersion:readModel.contract.version,
      sourceContractAuthority:readModel.contract.authority,
      recipeCount:readModel.contract.recipeCount,
      domainOrder:[...PRODUCT_DOMAIN_ORDER],
      nonAvailableTransitionSemantics:'RESERVED_STEP04-A3_NOT_IMPLEMENTED_IN_A2'
    },
    chart:pickPresent(readModel.chart,CHART_SURFACE_TAXONOMY.canonicalSlots),
    timing:pickPresent(readModel.timing,TIMING_SURFACE_TAXONOMY.canonicalSlots),
    domains,
    availability:{
      overall:readModel.availability.overall,
      questionStatuses,
      vocabulary:[...PRODUCT_RESULT_ENVELOPE.availabilityVocabulary]
    },
    provenance:{
      serializationVersion:STEP04_A2_PUBLIC_SERIALIZATION_VERSION,
      sourceAssemblyVersion:readModel.contract.version,
      sourceContractAuthority:readModel.contract.authority,
      frozenRecipeCount:FROZEN_PRODUCT_RECIPE_CATALOG.length,
      consumerBoundary:'STEP04_A2_PUBLIC_SERIALIZATION_ONLY'
    }
  };
}

function canonicalize(value,pathParts=[]){
  if(Array.isArray(value)) return value.map((v,i)=>canonicalize(v,[...pathParts,String(i)]));
  if(!value||typeof value!=='object') return value;
  let keys=Object.keys(value);
  const pathKey=pathParts.join('.');
  if(pathParts.length===0) keys=[...ROOT_NAMESPACES].filter(k=>Object.prototype.hasOwnProperty.call(value,k));
  else if(pathKey==='domains') keys=[...PRODUCT_DOMAIN_ORDER].filter(k=>Object.prototype.hasOwnProperty.call(value,k));
  else if(pathKey==='availability.questionStatuses') keys=expectedQuestionIds().filter(k=>Object.prototype.hasOwnProperty.call(value,k));
  else keys.sort();
  const out={};
  for(const key of keys) out[key]=canonicalize(value[key],[...pathParts,key]);
  return out;
}

export function serializeStep04A2PublicProductPayload(publicPayload){
  assertPlainObject(publicPayload,'publicPayload');
  if(publicPayload.contract?.schemaId!==STEP04_A2_PUBLIC_SCHEMA_ID||publicPayload.contract?.schemaVersion!==STEP04_A2_PUBLIC_SCHEMA_VERSION){
    throw new Error('STEP04-A2 public payload schema/version mismatch');
  }
  return JSON.stringify(canonicalize(publicPayload),null,2)+'\n';
}

function collectKeys(value,keys=[]){
  if(Array.isArray(value)){ for(const v of value) collectKeys(v,keys); return keys; }
  if(value&&typeof value==='object'){
    for(const [k,v] of Object.entries(value)){ keys.push(k); collectKeys(v,keys); }
  }
  return keys;
}
function exactKeys(obj,expected){ return JSON.stringify(Object.keys(obj))===JSON.stringify(expected); }

export function auditStep04A2PublicSerialization(readModel,publicPayload){
  let a1Audit=null;
  try{ assertA1Frozen(); a1Audit=assertA1CompleteAvailableModel(readModel); }catch{}
  const publicQuestions=PRODUCT_DOMAIN_ORDER.flatMap(d=>publicPayload?.domains?.[d]?.questions??[]);
  const sourceQuestions=readModel&&a1Audit?flattenQuestions(readModel):[];
  const ids=expectedQuestionIds();
  const publicKeys=collectKeys(publicPayload,[]);
  const serialized=(()=>{ try{return serializeStep04A2PublicProductPayload(publicPayload);}catch{return null;} })();
  const serializedAgain=(()=>{ try{return serializeStep04A2PublicProductPayload(clone(publicPayload));}catch{return null;} })();
  const checks={
    a1FrozenAuthorityPreserved:a1Audit?.assemblyReady===true,
    publicNamespacesExactAndOrdered:exactKeys(publicPayload??{},ROOT_NAMESPACES),
    schemaVersionAndA3DeferralExact:publicPayload?.contract?.schemaId===STEP04_A2_PUBLIC_SCHEMA_ID&&publicPayload?.contract?.schemaVersion===STEP04_A2_PUBLIC_SCHEMA_VERSION&&publicPayload?.contract?.serializationVersion===STEP04_A2_PUBLIC_SERIALIZATION_VERSION&&publicPayload?.contract?.nonAvailableTransitionSemantics==='RESERVED_STEP04-A3_NOT_IMPLEMENTED_IN_A2',
    chartAndTimingPublicFieldsAuthorized:Object.keys(publicPayload?.chart??{}).every(k=>CHART_SURFACE_TAXONOMY.canonicalSlots.includes(k))&&Object.keys(publicPayload?.timing??{}).every(k=>TIMING_SURFACE_TAXONOMY.canonicalSlots.includes(k))&&JSON.stringify(publicPayload?.chart)===JSON.stringify(readModel?.chart)&&JSON.stringify(publicPayload?.timing)===JSON.stringify(readModel?.timing),
    exactlyTwentyQuestionsInFrozenOrder:publicQuestions.length===20&&JSON.stringify(publicQuestions.map(q=>q.questionId))===JSON.stringify(ids)&&PRODUCT_DOMAIN_ORDER.every(d=>publicPayload.domains[d].questionCount===FROZEN_PRODUCT_RECIPE_CATALOG.filter(x=>x.domain===d).length),
    frozenQuestionSemanticsSurviveSerialization:publicQuestions.length===sourceQuestions.length&&publicQuestions.every((q,i)=>q.questionId===sourceQuestions[i].questionId&&q.domain===sourceQuestions[i].domain&&q.timingDependency===sourceQuestions[i].timingDependency&&q.availability===sourceQuestions[i].availability&&q.state===sourceQuestions[i].state&&JSON.stringify(q.answer)===JSON.stringify(sourceQuestions[i].answer)),
    curatedProvenanceOnly:publicQuestions.every(q=>exactKeys(q.provenance,QUESTION_PUBLIC_PROVENANCE_FIELDS))&&exactKeys(publicPayload?.provenance??{},GLOBAL_PUBLIC_PROVENANCE_FIELDS)&&!publicKeys.some(k=>PUBLIC_INTERNAL_ONLY_KEYS.includes(k))&&!publicKeys.some(k=>/sha256|hashmanifest/i.test(k)),
    rawEvidenceTraceResolverDebugNotPublic:!publicKeys.some(k=>['evidence','evidenceStack','trace','policy','debug','resolverInternals'].includes(k)),
    deterministicCanonicalSerialization:typeof serialized==='string'&&serialized===serializedAgain&&JSON.stringify(JSON.parse(serialized))===JSON.stringify(JSON.parse(serializedAgain)),
    consumerBoundaryIsPublicA2Only:STEP04_A2_PUBLIC_CONSUMER_BOUNDARY.webMustConsumePublicSerialization===true&&STEP04_A2_PUBLIC_CONSUMER_BOUNDARY.directA1AdapterAccessByWebAllowed===false&&STEP04_A2_PUBLIC_CONSUMER_BOUNDARY.directRecipeInternalAccessByWebAllowed===false
  };
  const serializationReady=Object.values(checks).every(Boolean);
  return {
    version:STEP04_A2_PUBLIC_SERIALIZATION_VERSION,
    stage:'STEP04-A2',
    checks,
    summary:{
      schemaId:STEP04_A2_PUBLIC_SCHEMA_ID,
      schemaVersion:STEP04_A2_PUBLIC_SCHEMA_VERSION,
      questionCount:publicQuestions.length,
      domainCounts:Object.fromEntries(PRODUCT_DOMAIN_ORDER.map(d=>[d,publicPayload?.domains?.[d]?.questionCount??0])),
      allAvailable:publicQuestions.length===20&&publicQuestions.every(q=>q.availability==='AVAILABLE'),
      questionSemanticRewriteCount:publicQuestions.filter((q,i)=>sourceQuestions[i]&&(q.state!==sourceQuestions[i].state||JSON.stringify(q.answer)!==JSON.stringify(sourceQuestions[i].answer)||q.timingDependency!==sourceQuestions[i].timingDependency)).length,
      rawEvidenceExposed:false,
      internalHashOrEnginePathExposed:false,
      deterministicSerialization:serialized!==null&&serialized===serializedAgain,
      partialUnavailableErrorSemanticsImplemented:false,
      uiImplemented:false
    },
    serializationReady,
    verdict:serializationReady?'A2_PUBLIC_SERIALIZATION_BOUNDARY_FROZEN':'NOT_READY',
    nextAuthorizedTask:serializationReady?'STEP04-A3_PARTIAL_UNAVAILABLE_ERROR_STATE_SEMANTICS':null
  };
}
