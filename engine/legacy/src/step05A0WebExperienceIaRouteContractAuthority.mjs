import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const STEP05_A0_IA_ROUTE_AUTHORITY_VERSION='GUANCHEN_STEP05_A0_WEB_EXPERIENCE_IA_ROUTE_CONTRACT_AUTHORITY_V1_V106';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(__dirname,'..');
const sha=(rel)=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,rel))).digest('hex');
const json=(rel)=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));

const V105_STATUS='GUANCHEN_CURRENT_STATUS_V105.json';
const V105_ENGINE='src/step05WebExperienceIntegrationAuthority.mjs';
const V105_ARTIFACT='STEP05_WEB_EXPERIENCE_INTEGRATION_AUTHORITY_V105.json';
const V105_HANDOFF='GUANCHEN_STEP05_AUTHORITY_HANDOFF_V1.txt';
const PUBLIC_PAYLOAD='STEP04_A3_PUBLIC_PRODUCT_PAYLOAD_V103.json';

const EXPECTED=Object.freeze({
  [V105_STATUS]:'cf97142962be12df7768237c4d5ebd1376d0957a6242b12985bf0b087b9a1a86',
  [V105_ENGINE]:'932d4cfeed33e0b98eef58b0e55e4bfe2b4c5d35dcc3c0d23bd0b197f25a0134',
  [V105_ARTIFACT]:'b17623945a961cfff3b44a3b18bbf92e9899d5382739ebc4f6e8003eeb088a1d',
  [V105_HANDOFF]:'4f2897c23d61bb9fffa07418441134d382d1c06fd72450cefeaa7cdc8d23865b',
  [PUBLIC_PAYLOAD]:'e5cd4d3ef5816a9f91327645012f80b91a1000edb924142ed4be1522ce49b134'
});

export const STEP05_A0_DOMAIN_ROUTES=Object.freeze({
  career:'CAREER',
  wealth:'WEALTH',
  relationship:'RELATIONSHIP',
  wellbeing:'WELLBEING'
});

export const STEP05_A0_ROUTE_CONTRACT=Object.freeze([
  Object.freeze({id:'ENTRY',path:'/',surface:'ENTRY',owner:'STEP05-A2',requiresPublicResult:false}),
  Object.freeze({id:'BIRTH_INPUT',path:'/birth',surface:'BIRTH_INPUT',owner:'STEP05-A2',requiresPublicResult:false}),
  Object.freeze({id:'RESULT_OVERVIEW',path:'/result',surface:'RESULT_OVERVIEW',owner:'STEP05-A3',requiresPublicResult:true}),
  Object.freeze({id:'RESULT_CHART',path:'/result/chart',surface:'CHART_OVERVIEW',owner:'STEP05-A3',requiresPublicResult:true}),
  Object.freeze({id:'RESULT_TIMING',path:'/result/timing',surface:'TIMING_OVERVIEW',owner:'STEP05-A3',requiresPublicResult:true}),
  Object.freeze({id:'RESULT_DOMAIN',path:'/result/{domain}',surface:'DOMAIN_OVERVIEW',owner:'STEP05-A3',requiresPublicResult:true}),
  Object.freeze({id:'RESULT_QUESTION',path:'/result/{domain}/{questionId}',surface:'QUESTION_DETAIL',owner:'STEP05-A4',requiresPublicResult:true})
]);

export const STEP05_A0_NAVIGATION_CONTRACT=Object.freeze({
  entryPrimaryDestination:'/birth',
  birthSuccessDestination:'/result',
  resultPrimaryChildren:Object.freeze(['/result/chart','/result/timing','/result/{domain}']),
  domainQuestionDestination:'/result/{domain}/{questionId}',
  questionBackDestination:'/result/{domain}',
  chartBackDestination:'/result',
  timingBackDestination:'/result',
  missingResultContextRecovery:'/birth',
  invalidDomainOrQuestionRecovery:'/result',
  availabilitySpecificRouteCreated:false,
  resultIdOrAccountRouteCreated:false,
  deepLinkPersistenceGuarantee:false
});

export const STEP05_A0_PUBLIC_CONSUMER_MAP=Object.freeze({
  adapterValidation:Object.freeze([
    'contract.schemaId','contract.schemaVersion','contract.domainOrder','provenance.consumerBoundary'
  ]),
  screens:Object.freeze({
    ENTRY:Object.freeze([]),
    BIRTH_INPUT:Object.freeze([]),
    RESULT_OVERVIEW:Object.freeze(['contract','chart','timing','domains','availability']),
    CHART_OVERVIEW:Object.freeze(['contract','chart','availability']),
    TIMING_OVERVIEW:Object.freeze(['contract','chart.timeKnowledge','timing','availability']),
    DOMAIN_OVERVIEW:Object.freeze(['contract','domains.{DOMAIN}','availability']),
    QUESTION_DETAIL:Object.freeze(['contract','domains.{DOMAIN}.questions[{questionId}]','availability','timing:BY_TIMING_DEPENDENCY'])
  }),
  publicOnly:true,
  recipeInternalsAllowed:false,
  a1AssemblyAdapterAllowed:false,
  evidenceOrResolverAccessAllowed:false
});

