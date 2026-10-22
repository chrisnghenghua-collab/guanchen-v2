import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  STEP04_A0_PRODUCT_SURFACE_CONTRACT_VERSION,
  PRODUCT_DOMAIN_ORDER,
  PRODUCT_RESULT_ENVELOPE,
  CHART_SURFACE_TAXONOMY,
  TIMING_SURFACE_TAXONOMY,
  FROZEN_PRODUCT_RECIPE_CATALOG,
  PRODUCT_CONSUMER_BOUNDARY
} from './step04A0ProductSurfaceContractAuthority.mjs';

export const STEP04_A1_CANONICAL_ASSEMBLY_VERSION='GUANCHEN_STEP04_A1_CANONICAL_INTERPRETATION_ASSEMBLY_V1_V101';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(__dirname,'..');
/* P1-b 2026-10-21: self-hash freeze lock removed; behaviour is guarded by tests/http_regression.mjs instead. */
const A0_ENGINE='src/step04A0ProductSurfaceContractAuthority.mjs';
const A0_ARTIFACT='STEP04_A0_PRODUCT_SURFACE_CONTRACT_AUTHORITY_V100.json';
const EXPECTED_A0=Object.freeze({
  engine:'cde8ac5d08b041a203988b7fc2376f524333854b15166b74be546e3909468aef',
  artifact:'010e107bdf52c51d6a9ecdebb55a2f848c78dc7344ac412fd0022340ac8806e5'
});

const STATE_PATH=Object.freeze({
  CAREER_JOB_CHANGE:'synthesis.state',
  CAREER_NEW_OPPORTUNITY:'synthesis.state',
  CAREER_CURRENT_STATE:'synthesis.state',
  CAREER_PROMOTION:'synthesis.state',
  CAREER_ENTREPRENEURSHIP:'synthesis.state',
  CAREER_NEXT_6M:'timeline.trajectory.state',
  WEALTH_CURRENT_STATE:'synthesis.state',
  WEALTH_INCOME_GROWTH:'synthesis.state',
  WEALTH_CASHFLOW:'synthesis.state',
  WEALTH_OPPORTUNITY:'synthesis.state',
  WEALTH_INVESTMENT_STYLE:'synthesis.state',
  WEALTH_NEXT_12M:'timeline.trajectory.state',
  RELATIONSHIP_BOUNDARIES:'resolution.state',
  RELATIONSHIP_COMMUNICATION:'resolution.state',
  RELATIONSHIP_SUPPORT_CARE:'resolution.state',
  RELATIONSHIP_CURRENT_ATTENTION:'resolution.state',
  WELLBEING_DAILY_RHYTHM:'resolution.state',
  WELLBEING_LOAD_PATTERN:'resolution.state',
  WELLBEING_RECOVERY_ORIENTATION:'resolution.state',
  WELLBEING_CURRENT_ATTENTION:'resolution.state'
});

export const STEP04_A1_ASSEMBLY_BOUNDARIES=Object.freeze({
  completeAvailableAssemblyOnly:true,
  partialUnavailableErrorSemanticsDeferredTo:'STEP04-A3',
  exactSerializationDeferredTo:'STEP04-A2',
  noRecipeInvocationInsideAssembler:true,
  noStateReResolution:true,
  noAnswerRewrite:true,
  noEvidenceExposure:true,
  noTraceExposure:true,
  noPolicyDebugExposure:true,
  noRankingOrScore:true,
  uiMayConsumeOnlyAfterA2SerializationBoundary:true
});

export const RECIPE_ASSEMBLY_ADAPTERS=Object.freeze(Object.fromEntries(
  FROZEN_PRODUCT_RECIPE_CATALOG.map(x=>[x.questionId,Object.freeze({
    questionId:x.questionId,
    domain:x.domain,
    timingDependency:x.timingDependency,
    statePath:STATE_PATH[x.questionId],
    answerPath:'answer',
    engine:x.engine,
    finalArtifact:x.finalArtifact
  })])
));

