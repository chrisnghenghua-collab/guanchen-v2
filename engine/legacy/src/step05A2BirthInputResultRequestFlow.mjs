import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  STEP05_A1_PUBLIC_ADAPTER_CONTRACT,
  createStep05PublicResultAdapter
} from './step05A1WebRuntimePublicContractAdapterFoundation.mjs';
import {STEP05_A0_NAVIGATION_CONTRACT} from './step05A0WebExperienceIaRouteContractAuthority.mjs';

export const STEP05_A2_FLOW_VERSION='GUANCHEN_STEP05_A2_BIRTH_INPUT_RESULT_REQUEST_FLOW_V1_V108';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(__dirname,'..');
const sha=(rel)=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,rel))).digest('hex');
const json=(rel)=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));

const V107_STATUS='GUANCHEN_CURRENT_STATUS_V107.json';
const V107_ENGINE='src/step05A1WebRuntimePublicContractAdapterFoundation.mjs';
const V107_ARTIFACT='STEP05_A1_WEB_RUNTIME_PUBLIC_CONTRACT_ADAPTER_FOUNDATION_V107.json';
const V107_HANDOFF='GUANCHEN_STEP05_HANDOFF_AFTER_A1_V1.txt';
const PUBLIC_PAYLOAD='STEP04_A3_PUBLIC_PRODUCT_PAYLOAD_V103.json';

const EXPECTED=Object.freeze({
  [V107_STATUS]:'2a1bb2b373048c33b662d76743b387984f8431dec569f382d55d56884e99c642',
  [V107_ENGINE]:'e3732a596fc87232e8ceecab289e8e5d9f3899e3f6b293d3988cdd8396ad7b67',
  [V107_ARTIFACT]:'fc6deffbeb857e8015b8d78fc9a0e4ff66809692c53a707bcea7e2127c1ed62f',
  [V107_HANDOFF]:'34d94a21a6bb233849660894c6857bc3a50d51680f30a0920d9672b7807dd0bc',
  [PUBLIC_PAYLOAD]:'e5cd4d3ef5816a9f91327645012f80b91a1000edb924142ed4be1522ce49b134'
});

export const STEP05_A2_BIRTH_REQUEST_CONTRACT=Object.freeze({
  requestType:'GUANCHEN_PRODUCT_RESULT_REQUEST',
  requestVersion:'1.0.0',
  route:'/birth',
  successDestination:'/result',
  calendarVocabulary:Object.freeze(['GREGORIAN']),
  genderVocabulary:Object.freeze(['MALE','FEMALE']),
  timeKnowledgeVocabulary:Object.freeze(['KNOWN','PARTIAL','UNKNOWN']),
  exactFields:Object.freeze([
    'birth.calendar','birth.date','birth.timeKnowledge','birth.time','birth.gender','birth.location','asOfLocal'
  ]),
  birthDateFormat:'YYYY-MM-DD_LEXICAL_ONLY_WEB_VALIDATION',
  knownTimeFormat:'HH:mm_LEXICAL_ONLY_WEB_VALIDATION',
  asOfLocalFormat:'ISO_LOCAL_DATETIME_WITH_EXPLICIT_OFFSET_LEXICAL_ONLY_WEB_VALIDATION',
  knownTimeRequiresClockValue:true,
  unknownTimeRequiresNullClockValue:true,
  partialTimeMayCarryClockValueOrNull:true,
  partialTimeMeaningReinterpretedByWeb:false,
  upstreamValidationRemainsAuthoritative:true,
  webCalendarCalculationAllowed:false,
  webTrueSolarCalculationAllowed:false,
  webFourPillarsCalculationAllowed:false,
  webDayunCalculationAllowed:false,
  webAvailabilityInferenceAllowed:false
});

export const STEP05_A2_RESULT_REQUEST_PORT_CONTRACT=Object.freeze({
  portName:'STEP05_PRODUCT_RESULT_REQUEST_PORT',
  input:'GUANCHEN_PRODUCT_RESULT_REQUEST/1.0.0',
  output:`${STEP05_A1_PUBLIC_ADAPTER_CONTRACT.schemaId}/${STEP05_A1_PUBLIC_ADAPTER_CONTRACT.schemaVersion}`,
  transport:'INJECTED_NOT_SELECTED_BY_A2',
  networkApiSelected:false,
  serverRuntimeSelected:false,
  persistenceSelected:false,
  accountOrCloudSelected:false,
  requestPortMayReturnPromise:true,
  upstreamOwnsCalendarChartTimingValidation:true,
  upstreamOwnsAvailabilitySemantics:true
});