export const STEP05_A0_TIMING_PRESENTATION_POLICY=Object.freeze({
  NONE_NATAL:Object.freeze([]),
  NONE_NATAL_STYLE:Object.freeze([]),
  DAYUN_YEAR:Object.freeze(['timing.activeDayun','timing.annual']),
  DAYUN_YEAR_PLUS_RECIPE_SPECIFIC_REALITY_INPUT:Object.freeze(['timing.activeDayun','timing.annual']),
  DAYUN_YEAR_MONTHLY_WINDOWS_6:Object.freeze(['timing.activeDayun','timing.annual','timing.monthlyWindows.CAREER_NEXT_6M']),
  DAYUN_YEAR_MONTHLY_WINDOWS_12:Object.freeze(['timing.activeDayun','timing.annual','timing.monthlyWindows.WEALTH_NEXT_12M']),
  ACTIVE_DAYUN_OR_ANNUAL_CURRENT_ATTENTION:Object.freeze(['timing.activeDayun','timing.annual']),
  monthlyTimingQuestionIds:Object.freeze(['CAREER_NEXT_6M','WEALTH_NEXT_12M']),
  relationshipMonthTimingAllowed:false,
  wellbeingMonthTimingAllowed:false,
  webMayInventTiming:false
});

export const STEP05_A0_AVAILABILITY_UX_AUTHORITY=Object.freeze({
  owner:'STEP05-A4',
  vocabulary:Object.freeze(['AVAILABLE','PARTIAL','UNAVAILABLE','ERROR']),
  sameRouteForAllStates:true,
  availabilityFieldIsAuthoritative:true,
  inferFromNullsAllowed:false,
  inferFromTimeKnowledgeAllowed:false,
  partialMayRenderOnlyNonNullCarriedContent:true,
  unavailableMayRenderInterpretationContent:false,
  errorMayRenderInterpretationContent:false,
  unknownOrPartialTimeIsError:false,
  fabricateMissingContentAllowed:false
});

export const STEP05_A0_INPUT_SURFACE_BOUNDARY=Object.freeze({
  route:'/birth',
  surface:'BIRTH_INPUT',
  owner:'STEP05-A2',
  exactRequestFieldContractDeferredTo:'STEP05-A2',
  a0DoesNotInventInputFieldsUnsupportedByFrozenUpstream:true,
  clientMayReinterpretCalendarOrTiming:false,
  authAccountCloudPersistenceRequired:false
});

export const STEP05_A0_IMPLEMENTATION_DEFERRALS=Object.freeze({
  frameworkRuntime:'STEP05-A1',
  publicContractAdapter:'STEP05-A1',
  birthRequestImplementation:'STEP05-A2',
  resultOverviewImplementation:'STEP05-A3',
  detailAndNonAvailableUxImplementation:'STEP05-A4',
  responsiveAccessibilityHardening:'STEP05-A5',
  finalGate:'STEP05-A6',
  visualDesignSystemImplementation:'DEFERRED_NOT_AUTHORIZED_BY_A0',
  persistenceAuthCloudAccount:'NOT_AUTHORIZED_BY_A0'
});

function hashMatches(){
  return Object.entries(EXPECTED).every(([rel,expected])=>fs.existsSync(path.join(ROOT,rel))&&sha(rel)===expected);
}
function route(id){ return STEP05_A0_ROUTE_CONTRACT.find(x=>x.id===id); }
function flattenQuestions(payload){ return Object.values(payload.domains).flatMap(d=>d.questions); }
function hasOnlyPublicSelectors(){
  const values=[...STEP05_A0_PUBLIC_CONSUMER_MAP.adapterValidation,...Object.values(STEP05_A0_PUBLIC_CONSUMER_MAP.screens).flat()];
  return values.every(v=>!/(evidence|resolver|engine|finalGate|sha256|trace|debug|assemblyAdapter|recipeInternal)/i.test(v));
}