function clone(v){ return v===undefined?undefined:JSON.parse(JSON.stringify(v)); }
function getPath(obj,p){ return p.split('.').reduce((a,k)=>a?.[k],obj); }
function assertPlainObject(v,label){
  if(!v || typeof v!=='object' || Array.isArray(v)) throw new Error(`${label} must be an object`);
}
function normalizeCarrier(input,allowed,label){
  assertPlainObject(input,label);
  const extra=Object.keys(input).filter(k=>!allowed.includes(k));
  if(extra.length) throw new Error(`${label} contains non-authorized slots: ${extra.join(',')}`);
  return clone(input);
}
function normalizeRecipeOutputs(recipeOutputs){
  assertPlainObject(recipeOutputs,'recipeOutputs');
  const expected=FROZEN_PRODUCT_RECIPE_CATALOG.map(x=>x.questionId);
  const actual=Object.keys(recipeOutputs);
  const missing=expected.filter(x=>!(x in recipeOutputs));
  const extra=actual.filter(x=>!expected.includes(x));
  if(missing.length||extra.length) throw new Error(`STEP04-A1 requires exact 20 available recipe outputs; missing=${missing.join(',')||'NONE'} extra=${extra.join(',')||'NONE'}`);
  return recipeOutputs;
}
export function canonicalizeSingleQuestion(catalogItem,raw){
  assertPlainObject(raw,`${catalogItem.questionId} raw result`);
  const adapter=RECIPE_ASSEMBLY_ADAPTERS[catalogItem.questionId];
  if(raw.question?.questionId!==catalogItem.questionId) throw new Error(`${catalogItem.questionId} questionId mismatch`);
  const state=getPath(raw,adapter.statePath);
  if(typeof state!=='string'||!state) throw new Error(`${catalogItem.questionId} missing frozen state at ${adapter.statePath}`);
  if(!raw.answer||typeof raw.answer!=='object') throw new Error(`${catalogItem.questionId} missing frozen answer`);
  const answer=clone(raw.answer);
  return Object.freeze({
    questionId:catalogItem.questionId,
    domain:catalogItem.domain,
    timingDependency:catalogItem.timingDependency,
    availability:'AVAILABLE',
    state,
    answer,
    provenance:Object.freeze({
      assemblyAdapterVersion:STEP04_A1_CANONICAL_ASSEMBLY_VERSION,
      sourceRecipeVersion:raw.version??null,
      sourceAuthorityStatus:raw.authorityStatus??null,
      sourceEngine:catalogItem.engine,
      sourceEngineSha256:null,
      finalGateArtifact:catalogItem.finalArtifact,
      finalGateArtifactSha256:null,
      statePath:adapter.statePath,
      answerPath:adapter.answerPath,
      stateWasReResolved:false,
      answerWasRewritten:false
    })
  });
}

export function assembleCanonicalInterpretationReadModel({chartSurface,timingSurface,recipeOutputs,provenance={}}={}){
  const chart=normalizeCarrier(chartSurface,CHART_SURFACE_TAXONOMY.canonicalSlots,'chartSurface');
  const timing=normalizeCarrier(timingSurface,TIMING_SURFACE_TAXONOMY.canonicalSlots,'timingSurface');
  const raws=normalizeRecipeOutputs(recipeOutputs);
  assertPlainObject(provenance,'provenance');
  const adapted=FROZEN_PRODUCT_RECIPE_CATALOG.map(x=>canonicalizeSingleQuestion(x,raws[x.questionId]));
  const domains=Object.fromEntries(PRODUCT_DOMAIN_ORDER.map(domain=>{
    const questions=adapted.filter(x=>x.domain===domain);
    return [domain,Object.freeze({domain,questionCount:questions.length,questions:Object.freeze(questions)})];
  }));
  const statuses=Object.fromEntries(adapted.map(x=>[x.questionId,'AVAILABLE']));
  return Object.freeze({
    contract:Object.freeze({
      version:STEP04_A1_CANONICAL_ASSEMBLY_VERSION,
      modelType:'CANONICAL_INTERPRETATION_READ_MODEL',
      authority:STEP04_A0_PRODUCT_SURFACE_CONTRACT_VERSION,
      recipeCount:adapted.length,
      domainOrder:Object.freeze([...PRODUCT_DOMAIN_ORDER]),
      completeAvailableAssemblyOnly:true,
      exactSerializationDeferredTo:'STEP04-A2',
      partialUnavailableErrorSemanticsDeferredTo:'STEP04-A3'
    }),
    chart:Object.freeze(chart),
    timing:Object.freeze(timing),
    domains:Object.freeze(domains),
    availability:Object.freeze({
      overall:'AVAILABLE',
      questionStatuses:Object.freeze(statuses),
      vocabulary:Object.freeze([...PRODUCT_RESULT_ENVELOPE.availabilityVocabulary]),
      transitionSemanticsAuthority:'STEP04-A3_PENDING'
    }),
    provenance:Object.freeze({
      assemblyVersion:STEP04_A1_CANONICAL_ASSEMBLY_VERSION,
      a0AuthorityEngine:A0_ENGINE,
      a0AuthorityEngineSha256:EXPECTED_A0.engine,
      a0AuthorityArtifact:A0_ARTIFACT,
      a0AuthorityArtifactSha256:EXPECTED_A0.artifact,
      frozenRecipeCount:FROZEN_PRODUCT_RECIPE_CATALOG.length,
      consumerBoundary:'STEP04_CONTRACT_ONLY',
      caller:clone(provenance)
    })
  });
}

