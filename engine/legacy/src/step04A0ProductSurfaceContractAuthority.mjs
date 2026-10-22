import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const STEP04_A0_PRODUCT_SURFACE_CONTRACT_VERSION='GUANCHEN_STEP04_A0_PRODUCT_SURFACE_CONTRACT_AUTHORITY_V1_V100';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(__dirname,'..');
const sha=(rel)=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,rel))).digest('hex');
const text=(rel)=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=(rel)=>JSON.parse(text(rel));

const V99_AUTHORITY='POST_STEP03_PRODUCT_INTEGRATION_AUTHORITY_V99.json';
const V99_AUTHORITY_ENGINE='src/postStep03ProductIntegrationAuthority.mjs';
const V98_CLOSURE='STEP03_OVERALL_CLOSURE_V98.json';
const EXPECTED=Object.freeze({
  [V99_AUTHORITY_ENGINE]:'4f9f21411ceb13ec2d09b18df78400bfcef1618f3631b39c5b49eb1fc387f6c5',
  [V99_AUTHORITY]:'30504bdc5f6d69dacbeb8841c8cd88405ab2ee4ff1bb9dd41535b71013437203',
  [V98_CLOSURE]:'31b2438fdebda0569aadc4e2626964f0dd759185a4ed45ac65601d1cf8effefd'
});

export const PRODUCT_DOMAIN_ORDER=Object.freeze(['CAREER','WEALTH','RELATIONSHIP','WELLBEING']);

export const PRODUCT_RESULT_ENVELOPE=Object.freeze({
  requiredNamespaces:Object.freeze(['contract','chart','timing','domains','availability','provenance']),
  ownership:Object.freeze({
    contract:'STEP04_OWNED_WRAPPER_METADATA',
    chart:'FROZEN_UPSTREAM_AUTHORITY_VALUES_STEP04_MAY_ONLY_CARRY',
    timing:'FROZEN_STEP01_OR_RECIPE_AUTHORITY_VALUES_STEP04_MAY_ONLY_CARRY',
    domains:'FROZEN_RECIPE_RESULTS_STEP04_MAY_ONLY_GROUP',
    availability:'STEP04_WRAPPER_OVER_UPSTREAM_AVAILABILITY_NO_FABRICATION',
    provenance:'STEP04_REFERENCES_FROZEN_AUTHORITY_SOURCE_WITHOUT_REINTERPRETATION'
  }),
  availabilityVocabulary:Object.freeze(['AVAILABLE','PARTIAL','UNAVAILABLE','ERROR']),
  availabilityDetailRulesDeferredTo:'STEP04-A3',
  unknownTimeRule:'UNKNOWN_OR_PARTIAL_TIME_MUST_REMAIN_DISTINCT_FROM_ERROR_AND_MUST_NOT_BE_FILLED_IN',
  resultShape:Object.freeze({
    required:Object.freeze(['questionId','domain','timingDependency','availability','state','answer','provenance']),
    stateOwnership:'FROZEN_RECIPE_OPAQUE_STATE_CODE',
    answerOwnership:'FROZEN_RECIPE_RENDERED_OUTPUT',
    timingOwnership:'FROZEN_AUTHORITY_DECLARATION',
    step04MayDeriveState:false,
    step04MayRewriteAnswer:false,
    step04MayRankResults:false
  })
});

export const CHART_SURFACE_TAXONOMY=Object.freeze({
  canonicalSlots:Object.freeze(['pillars','dayMaster','strengthBand','structureKey','patternStage','elementProfile','roleProfile','timeKnowledge']),
  rule:'SLOTS_ARE_CARRIERS_FOR_EXISTING_FROZEN_AUTHORITY_VALUES_ONLY',
  requiredForEveryRuntimeResult:false,
  missingValuePolicy:'PRESERVE_UPSTREAM_PARTIAL_OR_UNAVAILABLE_SEMANTICS',
  recomputationAllowed:false
});

