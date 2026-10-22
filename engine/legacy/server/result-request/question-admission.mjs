import { FROZEN_PRODUCT_RECIPE_CATALOG } from '../../src/step04A0ProductSurfaceContractAuthority.mjs';

const activeRequired = new Set(['CAREER_JOB_CHANGE', 'CAREER_NEW_OPPORTUNITY', 'CAREER_CURRENT_STATE', 'CAREER_PROMOTION', 'CAREER_ENTREPRENEURSHIP', 'CAREER_NEXT_6M', 'WEALTH_CURRENT_STATE', 'WEALTH_INCOME_GROWTH', 'WEALTH_CASHFLOW', 'WEALTH_OPPORTUNITY', 'WEALTH_NEXT_12M']);
export const ADMISSION_STATUSES = Object.freeze(['ADMITTED', 'UNAVAILABLE_MISSING_REALITY_CONTEXT', 'UNAVAILABLE_MISSING_REQUIRED_INPUT', 'UNSUPPORTED_TIMING']);

// Internal only. No reality context is inferred from a chart or supplied by V1.
// Explicit contexts are used solely by internal callers such as regression probes.
export function buildQuestionAdmissionPlan({ hasExactChart, timingRoot, careerContext } = {}) {
  return Object.fromEntries(FROZEN_PRODUCT_RECIPE_CATALOG.map(({ questionId: id }) => {
    let status = 'ADMITTED';
    if ((id === 'CAREER_JOB_CHANGE' && careerContext?.jobChange == null) ||
        (id === 'CAREER_NEW_OPPORTUNITY' && careerContext?.newOpportunity == null)) status = 'UNAVAILABLE_MISSING_REALITY_CONTEXT';
    else if (!hasExactChart) status = 'UNAVAILABLE_MISSING_REQUIRED_INPUT';
    else if (activeRequired.has(id) && timingRoot?.status !== 'ACTIVE') status = 'UNSUPPORTED_TIMING';
    else if ((id === 'CAREER_NEXT_6M' && !timingRoot?.sixMonth) || (id === 'WEALTH_NEXT_12M' && !timingRoot?.twelveMonth)) status = 'UNSUPPORTED_TIMING';
    return [id, status];
  }));
}

export function assertQuestionAdmissionPlan(plan) {
  const ids = FROZEN_PRODUCT_RECIPE_CATALOG.map(row => row.questionId);
  if (!plan || JSON.stringify(Object.keys(plan)) !== JSON.stringify(ids) ||
      Object.values(plan).some(value => !ADMISSION_STATUSES.includes(value))) throw new Error('INVALID_QUESTION_ADMISSION_PLAN');
}