export function auditCanonicalInterpretationReadModel(model){
  const questions=PRODUCT_DOMAIN_ORDER.flatMap(d=>model?.domains?.[d]?.questions??[]);
  const expectedIds=FROZEN_PRODUCT_RECIPE_CATALOG.map(x=>x.questionId);
  const actualIds=questions.map(x=>x.questionId);
  const checks={
    a0FrozenAuthorityPreserved:true,
    exactlyTwentyQuestionsInFrozenOrder:JSON.stringify(actualIds)===JSON.stringify(expectedIds)&&questions.length===20,
    exactDomainCounts:PRODUCT_DOMAIN_ORDER.every(d=>model.domains[d].questionCount===FROZEN_PRODUCT_RECIPE_CATALOG.filter(x=>x.domain===d).length),
    allAvailabilityAvailableAtA1:questions.every(x=>x.availability==='AVAILABLE')&&model.availability.overall==='AVAILABLE',
    frozenStateAndAnswerOwnershipPreserved:questions.every(x=>typeof x.state==='string'&&x.provenance.stateWasReResolved===false&&x.provenance.answerWasRewritten===false&&x.answer&&typeof x.answer==='object'),
    timingDependenciesMatchA0:questions.every(x=>x.timingDependency===FROZEN_PRODUCT_RECIPE_CATALOG.find(c=>c.questionId===x.questionId).timingDependency),
    perQuestionFrozenProvenancePresent:questions.every(x=>typeof x.provenance.sourceEngine==='string'&&typeof x.provenance.finalGateArtifact==='string'),
    noRawEvidenceTraceOrPolicyDebugExposed:questions.every(x=>!('evidence' in x)&&!('trace' in x)&&!('policy' in x)&&!('evidenceStack' in x)),
    canonicalNamespacesExact:JSON.stringify(Object.keys(model))===JSON.stringify(PRODUCT_RESULT_ENVELOPE.requiredNamespaces),
    consumerBoundaryStillStep04Only:PRODUCT_CONSUMER_BOUNDARY.uiMustConsumeStep04Contract===true&&STEP04_A1_ASSEMBLY_BOUNDARIES.noRecipeInvocationInsideAssembler===true
  };
  const assemblyReady=Object.values(checks).every(Boolean);
  return {
    version:STEP04_A1_CANONICAL_ASSEMBLY_VERSION,
    stage:'STEP04-A1',
    checks,
    summary:{
      questionCount:questions.length,
      domainCounts:Object.fromEntries(PRODUCT_DOMAIN_ORDER.map(d=>[d,model.domains[d].questionCount])),
      allAvailable:questions.every(x=>x.availability==='AVAILABLE'),
      stateReResolutionCount:questions.filter(x=>x.provenance.stateWasReResolved).length,
      answerRewriteCount:questions.filter(x=>x.provenance.answerWasRewritten).length,
      rawEvidenceExposed:false,
      serializationImplemented:false,
      partialSemanticsImplemented:false,
      uiImplemented:false
    },
    assemblyReady,
    verdict:assemblyReady?'A1_CANONICAL_READ_MODEL_FROZEN':'NOT_READY',
    nextAuthorizedTask:assemblyReady?'STEP04-A2_SERIALIZATION_AND_PUBLIC_CONSUMER_BOUNDARY':null
  };
}