export const TIMING_SURFACE_TAXONOMY=Object.freeze({
  canonicalSlots:Object.freeze(['activeDayun','annual','monthlyWindows']),
  rule:'EXPOSE_ONLY_TIMING_ALREADY_AUTHORIZED_BY_THE_FROZEN_RECIPE',
  relationshipMonthTimingAllowed:false,
  wellbeingMonthTimingAllowed:false,
  careerMonthTimingAllowedOnlyFor:Object.freeze(['CAREER_NEXT_6M']),
  wealthMonthTimingAllowedOnlyFor:Object.freeze(['WEALTH_NEXT_12M']),
  timingLayerPresenceMayCreateNewInterpretation:false
});

const R=(questionId,domain,engine,finalArtifact,timingDependency)=>Object.freeze({
  questionId,domain,engine,finalArtifact,timingDependency,
  statePolicy:'OPAQUE_FROZEN_RECIPE_STATE',
  answerPolicy:'PRESERVE_FROZEN_RENDERER_OUTPUT',
  provenanceRequired:true
});

export const FROZEN_PRODUCT_RECIPE_CATALOG=Object.freeze([
  R('CAREER_JOB_CHANGE','CAREER','src/careerJobChangeSynthesisEngine.mjs','FINAL_GATE_RESULT_V20.json','DAYUN_YEAR'),
  R('CAREER_NEW_OPPORTUNITY','CAREER','src/careerNewOpportunitySynthesisEngine.mjs','FINAL_GATE_RESULT_V24.json','DAYUN_YEAR_PLUS_RECIPE_SPECIFIC_REALITY_INPUT'),
  R('CAREER_CURRENT_STATE','CAREER','src/careerCurrentStateSynthesisEngine.mjs','CAREER_CURRENT_STATE_FINAL_GATE_V28.json','DAYUN_YEAR'),
  R('CAREER_PROMOTION','CAREER','src/careerPromotionSynthesisEngine.mjs','CAREER_PROMOTION_FINAL_GATE_V32.json','DAYUN_YEAR'),
  R('CAREER_ENTREPRENEURSHIP','CAREER','src/careerEntrepreneurshipSynthesisEngine.mjs','CAREER_ENTREPRENEURSHIP_FINAL_GATE_V36.json','DAYUN_YEAR'),
  R('CAREER_NEXT_6M','CAREER','src/careerNext6mSynthesisEngine.mjs','CAREER_NEXT_6M_FINAL_GATE_V40.json','DAYUN_YEAR_MONTHLY_WINDOWS_6'),
  R('WEALTH_CURRENT_STATE','WEALTH','src/wealthCurrentStateSynthesisEngine.mjs','WEALTH_CURRENT_STATE_FINAL_GATE_V44.json','DAYUN_YEAR'),
  R('WEALTH_INCOME_GROWTH','WEALTH','src/wealthIncomeGrowthSynthesisEngine.mjs','WEALTH_INCOME_GROWTH_FINAL_GATE_V48.json','DAYUN_YEAR'),
  R('WEALTH_CASHFLOW','WEALTH','src/wealthCashflowSynthesisEngine.mjs','WEALTH_CASHFLOW_FINAL_GATE_V52.json','DAYUN_YEAR'),
  R('WEALTH_OPPORTUNITY','WEALTH','src/wealthOpportunitySynthesisEngine.mjs','WEALTH_OPPORTUNITY_FINAL_GATE_V56.json','DAYUN_YEAR'),
  R('WEALTH_INVESTMENT_STYLE','WEALTH','src/wealthInvestmentStyleSynthesisEngine.mjs','WEALTH_INVESTMENT_STYLE_FINAL_GATE_V60.json','NONE_NATAL_STYLE'),
  R('WEALTH_NEXT_12M','WEALTH','src/wealthNext12mSynthesisEngine.mjs','WEALTH_NEXT_12M_FINAL_GATE_V64.json','DAYUN_YEAR_MONTHLY_WINDOWS_12'),
  R('RELATIONSHIP_BOUNDARIES','RELATIONSHIP','src/relationshipBoundariesSynthesisEngine.mjs','RELATIONSHIP_BOUNDARIES_FINAL_GATE_V69.json','NONE_NATAL'),
  R('RELATIONSHIP_COMMUNICATION','RELATIONSHIP','src/relationshipCommunicationSynthesisEngine.mjs','RELATIONSHIP_COMMUNICATION_FINAL_GATE_V73.json','NONE_NATAL'),
  R('RELATIONSHIP_SUPPORT_CARE','RELATIONSHIP','src/relationshipSupportCareSynthesisEngine.mjs','RELATIONSHIP_SUPPORT_CARE_FINAL_GATE_V77.json','NONE_NATAL'),
  R('RELATIONSHIP_CURRENT_ATTENTION','RELATIONSHIP','src/relationshipCurrentAttentionSynthesisEngine.mjs','RELATIONSHIP_CURRENT_ATTENTION_FINAL_GATE_V81.json','ACTIVE_DAYUN_OR_ANNUAL_CURRENT_ATTENTION'),
  R('WELLBEING_DAILY_RHYTHM','WELLBEING','src/wellbeingDailyRhythmSynthesisEngine.mjs','WELLBEING_DAILY_RHYTHM_FINAL_GATE_V85.json','NONE_NATAL'),
  R('WELLBEING_LOAD_PATTERN','WELLBEING','src/wellbeingLoadPatternSynthesisEngine.mjs','WELLBEING_LOAD_PATTERN_FINAL_GATE_V89.json','NONE_NATAL'),
  R('WELLBEING_RECOVERY_ORIENTATION','WELLBEING','src/wellbeingRecoveryOrientationSynthesisEngine.mjs','WELLBEING_RECOVERY_ORIENTATION_FINAL_GATE_V93.json','NONE_NATAL'),
  R('WELLBEING_CURRENT_ATTENTION','WELLBEING','src/wellbeingCurrentAttentionSynthesisEngine.mjs','WELLBEING_CURRENT_ATTENTION_FINAL_GATE_V97.json','ACTIVE_DAYUN_OR_ANNUAL_CURRENT_ATTENTION')
]);

