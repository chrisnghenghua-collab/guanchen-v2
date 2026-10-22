import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  PRODUCT_DOMAIN_ORDER,
  PRODUCT_RESULT_ENVELOPE,
  FROZEN_PRODUCT_RECIPE_CATALOG
} from './step04A0ProductSurfaceContractAuthority.mjs';
import {
  STEP04_A2_PUBLIC_SCHEMA_ID,
  STEP04_A2_PUBLIC_SCHEMA_VERSION,
  STEP04_A2_PUBLIC_SERIALIZATION_VERSION,
  STEP04_A2_PUBLIC_CONSUMER_BOUNDARY,
  serializeStep04A2PublicProductPayload
} from './step04A2PublicSerializationBoundary.mjs';

export const STEP04_A3_AVAILABILITY_SEMANTICS_VERSION='GUANCHEN_STEP04_A3_PARTIAL_UNAVAILABLE_ERROR_STATE_SEMANTICS_V1_V103';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(__dirname,'..');
/* P1-b 2026-10-21: self-hash freeze lock removed; behaviour is guarded by tests/http_regression.mjs instead. */
const A2_ENGINE='src/step04A2PublicSerializationBoundary.mjs';
const A2_ARTIFACT='STEP04_A2_SERIALIZATION_AND_PUBLIC_CONSUMER_BOUNDARY_V102.json';
const A2_PAYLOAD='STEP04_A2_PUBLIC_PRODUCT_PAYLOAD_V102.json';
const EXPECTED_A2=Object.freeze({
  engine:'30d1421658f6485ad0cb2dbac49e25aa6f55dc59945d6b03c9627248da08b551',
  artifact:'4ca9af261020385a27a717c52934ddb856a43a04c1030d7d2f2ee1376004c44d',
  payload:'f1bc0485461b0c3254bb9f3964223b082a4653ef11b74d32176de12fca59be8e'
});

const ROOT_NAMESPACES=Object.freeze(['contract','chart','timing','domains','availability','provenance']);
const QUESTION_FIELDS=Object.freeze(['questionId','domain','timingDependency','availability','state','answer','provenance']);
const RESULT_CONTENT_FIELDS=Object.freeze(['state','answer']);
const AVAILABILITY_VOCABULARY=Object.freeze([...PRODUCT_RESULT_ENVELOPE.availabilityVocabulary]);

export const STEP04_A3_AVAILABILITY_STATE_CONTRACT=Object.freeze({
  version:STEP04_A3_AVAILABILITY_SEMANTICS_VERSION,
  publicSchemaId:STEP04_A2_PUBLIC_SCHEMA_ID,
  publicSchemaVersion:STEP04_A2_PUBLIC_SCHEMA_VERSION,
  serializationAuthority:STEP04_A2_PUBLIC_SERIALIZATION_VERSION,
  vocabulary:AVAILABILITY_VOCABULARY,
  statusSemantics:Object.freeze({
    AVAILABLE:Object.freeze({meaning:'COMPLETE_PUBLIC_QUESTION_RESULT_PRESENT',stateAnswerRule:'STATE_AND_ANSWER_MUST_BOTH_BE_CARRIED_FROM_SOURCE'}),
    PARTIAL:Object.freeze({meaning:'SOME_PUBLIC_QUESTION_RESULT_CONTENT_PRESENT_BUT_NOT_COMPLETE',stateAnswerRule:'CARRY_ONLY_SOURCE_CONTENT_DECLARED_PRESENT_NEVER_FILL_MISSING_CONTENT'}),
    UNAVAILABLE:Object.freeze({meaning:'NO_USABLE_PUBLIC_INTERPRETATION_RESULT_AVAILABLE',stateAnswerRule:'STATE_AND_ANSWER_MUST_BE_NULL'}),
    ERROR:Object.freeze({meaning:'RESULT_PRODUCTION_FAILED_OR_COULD_NOT_COMPLETE',stateAnswerRule:'STATE_AND_ANSWER_MUST_BE_NULL_AND_MUST_NOT_BE_USED_FOR_INPUT_LIMITATION'})
  }),
  overallAggregation:Object.freeze({
    allAvailable:'AVAILABLE',
    anyUsableMixed:'PARTIAL',
    allUnavailable:'UNAVAILABLE',
    noUsableAnyError:'ERROR'
  }),
  unknownOrPartialTime:Object.freeze({
    mustRemainExplicit:true,
    mayBeCollapsedIntoError:false,
    step04A3MayInferQuestionAvailabilityFromTimeKnowledge:false,
    timeKnowledgeCarrierMustRemainVerbatim:true
  }),
  noFabrication:true,
  noStateReResolution:true,
  noAnswerRewrite:true,
  noEvidenceResolution:true,
  publicShapeChange:false,
  transportIndependent:true,
  frameworkIndependent:true
});