export const STEP05_A2_FLOW_POLICY=Object.freeze({
  initialRoute:'/birth',
  successRoute:'/result',
  invalidInputRoute:'/birth',
  requestFailureRoute:'/birth',
  invalidPublicResultRoute:'/birth',
  statuses:Object.freeze(['IDLE','SUBMITTING','INVALID_INPUT','REQUEST_FAILED','INVALID_PUBLIC_RESULT','READY']),
  clientValidationScope:'PRESENCE_AND_LEXICAL_FORMAT_ONLY',
  resultValidationOwner:'STEP05_A1_PUBLIC_RESULT_ADAPTER',
  requestFailureIsInterpretationError:false,
  invalidInputIsInterpretationUnavailable:false,
  timeKnowledgeMustBeCarriedVerbatim:true,
  clientMayFillUnknownTime:false,
  clientMayInferPartialTime:false,
  clientMayRewriteReturnedAvailability:false,
  clientMayRewriteReturnedAnswerOrState:false,
  resultOverviewUiImplemented:false
});

const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const TIME_RE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const OFFSET_DATETIME_RE=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/;

function hashMatches(){
  return Object.entries(EXPECTED).every(([rel,expected])=>fs.existsSync(path.join(ROOT,rel))&&sha(rel)===expected);
}
function isPlainObject(value){ return Boolean(value)&&typeof value==='object'&&!Array.isArray(value); }
function deepClone(value){ return JSON.parse(JSON.stringify(value)); }
function deepFreeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}
function isNonEmptyString(value){ return typeof value==='string'&&value.trim().length>0; }

export function validateStep05BirthRequestInput(input){
  const errors=[];
  if(!isPlainObject(input)) return {valid:false,errors:['INPUT_NOT_OBJECT'],fieldErrors:{root:'INPUT_NOT_OBJECT'}};
  if(!isPlainObject(input.birth)) errors.push(['birth','BIRTH_OBJECT_REQUIRED']);
  const birth=isPlainObject(input.birth)?input.birth:{};
  if(!STEP05_A2_BIRTH_REQUEST_CONTRACT.calendarVocabulary.includes(birth.calendar)) errors.push(['birth.calendar','UNSUPPORTED_CALENDAR']);
  if(!DATE_RE.test(birth.date??'')) errors.push(['birth.date','DATE_YYYY_MM_DD_REQUIRED']);
  if(!STEP05_A2_BIRTH_REQUEST_CONTRACT.timeKnowledgeVocabulary.includes(birth.timeKnowledge)) errors.push(['birth.timeKnowledge','TIME_KNOWLEDGE_REQUIRED']);
  if(!STEP05_A2_BIRTH_REQUEST_CONTRACT.genderVocabulary.includes(birth.gender)) errors.push(['birth.gender','GENDER_REQUIRED']);
  if(!isNonEmptyString(birth.location)) errors.push(['birth.location','LOCATION_REQUIRED']);
  if(!OFFSET_DATETIME_RE.test(input.asOfLocal??'')) errors.push(['asOfLocal','EXPLICIT_OFFSET_DATETIME_REQUIRED']);

  if(birth.timeKnowledge==='KNOWN'&&!TIME_RE.test(birth.time??'')) errors.push(['birth.time','KNOWN_TIME_HH_MM_REQUIRED']);
  if(birth.timeKnowledge==='UNKNOWN'&&birth.time!=null&&birth.time!=='') errors.push(['birth.time','UNKNOWN_TIME_MUST_REMAIN_NULL']);
  if(birth.timeKnowledge==='PARTIAL'&&birth.time!=null&&birth.time!==''&&!TIME_RE.test(birth.time)) errors.push(['birth.time','PARTIAL_TIME_IF_PRESENT_MUST_BE_HH_MM']);

  const fieldErrors=Object.fromEntries(errors);
  return {valid:errors.length===0,errors:errors.map(([,code])=>code),fieldErrors};
}