export const PRODUCT_CONSUMER_BOUNDARY=Object.freeze({
  publicEligibleCategories:Object.freeze(['QUESTION_ID','DOMAIN','AVAILABILITY','OPAQUE_STATE','RENDERED_ANSWER','AUTHORIZED_TIMING_SUMMARY','CURATED_PROVENANCE_REFERENCE']),
  step04InternalByDefault:Object.freeze(['RAW_EVIDENCE_STACK','RAW_TECHNICAL_TRACE','RESOLVER_INTERNALS','POLICY_DEBUG_OBJECTS','HASH_MANIFESTS']),
  exactSerializationDecisionDeferredTo:'STEP04-A2',
  forbiddenDirectConsumerAccess:Object.freeze(['RECIPE_ENGINE_FUNCTIONS','STATE_RESOLVERS','EVIDENCE_BUILDERS','TIMING_RELATION_RESOLVERS','FROZEN_INTERNAL_MODULES']),
  uiMustConsumeStep04Contract:true,
  directUiRecipeCallsAllowed:false
});

export const STEP04_A0_HARD_BOUNDARIES=Object.freeze({
  noNewInterpretationRecipe:true,
  noStateReResolution:true,
  noEvidenceReResolution:true,
  noStructureOrStrengthRewrite:true,
  noContextDrivenEvidenceMutation:true,
  noNumericScoreConfidenceRankingTopNOrClaimVoting:true,
  noPartialOrUnavailableFabrication:true,
  noRelationshipOrWellbeingMonthTiming:true,
  noFrameworkTransportPersistenceOrAuthDecision:true,
  a1AssemblyImplementationCreated:false
});

