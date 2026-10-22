import { validateStep05PublicPayload } from './public-contract-validator.mjs';

const FROZEN_QUESTION_IDS={
  CAREER:['CAREER_JOB_CHANGE','CAREER_NEW_OPPORTUNITY','CAREER_CURRENT_STATE','CAREER_PROMOTION','CAREER_ENTREPRENEURSHIP','CAREER_NEXT_6M'],
  WEALTH:['WEALTH_CURRENT_STATE','WEALTH_INCOME_GROWTH','WEALTH_CASHFLOW','WEALTH_OPPORTUNITY','WEALTH_INVESTMENT_STYLE','WEALTH_NEXT_12M'],
  RELATIONSHIP:['RELATIONSHIP_BOUNDARIES','RELATIONSHIP_COMMUNICATION','RELATIONSHIP_SUPPORT_CARE','RELATIONSHIP_CURRENT_ATTENTION'],
  WELLBEING:['WELLBEING_DAILY_RHYTHM','WELLBEING_LOAD_PATTERN','WELLBEING_RECOVERY_ORIENTATION','WELLBEING_CURRENT_ATTENTION']
};
function exactTopKeys(payload,expected){
  return payload&&typeof payload==='object'&&!Array.isArray(payload)&&JSON.stringify(Object.keys(payload))===JSON.stringify(expected);
}
function isRecord(value){ return value!==null&&typeof value==='object'&&!Array.isArray(value); }
export function publicQuestions(payload,domainOrder){
  return domainOrder.flatMap(domain=>payload?.domains?.[domain]?.questions??[]);
}
function validateRuntimeShape(payload,contract){
  const c=contract.publicAdapter;
  const errors=[];
  if(!exactTopKeys(payload,c.topLevelNamespaces)) errors.push('TOP_LEVEL_NAMESPACE_MISMATCH');
  if(!isRecord(payload?.contract)) errors.push('CONTRACT_STRUCTURE_INVALID');
  if(!isRecord(payload?.chart)) errors.push('CHART_STRUCTURE_INVALID');
  if(!isRecord(payload?.timing)) errors.push('TIMING_STRUCTURE_INVALID');
  if(!isRecord(payload?.domains)) errors.push('DOMAINS_STRUCTURE_INVALID');
  if(!isRecord(payload?.availability)) errors.push('AVAILABILITY_STRUCTURE_INVALID');
  if(!isRecord(payload?.provenance)) errors.push('PROVENANCE_STRUCTURE_INVALID');
  if(payload?.contract?.schemaId!==c.schemaId) errors.push('SCHEMA_ID_MISMATCH');
  if(payload?.contract?.schemaVersion!==c.schemaVersion) errors.push('SCHEMA_VERSION_MISMATCH');
  if(JSON.stringify(payload?.contract?.domainOrder)!==JSON.stringify(c.domainOrder)) errors.push('DOMAIN_ORDER_MISMATCH');
  if(JSON.stringify(payload?.availability?.vocabulary)!==JSON.stringify(c.availabilityVocabulary)) errors.push('AVAILABILITY_VOCABULARY_MISMATCH');
  if(!c.availabilityVocabulary.includes(payload?.availability?.overall)) errors.push('OVERALL_AVAILABILITY_INVALID');
  const mode=payload?.chart?.timeKnowledge?.mode;
  if(!['KNOWN','PARTIAL','UNKNOWN'].includes(mode)) errors.push('TIME_KNOWLEDGE_INVALID');
  if(mode==='KNOWN'){
  for(const field of ['pillars','dayMaster','strengthBand','structureKey','timeKnowledge']) if(payload?.chart?.[field]==null) errors.push(`CHART_FIELD_MISSING:${field}`);
  for(const field of ['activeDayun','annual','monthlyWindows']) if(!Object.hasOwn(payload?.timing??{},field)) errors.push(`TIMING_FIELD_MISSING:${field}`);
  }
  if(!isRecord(payload?.availability?.questionStatuses)) errors.push('QUESTION_STATUSES_INVALID');
  for(const domain of c.domainOrder){
    const value=payload?.domains?.[domain]; const expectedIds=FROZEN_QUESTION_IDS[domain];
    if(!isRecord(value)||value.domain!==domain||!Array.isArray(value.questions)){errors.push(`DOMAIN_STRUCTURE_INVALID:${domain}`);continue;}
    if(value.questionCount!==expectedIds.length||value.questions.length!==expectedIds.length) errors.push(`DOMAIN_QUESTION_COUNT_INVALID:${domain}`);
    if(JSON.stringify(value.questions.map(q=>q?.questionId))!==JSON.stringify(expectedIds)) errors.push(`QUESTION_IDENTITY_MISMATCH:${domain}`);
    for(const q of value.questions){
      if(!isRecord(q)||q.domain!==domain||!expectedIds.includes(q.questionId)||!c.availabilityVocabulary.includes(q.availability)||typeof q.timingDependency!=='string'||!isRecord(q.provenance)) errors.push(`QUESTION_STRUCTURE_INVALID:${q?.questionId??domain}`);
      if(payload?.availability?.questionStatuses?.[q.questionId]!==q.availability) errors.push(`QUESTION_STATUS_MISMATCH:${q.questionId}`);
      if((q.availability==='UNAVAILABLE'||q.availability==='ERROR')&&(q.state!==null||q.answer!==null)) errors.push(`NONAVAILABLE_CONTENT_PRESENT:${q.questionId}`);
      if(q.availability==='AVAILABLE'&&(q.state==null||!isRecord(q.answer))) errors.push(`AVAILABLE_CONTENT_MISSING:${q.questionId}`);
    }
  }
  const questions=publicQuestions(payload,c.domainOrder);
  if(questions.length!==c.frozenQuestionCount) errors.push('QUESTION_COUNT_MISMATCH');
  if(new Set(questions.map(q=>q.questionId)).size!==questions.length) errors.push('DUPLICATE_QUESTION_ID');
  if(questions.some(q=>!q.questionId||!q.domain||!q.availability||q.timingDependency==null)) errors.push('QUESTION_PUBLIC_FIELDS_MISSING');
  return {valid:errors.length===0,errors};
}

// STEP05 owns public validation; existing runtime shape guards remain for UI safety.
// Sparse chart/timing is permitted by the frozen contract for uncertain birth time.
export function validatePublicResult(payload,contract){
  try {
    const base=validateStep05PublicPayload(payload);
    if(!base.valid) return base;
    return validateRuntimeShape(payload,contract);
  } catch { return {valid:false,errors:['MALFORMED_PUBLIC_RESULT']}; }
}