export function buildStep05BirthProductRequest(input){
  const validation=validateStep05BirthRequestInput(input);
  if(!validation.valid){
    const error=new Error(`INVALID_BIRTH_REQUEST:${validation.errors.join(',')}`);
    error.code='INVALID_BIRTH_REQUEST';
    error.validation=validation;
    throw error;
  }
  const request={
    requestType:STEP05_A2_BIRTH_REQUEST_CONTRACT.requestType,
    requestVersion:STEP05_A2_BIRTH_REQUEST_CONTRACT.requestVersion,
    birth:{
      calendar:input.birth.calendar,
      date:input.birth.date,
      timeKnowledge:input.birth.timeKnowledge,
      time:input.birth.time===''?null:(input.birth.time??null),
      gender:input.birth.gender,
      location:input.birth.location
    },
    asOfLocal:input.asOfLocal
  };
  return deepFreeze(deepClone(request));
}

function initialFlowState(){
  return deepFreeze({
    status:'IDLE',route:STEP05_A2_FLOW_POLICY.initialRoute,
    validationErrors:[],fieldErrors:{},requestError:null,adapter:null,request:null
  });
}

export function createStep05BirthResultRequestFlow({requestProductResult}={}){
  if(typeof requestProductResult!=='function') throw new TypeError('requestProductResult function is required');
  let state=initialFlowState();
  const set=(next)=>{ state=deepFreeze(next); return state; };
  return Object.freeze({
    getState:()=>state,
    reset:()=>set(initialFlowState()),
    submit:async(input)=>{
      const validation=validateStep05BirthRequestInput(input);
      if(!validation.valid){
        return set({
          status:'INVALID_INPUT',route:STEP05_A2_FLOW_POLICY.invalidInputRoute,
          validationErrors:validation.errors,fieldErrors:validation.fieldErrors,requestError:null,adapter:null,request:null
        });
      }
      const request=buildStep05BirthProductRequest(input);
      set({status:'SUBMITTING',route:'/birth',validationErrors:[],fieldErrors:{},requestError:null,adapter:null,request});
      let payload;
      try{
        payload=await requestProductResult(request);
      }catch(error){
        return set({
          status:'REQUEST_FAILED',route:STEP05_A2_FLOW_POLICY.requestFailureRoute,
          validationErrors:[],fieldErrors:{},requestError:{code:'UPSTREAM_RESULT_REQUEST_FAILED',message:String(error?.message??error)},adapter:null,request
        });
      }
      try{
        const adapter=createStep05PublicResultAdapter(payload);
        return set({
          status:'READY',route:STEP05_A2_FLOW_POLICY.successRoute,
          validationErrors:[],fieldErrors:{},requestError:null,adapter,request
        });
      }catch(error){
        return set({
          status:'INVALID_PUBLIC_RESULT',route:STEP05_A2_FLOW_POLICY.invalidPublicResultRoute,
          validationErrors:[],fieldErrors:{},requestError:{code:error?.code??'INVALID_PUBLIC_PRODUCT_RESULT',message:String(error?.message??error)},adapter:null,request
        });
      }
    }
  });
}