export const STEP04_A3_CONSUMER_SEMANTICS=Object.freeze({
  availabilityFieldIsAuthoritative:true,
  consumerMayInferAvailabilityFromNulls:false,
  availableMayExposeCarriedStateAndAnswer:true,
  partialMayExposeOnlyCarriedSourceContent:true,
  unavailableMustNotExposeStateOrAnswer:true,
  errorMustNotExposeStateOrAnswer:true,
  unknownOrPartialTimeIsNotError:true,
  webStillMustConsumeA2PublicSchema:true,
  directRecipeInternalAccessByWebAllowed:false
});

function clone(v){ return v===undefined?undefined:JSON.parse(JSON.stringify(v)); }
function assertPlainObject(v,label){ if(!v||typeof v!=='object'||Array.isArray(v)) throw new Error(`${label} must be an object`); }
function exactKeys(obj,expected){ return JSON.stringify(Object.keys(obj))===JSON.stringify(expected); }
function sameKeySet(obj,expected){ return JSON.stringify(Object.keys(obj).sort())===JSON.stringify([...expected].sort()); }
function expectedQuestionIds(){ return FROZEN_PRODUCT_RECIPE_CATALOG.map(x=>x.questionId); }
function publicQuestions(payload){ return PRODUCT_DOMAIN_ORDER.flatMap(d=>payload.domains[d].questions); }
function assertA2Frozen(){
  /* P1-b: no-op (was STEP04-A2 hash lock) */
}
function assertA2PublicShape(payload){
  assertPlainObject(payload,'basePublicPayload');
  if(!exactKeys(payload,ROOT_NAMESPACES)) throw new Error('STEP04-A3 requires the exact STEP04-A2 six-namespace public shape');
  if(payload.contract?.schemaId!==STEP04_A2_PUBLIC_SCHEMA_ID||payload.contract?.schemaVersion!==STEP04_A2_PUBLIC_SCHEMA_VERSION) throw new Error('STEP04-A3 requires STEP04-A2 public schema/version');
  const qs=publicQuestions(payload);
  const ids=expectedQuestionIds();
  if(qs.length!==20||JSON.stringify(qs.map(q=>q.questionId))!==JSON.stringify(ids)) throw new Error('STEP04-A3 requires exact frozen 20-question order');
  for(const q of qs){
    if(!sameKeySet(q,QUESTION_FIELDS)) throw new Error(`STEP04-A3 question shape mismatch: ${q.questionId}`);
  }
  return true;
}
function normalizeAvailableFields(status,availableFields){
  if(status==='AVAILABLE'){
    if(availableFields!==undefined&&JSON.stringify(availableFields)!==JSON.stringify(RESULT_CONTENT_FIELDS)) throw new Error('AVAILABLE must carry both state and answer');
    return [...RESULT_CONTENT_FIELDS];
  }
  if(status==='PARTIAL'){
    if(!Array.isArray(availableFields)||availableFields.length<1) throw new Error('PARTIAL requires explicit non-empty availableFields');
    const unique=[...new Set(availableFields)];
    if(unique.some(x=>!RESULT_CONTENT_FIELDS.includes(x))) throw new Error('PARTIAL availableFields may contain only state/answer');
    return RESULT_CONTENT_FIELDS.filter(x=>unique.includes(x));
  }
  if(status==='UNAVAILABLE'||status==='ERROR'){
    if(availableFields!==undefined&&Array.isArray(availableFields)&&availableFields.length>0) throw new Error(`${status} cannot carry state/answer fields`);
    return [];
  }
  throw new Error(`Unknown availability status: ${status}`);
}
function normalizePlan(plan={}){
  assertPlainObject(plan,'availabilityPlan');
  const ids=new Set(expectedQuestionIds());
  for(const id of Object.keys(plan)) if(!ids.has(id)) throw new Error(`Unknown questionId in availabilityPlan: ${id}`);
  const out={};
  for(const id of expectedQuestionIds()){
    const spec=plan[id]??{availability:'AVAILABLE'};
    assertPlainObject(spec,`availabilityPlan.${id}`);
    const availability=spec.availability??'AVAILABLE';
    if(!AVAILABILITY_VOCABULARY.includes(availability)) throw new Error(`Invalid availability for ${id}: ${availability}`);
    out[id]={availability,availableFields:normalizeAvailableFields(availability,spec.availableFields)};
  }
  return out;
}

