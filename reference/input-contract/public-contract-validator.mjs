// Generated from frozen STEP05 public validation. Regenerate with scripts/deriveBrowserPublicValidationS4.mjs.
// Source SHA256: e3732a596fc87232e8ceecab289e8e5d9f3899e3f6b293d3988cdd8396ad7b67
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