export async function runStep05A2BirthInputAndResultRequestFlow(){
  const v107=json(V107_STATUS);
  const v107Artifact=json(V107_ARTIFACT);
  const publicPayload=json(PUBLIC_PAYLOAD);
  const knownInput={
    birth:{calendar:'GREGORIAN',date:'1990-03-14',timeKnowledge:'KNOWN',time:'15:20',gender:'MALE',location:'Kuala Lumpur, Malaysia'},
    asOfLocal:'2026-09-16T23:59:00+08:00'
  };
  const partialInput={
    birth:{calendar:'GREGORIAN',date:'1990-03-14',timeKnowledge:'PARTIAL',time:null,gender:'MALE',location:'Kuala Lumpur, Malaysia'},
    asOfLocal:'2026-09-16T23:59:00+08:00'
  };
  const unknownInput={
    birth:{calendar:'GREGORIAN',date:'1990-03-14',timeKnowledge:'UNKNOWN',time:null,gender:'MALE',location:'Kuala Lumpur, Malaysia'},
    asOfLocal:'2026-09-16T23:59:00+08:00'
  };
  let capturedRequest=null;
  const flow=createStep05BirthResultRequestFlow({requestProductResult:async(request)=>{capturedRequest=request; return publicPayload;}});
  const success=await flow.submit(knownInput);
  let invalidProviderCalls=0;
  const invalidFlow=createStep05BirthResultRequestFlow({requestProductResult:async()=>{invalidProviderCalls+=1; return publicPayload;}});
  const invalid=await invalidFlow.submit({...knownInput,birth:{...knownInput.birth,date:'1992/06/19'}});
  const failureFlow=createStep05BirthResultRequestFlow({requestProductResult:async()=>{throw new Error('validation probe upstream unavailable');}});
  const failure=await failureFlow.submit(knownInput);

  const checks={
    v107A1IsFrozenBaseline:
      hashMatches()&&v107.version==='V107'&&v107.step05A1==='FROZEN at V107'&&v107.step05A2==='NOT STARTED'&&
      v107.nextAuthorizedTask==='STEP05-A2_BIRTH_INPUT_AND_RESULT_REQUEST_FLOW'&&
      v107Artifact.foundationReady===true&&v107Artifact.verdict==='A1_WEB_RUNTIME_PUBLIC_ADAPTER_FOUNDATION_FROZEN',

    requestFieldsAreExactAndGroundedInFrozenUpstreamTrace:
      JSON.stringify(STEP05_A2_BIRTH_REQUEST_CONTRACT.exactFields)===JSON.stringify(['birth.calendar','birth.date','birth.timeKnowledge','birth.time','birth.gender','birth.location','asOfLocal'])&&
      STEP05_A2_BIRTH_REQUEST_CONTRACT.calendarVocabulary.length===1&&STEP05_A2_BIRTH_REQUEST_CONTRACT.calendarVocabulary[0]==='GREGORIAN'&&
      JSON.stringify(STEP05_A2_BIRTH_REQUEST_CONTRACT.genderVocabulary)===JSON.stringify(['MALE','FEMALE']),

    knownPartialUnknownTimeKnowledgeIsExplicitAndNeverFilled:
      validateStep05BirthRequestInput(knownInput).valid===true&&validateStep05BirthRequestInput(partialInput).valid===true&&validateStep05BirthRequestInput(unknownInput).valid===true&&
      buildStep05BirthProductRequest(partialInput).birth.time===null&&buildStep05BirthProductRequest(unknownInput).birth.time===null&&
      STEP05_A2_FLOW_POLICY.clientMayFillUnknownTime===false&&STEP05_A2_FLOW_POLICY.clientMayInferPartialTime===false,

    clientValidationIsLexicalOnlyAndUpstreamRemainsAuthoritative:
      STEP05_A2_FLOW_POLICY.clientValidationScope==='PRESENCE_AND_LEXICAL_FORMAT_ONLY'&&
      STEP05_A2_BIRTH_REQUEST_CONTRACT.upstreamValidationRemainsAuthoritative===true&&
      STEP05_A2_RESULT_REQUEST_PORT_CONTRACT.upstreamOwnsCalendarChartTimingValidation===true&&
      STEP05_A2_BIRTH_REQUEST_CONTRACT.webCalendarCalculationAllowed===false&&STEP05_A2_BIRTH_REQUEST_CONTRACT.webTrueSolarCalculationAllowed===false,

    invalidInputNeverInvokesProductResultPort:
      invalid.status==='INVALID_INPUT'&&invalid.route==='/birth'&&invalidProviderCalls===0&&invalid.adapter===null,

    successfulSubmitCarriesRequestVerbatimAndYieldsA1Adapter:
      success.status==='READY'&&success.route===STEP05_A0_NAVIGATION_CONTRACT.birthSuccessDestination&&
      capturedRequest.birth.date===knownInput.birth.date&&capturedRequest.birth.time===knownInput.birth.time&&capturedRequest.birth.timeKnowledge===knownInput.birth.timeKnowledge&&
      capturedRequest.birth.gender===knownInput.birth.gender&&capturedRequest.birth.location===knownInput.birth.location&&capturedRequest.asOfLocal===knownInput.asOfLocal&&
      success.adapter?.schemaId===STEP05_A1_PUBLIC_ADAPTER_CONTRACT.schemaId&&
      STEP05_A1_PUBLIC_ADAPTER_CONTRACT.domainOrder.flatMap(d=>success.adapter.getDomain(d).questions).length===20,

    returnedProductResultIsValidatedOnlyByFrozenA1PublicAdapter:
      STEP05_A2_FLOW_POLICY.resultValidationOwner==='STEP05_A1_PUBLIC_RESULT_ADAPTER'&&
      success.adapter.getPayload().contract.schemaVersion===STEP05_A1_PUBLIC_ADAPTER_CONTRACT.schemaVersion&&
      STEP05_A2_FLOW_POLICY.clientMayRewriteReturnedAvailability===false&&STEP05_A2_FLOW_POLICY.clientMayRewriteReturnedAnswerOrState===false,

    requestFailureStaysOutsideInterpretationAvailabilitySemantics:
      failure.status==='REQUEST_FAILED'&&failure.route==='/birth'&&failure.adapter===null&&
      failure.requestError.code==='UPSTREAM_RESULT_REQUEST_FAILED'&&STEP05_A2_FLOW_POLICY.requestFailureIsInterpretationError===false&&
      STEP05_A2_FLOW_POLICY.invalidInputIsInterpretationUnavailable===false,

    a2DoesNotSelectTransportPersistenceOrResultUi:
      STEP05_A2_RESULT_REQUEST_PORT_CONTRACT.networkApiSelected===false&&STEP05_A2_RESULT_REQUEST_PORT_CONTRACT.serverRuntimeSelected===false&&
      STEP05_A2_RESULT_REQUEST_PORT_CONTRACT.persistenceSelected===false&&STEP05_A2_RESULT_REQUEST_PORT_CONTRACT.accountOrCloudSelected===false&&
      STEP05_A2_FLOW_POLICY.resultOverviewUiImplemented===false,

    a2PreservesA0NavigationAndAuthorizesExactlyA3Next:
      STEP05_A2_BIRTH_REQUEST_CONTRACT.route==='/birth'&&STEP05_A2_BIRTH_REQUEST_CONTRACT.successDestination==='/result'&&
      STEP05_A0_NAVIGATION_CONTRACT.entryPrimaryDestination==='/birth'&&STEP05_A0_NAVIGATION_CONTRACT.birthSuccessDestination==='/result'
  };

  const flowReady=Object.values(checks).every(Boolean);
  return {
    version:STEP05_A2_FLOW_VERSION,
    stage:'STEP05-A2',
    name:'BIRTH_INPUT_AND_RESULT_REQUEST_FLOW',
    baseline:'V107_STEP05_A1_FROZEN',
    checks,
    requestContract:STEP05_A2_BIRTH_REQUEST_CONTRACT,
    resultRequestPortContract:STEP05_A2_RESULT_REQUEST_PORT_CONTRACT,
    flowPolicy:STEP05_A2_FLOW_POLICY,
    validationProbe:{
      knownRequest:buildStep05BirthProductRequest(knownInput),
      partialTimeKnowledgePreserved:buildStep05BirthProductRequest(partialInput).birth.timeKnowledge,
      unknownTimeKnowledgePreserved:buildStep05BirthProductRequest(unknownInput).birth.timeKnowledge,
      successStatus:success.status,
      successRoute:success.route,
      publicQuestionCount:STEP05_A1_PUBLIC_ADAPTER_CONTRACT.domainOrder.flatMap(d=>success.adapter.getDomain(d).questions).length,
      invalidInputStatus:invalid.status,
      invalidInputProviderCalls:invalidProviderCalls,
      requestFailureStatus:failure.status,
      requestFailureMappedToInterpretationAvailability:false
    },
    summary:{
      requestFieldCount:STEP05_A2_BIRTH_REQUEST_CONTRACT.exactFields.length,
      timeKnowledgeVocabulary:STEP05_A2_BIRTH_REQUEST_CONTRACT.timeKnowledgeVocabulary,
      publicSchema:`${STEP05_A1_PUBLIC_ADAPTER_CONTRACT.schemaId}/${STEP05_A1_PUBLIC_ADAPTER_CONTRACT.schemaVersion}`,
      stateReResolutionCount:0,
      answerRewriteCount:0,
      availabilityInferenceCount:0,
      calendarOrTimingReinterpretationCount:0,
      networkTransportSelected:false,
      persistenceSelected:false,
      webResultUiImplemented:false,
      upstreamSemanticsModified:false
    },
    flowReady,
    verdict:flowReady?'A2_BIRTH_INPUT_RESULT_REQUEST_FLOW_FROZEN':'NOT_READY',
    nextAuthorizedTask:flowReady?'STEP05-A3_RESULT_OVERVIEW_AND_DOMAIN_NAVIGATION':null,
    step05A3Started:false,
    step06Started:false
  };
}