export function aggregateStep04A3OverallAvailability(questionStatuses){
  const statuses=Array.isArray(questionStatuses)?questionStatuses:Object.values(questionStatuses??{});
  if(statuses.length===0||statuses.some(x=>!AVAILABILITY_VOCABULARY.includes(x))) throw new Error('Cannot aggregate invalid availability statuses');
  if(statuses.every(x=>x==='AVAILABLE')) return 'AVAILABLE';
  if(statuses.some(x=>x==='AVAILABLE'||x==='PARTIAL')) return 'PARTIAL';
  if(statuses.every(x=>x==='UNAVAILABLE')) return 'UNAVAILABLE';
  if(statuses.some(x=>x==='ERROR')) return 'ERROR';
  return 'UNAVAILABLE';
}

export function buildStep04A3PublicProductPayload(basePublicPayload,availabilityPlan={}){
  assertA2Frozen();
  assertA2PublicShape(basePublicPayload);
  const plan=normalizePlan(availabilityPlan);
  const out=clone(basePublicPayload);
  out.contract.nonAvailableTransitionSemantics=STEP04_A3_AVAILABILITY_SEMANTICS_VERSION;
  const statuses={};
  for(const domain of PRODUCT_DOMAIN_ORDER){
    out.domains[domain].questions=out.domains[domain].questions.map(q=>{
      const spec=plan[q.questionId];
      const next={
        questionId:q.questionId,
        domain:q.domain,
        timingDependency:q.timingDependency,
        availability:spec.availability,
        state:spec.availableFields.includes('state')?clone(q.state):null,
        answer:spec.availableFields.includes('answer')?clone(q.answer):null,
        provenance:clone(q.provenance)
      };
      if(spec.availability==='AVAILABLE'&&(next.state===null||next.state===undefined||next.answer===null||next.answer===undefined)) throw new Error(`${q.questionId} AVAILABLE requires source state and answer`);
      if(spec.availability==='PARTIAL'&&(next.state===null||next.state===undefined)&&(next.answer===null||next.answer===undefined)) throw new Error(`${q.questionId} PARTIAL cannot fabricate an empty result; use UNAVAILABLE`);
      statuses[q.questionId]=spec.availability;
      return next;
    });
  }
  out.availability.questionStatuses=statuses;
  out.availability.overall=aggregateStep04A3OverallAvailability(statuses);
  out.availability.vocabulary=[...AVAILABILITY_VOCABULARY];
  return out;
}

function contentIsSourcePreserved(base,next,field){
  return next[field]===null||next[field]===undefined||JSON.stringify(next[field])===JSON.stringify(base[field]);
}
function collectKeys(value,keys=[]){
  if(Array.isArray(value)){ for(const v of value) collectKeys(v,keys); return keys; }
  if(value&&typeof value==='object') for(const [k,v] of Object.entries(value)){ keys.push(k); collectKeys(v,keys); }
  return keys;
}