export function runStep05A0WebExperienceIaRouteContractAuthority(){
  const v105=json(V105_STATUS);
  const v105Authority=json(V105_ARTIFACT);
  const payload=json(PUBLIC_PAYLOAD);
  const questions=flattenQuestions(payload);
  const routePaths=STEP05_A0_ROUTE_CONTRACT.map(x=>x.path);
  const routeIds=STEP05_A0_ROUTE_CONTRACT.map(x=>x.id);
  const domainEntries=Object.entries(STEP05_A0_DOMAIN_ROUTES);
  const questionDomains=Object.fromEntries(questions.map(q=>[q.questionId,q.domain]));
  const timingDependencies=[...new Set(questions.map(q=>q.timingDependency))];

  const checks={
    v105RoadmapAuthorityIsFrozenBaseline:
      hashMatches()&&v105.version==='V105'&&v105.step04==='CLOSED / FROZEN'&&
      v105.step05==='AUTHORIZED / ROADMAP FROZEN / IMPLEMENTATION NOT STARTED'&&v105.step05A0==='NOT STARTED'&&
      v105.nextAuthorizedTask==='STEP05-A0_WEB_EXPERIENCE_IA_ROUTE_CONTRACT_AUTHORITY'&&
      v105Authority.authorityReady===true&&v105Authority.verdict==='AUTHORITY_FROZEN_STEP05_ASSIGNED',

    routeTaxonomyIsExactUniqueAndFrameworkNeutral:
      JSON.stringify(routeIds)===JSON.stringify(['ENTRY','BIRTH_INPUT','RESULT_OVERVIEW','RESULT_CHART','RESULT_TIMING','RESULT_DOMAIN','RESULT_QUESTION'])&&
      JSON.stringify(routePaths)===JSON.stringify(['/','/birth','/result','/result/chart','/result/timing','/result/{domain}','/result/{domain}/{questionId}'])&&
      new Set(routePaths).size===7&&STEP05_A0_IMPLEMENTATION_DEFERRALS.frameworkRuntime==='STEP05-A1',

    screenOwnershipMatchesFrozenSubstageResponsibilities:
      route('ENTRY').owner==='STEP05-A2'&&route('BIRTH_INPUT').owner==='STEP05-A2'&&
      ['RESULT_OVERVIEW','RESULT_CHART','RESULT_TIMING','RESULT_DOMAIN'].every(id=>route(id).owner==='STEP05-A3')&&
      route('RESULT_QUESTION').owner==='STEP05-A4'&&STEP05_A0_AVAILABILITY_UX_AUTHORITY.owner==='STEP05-A4',

    routeGraphRequiresNoInventedPersistenceAuthOrAccount:
      STEP05_A0_NAVIGATION_CONTRACT.entryPrimaryDestination==='/birth'&&STEP05_A0_NAVIGATION_CONTRACT.birthSuccessDestination==='/result'&&
      STEP05_A0_NAVIGATION_CONTRACT.missingResultContextRecovery==='/birth'&&STEP05_A0_NAVIGATION_CONTRACT.resultIdOrAccountRouteCreated===false&&
      STEP05_A0_NAVIGATION_CONTRACT.deepLinkPersistenceGuarantee===false&&STEP05_A0_INPUT_SURFACE_BOUNDARY.authAccountCloudPersistenceRequired===false,

    domainAndQuestionRouteIdentityArePublicContractBound:
      JSON.stringify(domainEntries)===JSON.stringify([['career','CAREER'],['wealth','WEALTH'],['relationship','RELATIONSHIP'],['wellbeing','WELLBEING']])&&
      questions.length===20&&questions.every(q=>Object.values(STEP05_A0_DOMAIN_ROUTES).includes(q.domain)&&questionDomains[q.questionId]===q.domain)&&
      route('RESULT_QUESTION').path==='/result/{domain}/{questionId}',

    screenConsumersStayInsideStep04PublicSerialization:
      payload.contract.schemaId==='GUANCHEN_PUBLIC_PRODUCT_RESULT'&&payload.contract.schemaVersion==='1.0.0'&&
      payload.provenance.consumerBoundary==='STEP04_A2_PUBLIC_SERIALIZATION_ONLY'&&STEP05_A0_PUBLIC_CONSUMER_MAP.publicOnly===true&&
      STEP05_A0_PUBLIC_CONSUMER_MAP.recipeInternalsAllowed===false&&STEP05_A0_PUBLIC_CONSUMER_MAP.a1AssemblyAdapterAllowed===false&&
      STEP05_A0_PUBLIC_CONSUMER_MAP.evidenceOrResolverAccessAllowed===false&&hasOnlyPublicSelectors(),

    timingPresentationIsDependencyDrivenAndMonthLimited:
      timingDependencies.every(dep=>Object.prototype.hasOwnProperty.call(STEP05_A0_TIMING_PRESENTATION_POLICY,dep))&&
      JSON.stringify(STEP05_A0_TIMING_PRESENTATION_POLICY.monthlyTimingQuestionIds)===JSON.stringify(['CAREER_NEXT_6M','WEALTH_NEXT_12M'])&&
      STEP05_A0_TIMING_PRESENTATION_POLICY.relationshipMonthTimingAllowed===false&&STEP05_A0_TIMING_PRESENTATION_POLICY.wellbeingMonthTimingAllowed===false&&
      questions.filter(q=>q.domain==='RELATIONSHIP'||q.domain==='WELLBEING').every(q=>!STEP05_A0_TIMING_PRESENTATION_POLICY[q.timingDependency].some(x=>x.includes('monthlyWindows'))),

    availabilityStatesStayOnSameRouteWithoutFabrication:
      JSON.stringify(STEP05_A0_AVAILABILITY_UX_AUTHORITY.vocabulary)===JSON.stringify(['AVAILABLE','PARTIAL','UNAVAILABLE','ERROR'])&&
      STEP05_A0_NAVIGATION_CONTRACT.availabilitySpecificRouteCreated===false&&STEP05_A0_AVAILABILITY_UX_AUTHORITY.sameRouteForAllStates===true&&
      STEP05_A0_AVAILABILITY_UX_AUTHORITY.inferFromNullsAllowed===false&&STEP05_A0_AVAILABILITY_UX_AUTHORITY.inferFromTimeKnowledgeAllowed===false&&
      STEP05_A0_AVAILABILITY_UX_AUTHORITY.fabricateMissingContentAllowed===false&&STEP05_A0_AVAILABILITY_UX_AUTHORITY.unknownOrPartialTimeIsError===false,

    inputRouteIsFrozenButFieldContractIsNotInvented:
      STEP05_A0_INPUT_SURFACE_BOUNDARY.route==='/birth'&&STEP05_A0_INPUT_SURFACE_BOUNDARY.owner==='STEP05-A2'&&
      STEP05_A0_INPUT_SURFACE_BOUNDARY.exactRequestFieldContractDeferredTo==='STEP05-A2'&&
      STEP05_A0_INPUT_SURFACE_BOUNDARY.a0DoesNotInventInputFieldsUnsupportedByFrozenUpstream===true&&STEP05_A0_INPUT_SURFACE_BOUNDARY.clientMayReinterpretCalendarOrTiming===false,

    a0IsAuthorityOnlyAndAuthorizesOnlyA1Next:
      STEP05_A0_IMPLEMENTATION_DEFERRALS.publicContractAdapter==='STEP05-A1'&&STEP05_A0_IMPLEMENTATION_DEFERRALS.birthRequestImplementation==='STEP05-A2'&&
      STEP05_A0_IMPLEMENTATION_DEFERRALS.resultOverviewImplementation==='STEP05-A3'&&STEP05_A0_IMPLEMENTATION_DEFERRALS.detailAndNonAvailableUxImplementation==='STEP05-A4'&&
      STEP05_A0_IMPLEMENTATION_DEFERRALS.finalGate==='STEP05-A6'&&v105.step06==='NOT STARTED'
  };

  const authorityReady=Object.values(checks).every(Boolean);
  return {
    version:STEP05_A0_IA_ROUTE_AUTHORITY_VERSION,
    stage:'STEP05-A0',
    baseline:'V105_STEP05_ROADMAP_AUTHORITY_FROZEN',
    checks,
    informationArchitecture:{
      routes:STEP05_A0_ROUTE_CONTRACT,
      domainRoutes:STEP05_A0_DOMAIN_ROUTES,
      navigation:STEP05_A0_NAVIGATION_CONTRACT,
      inputSurface:STEP05_A0_INPUT_SURFACE_BOUNDARY
    },
    publicConsumerMapping:STEP05_A0_PUBLIC_CONSUMER_MAP,
    timingPresentationPolicy:STEP05_A0_TIMING_PRESENTATION_POLICY,
    availabilityUxAuthority:STEP05_A0_AVAILABILITY_UX_AUTHORITY,
    implementationDeferrals:STEP05_A0_IMPLEMENTATION_DEFERRALS,
    summary:{
      routeCount:STEP05_A0_ROUTE_CONTRACT.length,
      resultRouteCount:STEP05_A0_ROUTE_CONTRACT.filter(x=>x.requiresPublicResult).length,
      domainCount:Object.keys(STEP05_A0_DOMAIN_ROUTES).length,
      frozenPublicQuestionCount:questions.length,
      schemaId:payload.contract.schemaId,
      schemaVersion:payload.contract.schemaVersion,
      publicConsumerBoundary:payload.provenance.consumerBoundary,
      frameworkSelected:false,
      webPageImplemented:false,
      inputFieldContractInvented:false,
      persistenceAuthCloudDecisionInvented:false,
      upstreamSemanticsModified:false
    },
    authorityReady,
    verdict:authorityReady?'A0_WEB_IA_ROUTE_CONTRACT_FROZEN':'NOT_READY',
    nextAuthorizedTask:authorityReady?'STEP05-A1_WEB_RUNTIME_AND_PUBLIC_CONTRACT_ADAPTER_FOUNDATION':null,
    step05A1Started:false,
    step06Started:false
  };
}