function artifactFinalFrozen(rel,questionId){
  const s=text(rel);
  return s.includes('"finalGateReady": true')&&s.includes('"verdict": "FINAL_FROZEN"')&&s.includes(`"recipe": "${questionId}_V1"`);
}
function engineDeclaresQuestion(rel,questionId){
  return text(rel).includes(`questionId:'${questionId}'`)||text(rel).includes(`questionId: '${questionId}'`);
}
function engineDeclaresTimingDependency(rel,dependency){
  const s=text(rel);
  if(dependency==='DAYUN_YEAR'||dependency==='DAYUN_YEAR_PLUS_RECIPE_SPECIFIC_REALITY_INPUT') return s.includes("timingRequired:['DAYUN','YEAR']");
  if(dependency==='DAYUN_YEAR_MONTHLY_WINDOWS_6') return s.includes("timingRequired:['DAYUN','YEAR','MONTHLY_WINDOWS_6']");
  if(dependency==='DAYUN_YEAR_MONTHLY_WINDOWS_12') return s.includes("timingRequired:['DAYUN','YEAR','MONTHLY_WINDOWS_12']");
  if(dependency==='NONE_NATAL'||dependency==='NONE_NATAL_STYLE') return /timingRequired:(?:Object\.freeze\()?\[\]/.test(s);
  if(dependency==='ACTIVE_DAYUN_OR_ANNUAL_CURRENT_ATTENTION') return s.includes("ACTIVE_DAYUN_OR_ANNUAL_FROM_STEP01_CORE");
  return false;
}

export function runStep04A0ProductSurfaceContractAuthority(){
  const v99=json(V99_AUTHORITY);
  const closure=json(V98_CLOSURE);
  const counts=Object.fromEntries(PRODUCT_DOMAIN_ORDER.map(d=>[d,FROZEN_PRODUCT_RECIPE_CATALOG.filter(x=>x.domain===d).length]));
  const ids=FROZEN_PRODUCT_RECIPE_CATALOG.map(x=>x.questionId);
  const artifactsFinal=FROZEN_PRODUCT_RECIPE_CATALOG.every(x=>artifactFinalFrozen(x.finalArtifact,x.questionId));
  const engineIdsMatch=FROZEN_PRODUCT_RECIPE_CATALOG.every(x=>engineDeclaresQuestion(x.engine,x.questionId));
  const engineTimingMatches=FROZEN_PRODUCT_RECIPE_CATALOG.every(x=>engineDeclaresTimingDependency(x.engine,x.timingDependency));
  const checks={
    v99AuthorizesOnlyStep04A0:
      v99.authorityReady===true&&v99.verdict==='AUTHORITY_FROZEN_STEP04_ASSIGNED'&&
      v99.nextAuthorizedTask==='STEP04-A0_PRODUCT_SURFACE_TAXONOMY_AND_CONTRACT_AUTHORITY'&&
      sha(V99_AUTHORITY_ENGINE)===EXPECTED[V99_AUTHORITY_ENGINE]&&sha(V99_AUTHORITY)===EXPECTED[V99_AUTHORITY]&&sha(V98_CLOSURE)===EXPECTED[V98_CLOSURE],
    frozenTwentyRecipeInventoryIsExact:
      FROZEN_PRODUCT_RECIPE_CATALOG.length===20&&new Set(ids).size===20&&artifactsFinal&&engineIdsMatch&&engineTimingMatches&&
      counts.CAREER===6&&counts.WEALTH===6&&counts.RELATIONSHIP===4&&counts.WELLBEING===4&&closure.summary?.totalInterpretationRecipeCountAfterClosure===20,
    canonicalEnvelopeHasOwnedNamespaces:
      JSON.stringify(PRODUCT_RESULT_ENVELOPE.requiredNamespaces)===JSON.stringify(['contract','chart','timing','domains','availability','provenance'])&&
      PRODUCT_RESULT_ENVELOPE.resultShape.step04MayDeriveState===false&&PRODUCT_RESULT_ENVELOPE.resultShape.step04MayRewriteAnswer===false,
    chartSurfaceCarriesFrozenAuthorityOnly:
      CHART_SURFACE_TAXONOMY.recomputationAllowed===false&&/CARRIERS_FOR_EXISTING_FROZEN_AUTHORITY_VALUES_ONLY/.test(CHART_SURFACE_TAXONOMY.rule),
    timingSurfacePreservesRecipeAuthorization:
      TIMING_SURFACE_TAXONOMY.relationshipMonthTimingAllowed===false&&TIMING_SURFACE_TAXONOMY.wellbeingMonthTimingAllowed===false&&
      JSON.stringify(TIMING_SURFACE_TAXONOMY.careerMonthTimingAllowedOnlyFor)===JSON.stringify(['CAREER_NEXT_6M'])&&
      JSON.stringify(TIMING_SURFACE_TAXONOMY.wealthMonthTimingAllowedOnlyFor)===JSON.stringify(['WEALTH_NEXT_12M']),
    availabilityAndUnknownTimeAreFirstClassWithoutFabrication:
      JSON.stringify(PRODUCT_RESULT_ENVELOPE.availabilityVocabulary)===JSON.stringify(['AVAILABLE','PARTIAL','UNAVAILABLE','ERROR'])&&
      PRODUCT_RESULT_ENVELOPE.availabilityDetailRulesDeferredTo==='STEP04-A3'&&/MUST_NOT_BE_FILLED_IN/.test(PRODUCT_RESULT_ENVELOPE.unknownTimeRule)&&
      STEP04_A0_HARD_BOUNDARIES.noPartialOrUnavailableFabrication===true,
    questionResultKeepsFrozenStateAnswerAndProvenanceOwnership:
      PRODUCT_RESULT_ENVELOPE.resultShape.stateOwnership==='FROZEN_RECIPE_OPAQUE_STATE_CODE'&&
      PRODUCT_RESULT_ENVELOPE.resultShape.answerOwnership==='FROZEN_RECIPE_RENDERED_OUTPUT'&&
      FROZEN_PRODUCT_RECIPE_CATALOG.every(x=>x.provenanceRequired&&x.statePolicy==='OPAQUE_FROZEN_RECIPE_STATE'),
    consumerBoundaryPreventsUiBypass:
      PRODUCT_CONSUMER_BOUNDARY.uiMustConsumeStep04Contract===true&&PRODUCT_CONSUMER_BOUNDARY.directUiRecipeCallsAllowed===false&&
      PRODUCT_CONSUMER_BOUNDARY.forbiddenDirectConsumerAccess.includes('STATE_RESOLVERS')&&
      PRODUCT_CONSUMER_BOUNDARY.exactSerializationDecisionDeferredTo==='STEP04-A2',
    frozenSafetyAndCrossDomainRulesRemainBinding:
      STEP04_A0_HARD_BOUNDARIES.noNewInterpretationRecipe&&STEP04_A0_HARD_BOUNDARIES.noStateReResolution&&STEP04_A0_HARD_BOUNDARIES.noEvidenceReResolution&&
      STEP04_A0_HARD_BOUNDARIES.noStructureOrStrengthRewrite&&STEP04_A0_HARD_BOUNDARIES.noContextDrivenEvidenceMutation&&
      STEP04_A0_HARD_BOUNDARIES.noNumericScoreConfidenceRankingTopNOrClaimVoting&&STEP04_A0_HARD_BOUNDARIES.noRelationshipOrWellbeingMonthTiming,
    a0DefinesAuthorityOnlyAndAuthorizesA1Next:
      STEP04_A0_HARD_BOUNDARIES.noFrameworkTransportPersistenceOrAuthDecision===true&&
      STEP04_A0_HARD_BOUNDARIES.a1AssemblyImplementationCreated===false
  };
  const authorityReady=Object.values(checks).every(Boolean);
  return {
    version:STEP04_A0_PRODUCT_SURFACE_CONTRACT_VERSION,
    stage:'STEP04-A0',
    baseline:'V99_AUTHORITY_FROZEN_STEP04_ASSIGNED',
    checks,
    productResultEnvelope:PRODUCT_RESULT_ENVELOPE,
    chartSurfaceTaxonomy:CHART_SURFACE_TAXONOMY,
    timingSurfaceTaxonomy:TIMING_SURFACE_TAXONOMY,
    domainOrder:PRODUCT_DOMAIN_ORDER,
    recipeCatalog:FROZEN_PRODUCT_RECIPE_CATALOG,
    consumerBoundary:PRODUCT_CONSUMER_BOUNDARY,
    hardBoundaries:STEP04_A0_HARD_BOUNDARIES,
    summary:{
      frozenRecipeCount:FROZEN_PRODUCT_RECIPE_CATALOG.length,
      domainCounts:counts,
      resultEnvelopeNamespaceCount:PRODUCT_RESULT_ENVELOPE.requiredNamespaces.length,
      newInterpretationRecipeCreated:false,
      assemblyImplementationCreated:false,
      uiImplementationCreated:false,
      serializationImplementationCreated:false
    },
    authorityReady,
    verdict:authorityReady?'A0_CONTRACT_AUTHORITY_FROZEN':'NOT_READY',
    nextAuthorizedTask:authorityReady?'STEP04-A1_CANONICAL_INTERPRETATION_ASSEMBLY_READ_MODEL':null
  };
}