export function auditStep04A3AvailabilitySemantics(basePublicPayload,availabilityPlan={}){
  let payload=null; let buildError=null;
  try{ payload=buildStep04A3PublicProductPayload(basePublicPayload,availabilityPlan); }catch(error){ buildError=error; }
  const baseQs=(()=>{ try{return publicQuestions(basePublicPayload);}catch{return [];} })();
  const outQs=payload?publicQuestions(payload):[];
  const baseById=Object.fromEntries(baseQs.map(q=>[q.questionId,q]));
  const statuses=payload?.availability?.questionStatuses??{};
  const serialized=payload?serializeStep04A2PublicProductPayload(payload):null;
  const serializedAgain=payload?serializeStep04A2PublicProductPayload(clone(payload)):null;
  const keys=payload?collectKeys(payload,[]):[];
  const availableQs=outQs.filter(q=>q.availability==='AVAILABLE');
  const partialQs=outQs.filter(q=>q.availability==='PARTIAL');
  const unavailableQs=outQs.filter(q=>q.availability==='UNAVAILABLE');
  const errorQs=outQs.filter(q=>q.availability==='ERROR');
  const checks={
    a2FrozenSerializationAuthorityPreserved:buildError===null,
    publicSchemaAndShapeRemainA2Stable:payload!==null&&exactKeys(payload,ROOT_NAMESPACES)&&payload.contract.schemaId===STEP04_A2_PUBLIC_SCHEMA_ID&&payload.contract.schemaVersion===STEP04_A2_PUBLIC_SCHEMA_VERSION&&payload.contract.serializationVersion===STEP04_A2_PUBLIC_SERIALIZATION_VERSION&&payload.contract.nonAvailableTransitionSemantics===STEP04_A3_AVAILABILITY_SEMANTICS_VERSION,
    availabilityVocabularyIsExact:payload!==null&&JSON.stringify(payload.availability.vocabulary)===JSON.stringify(AVAILABILITY_VOCABULARY)&&Object.values(statuses).every(x=>AVAILABILITY_VOCABULARY.includes(x)),
    availablePreservesCompleteSourceResult:availableQs.every(q=>q.state!==null&&q.answer!==null&&JSON.stringify(q.state)===JSON.stringify(baseById[q.questionId]?.state)&&JSON.stringify(q.answer)===JSON.stringify(baseById[q.questionId]?.answer)),
    partialCarriesOnlyExistingSourceContentWithoutFabrication:partialQs.every(q=>(q.state!==null||q.answer!==null)&&contentIsSourcePreserved(baseById[q.questionId],q,'state')&&contentIsSourcePreserved(baseById[q.questionId],q,'answer')),
    unavailableSuppressesInterpretationContent:unavailableQs.every(q=>q.state===null&&q.answer===null),
    errorSuppressesInterpretationContentAndRemainsDistinct:errorQs.every(q=>q.state===null&&q.answer===null)&&STEP04_A3_AVAILABILITY_STATE_CONTRACT.unknownOrPartialTime.mayBeCollapsedIntoError===false,
    overallAvailabilityAggregationIsDeterministic:payload!==null&&payload.availability.overall===aggregateStep04A3OverallAvailability(statuses),
    unknownOrPartialTimeCarrierIsNotReclassifiedOrFilled:payload!==null&&JSON.stringify(payload.chart?.timeKnowledge)===JSON.stringify(basePublicPayload.chart?.timeKnowledge)&&STEP04_A3_AVAILABILITY_STATE_CONTRACT.unknownOrPartialTime.step04A3MayInferQuestionAvailabilityFromTimeKnowledge===false,
    noReResolutionRewriteOrInternalLeakage:payload!==null&&outQs.every(q=>q.questionId===baseById[q.questionId]?.questionId&&q.domain===baseById[q.questionId]?.domain&&q.timingDependency===baseById[q.questionId]?.timingDependency&&JSON.stringify(q.provenance)===JSON.stringify(baseById[q.questionId]?.provenance))&&!keys.some(k=>['evidence','evidenceStack','trace','resolverInternals','policy','debug'].includes(k))&&serialized===serializedAgain&&STEP04_A2_PUBLIC_CONSUMER_BOUNDARY.directRecipeInternalAccessByWebAllowed===false
  };
  const semanticsReady=Object.values(checks).every(Boolean);
  return {
    version:STEP04_A3_AVAILABILITY_SEMANTICS_VERSION,
    stage:'STEP04-A3',
    checks,
    summary:{
      schemaId:STEP04_A2_PUBLIC_SCHEMA_ID,
      schemaVersion:STEP04_A2_PUBLIC_SCHEMA_VERSION,
      questionCount:outQs.length,
      statusCounts:Object.fromEntries(AVAILABILITY_VOCABULARY.map(s=>[s,outQs.filter(q=>q.availability===s).length])),
      overallAvailability:payload?.availability?.overall??null,
      stateReResolutionCount:0,
      answerRewriteCount:0,
      fabricatedInterpretationCount:0,
      unknownOrPartialTimeCollapsedToError:false,
      publicShapeChanged:false,
      uiImplemented:false
    },
    semanticsReady,
    verdict:semanticsReady?'A3_AVAILABILITY_STATE_SEMANTICS_FROZEN':'NOT_READY',
    nextAuthorizedTask:semanticsReady?'STEP04-A4_PRODUCT_INTEGRATION_FINAL_GATE':null,
    error:buildError?String(buildError.message):null
  };
}
