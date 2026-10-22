import { FROZEN_PRODUCT_RECIPE_CATALOG } from '../../src/step04A0ProductSurfaceContractAuthority.mjs';
import { buildQuestionAdmissionPlan } from './question-admission.mjs';
import { synthesizeCareerJobChange } from '../../src/careerJobChangeSynthesisEngine.mjs';
import { synthesizeCareerNewOpportunity } from '../../src/careerNewOpportunitySynthesisEngine.mjs';
import { synthesizeCareerCurrentState } from '../../../src/careerCurrentStateSynthesisEngine.mjs';
import { synthesizeCareerPromotion } from '../../src/careerPromotionSynthesisEngine.mjs';
import { synthesizeCareerEntrepreneurship } from '../../src/careerEntrepreneurshipSynthesisEngine.mjs';
import { synthesizeCareerNext6m } from '../../../src/careerNext6mSynthesisEngine.mjs';
import { synthesizeWealthCurrentState } from '../../src/wealthCurrentStateSynthesisEngine.mjs';
import { synthesizeWealthIncomeGrowth } from '../../src/wealthIncomeGrowthSynthesisEngine.mjs';
import { synthesizeWealthCashflow } from '../../src/wealthCashflowSynthesisEngine.mjs';
import { synthesizeWealthOpportunity } from '../../src/wealthOpportunitySynthesisEngine.mjs';
import { synthesizeWealthInvestmentStyle } from '../../src/wealthInvestmentStyleSynthesisEngine.mjs';
import { synthesizeWealthNext12m } from '../../src/wealthNext12mSynthesisEngine.mjs';
import { buildRelationshipBoundariesSynthesis } from '../../src/relationshipBoundariesSynthesisEngine.mjs';
import { buildRelationshipCommunicationSynthesis } from '../../src/relationshipCommunicationSynthesisEngine.mjs';
import { buildRelationshipSupportCareSynthesis } from '../../src/relationshipSupportCareSynthesisEngine.mjs';
import { buildRelationshipCurrentAttentionSynthesis } from '../../src/relationshipCurrentAttentionSynthesisEngine.mjs';
import { buildWellbeingDailyRhythmSynthesis } from '../../src/wellbeingDailyRhythmSynthesisEngine.mjs';
import { buildWellbeingLoadPatternSynthesis } from '../../src/wellbeingLoadPatternSynthesisEngine.mjs';
import { buildWellbeingRecoveryOrientationSynthesis } from '../../src/wellbeingRecoveryOrientationSynthesisEngine.mjs';
import { buildWellbeingCurrentAttentionSynthesis } from '../../src/wellbeingCurrentAttentionSynthesisEngine.mjs';

export function emptyComposition(admissionPlan = buildQuestionAdmissionPlan({ hasExactChart: false })) {
  return {
    admissionPlan,
    recipeOutputs: {},
    availabilityPlan: Object.fromEntries(FROZEN_PRODUCT_RECIPE_CATALOG.map(row => [row.questionId, { availability: 'UNAVAILABLE' }])),
    limitations: Object.fromEntries(Object.entries(admissionPlan).filter(([, status]) => status !== 'ADMITTED')),
  };
}
export function composeDomains(analysis, timingRoot, gender, careerContext) {
  const { chart } = analysis, { timing } = timingRoot;
  const out = emptyComposition(buildQuestionAdmissionPlan({ hasExactChart: true, timingRoot, careerContext }));
  const run = (id, callback) => {
    if (out.admissionPlan[id] !== 'ADMITTED') return;
    const result = callback();
    if (result.question.questionId !== id) throw new Error('FROZEN_QUESTION_ID_DRIFT');
    out.recipeOutputs[id] = result; out.availabilityPlan[id] = { availability: 'AVAILABLE' }; delete out.limitations[id];
  };
  run('CAREER_JOB_CHANGE', () => synthesizeCareerJobChange(chart, timing, careerContext.jobChange));
  run('CAREER_NEW_OPPORTUNITY', () => synthesizeCareerNewOpportunity(chart, timing, careerContext.newOpportunity));
  for (const [id, recipe] of [
    ['CAREER_CURRENT_STATE', synthesizeCareerCurrentState], ['CAREER_PROMOTION', synthesizeCareerPromotion], ['CAREER_ENTREPRENEURSHIP', synthesizeCareerEntrepreneurship],
    ['WEALTH_CURRENT_STATE', synthesizeWealthCurrentState], ['WEALTH_INCOME_GROWTH', synthesizeWealthIncomeGrowth], ['WEALTH_CASHFLOW', synthesizeWealthCashflow], ['WEALTH_OPPORTUNITY', synthesizeWealthOpportunity],
  ]) run(id, () => recipe(chart, timing, 'CTX_NONE'));
  run('CAREER_NEXT_6M', () => synthesizeCareerNext6m(chart, timing, timingRoot.sixMonth.windows, 'CTX_NONE'));
  run('WEALTH_NEXT_12M', () => synthesizeWealthNext12m(chart, timing, timingRoot.twelveMonth.windows, 'CTX_NONE'));
  run('WEALTH_INVESTMENT_STYLE', () => synthesizeWealthInvestmentStyle(chart, 'CTX_NONE'));
  for (const [id, recipe] of [
    ['RELATIONSHIP_BOUNDARIES', buildRelationshipBoundariesSynthesis], ['RELATIONSHIP_COMMUNICATION', buildRelationshipCommunicationSynthesis], ['RELATIONSHIP_SUPPORT_CARE', buildRelationshipSupportCareSynthesis], ['RELATIONSHIP_CURRENT_ATTENTION', buildRelationshipCurrentAttentionSynthesis],
    ['WELLBEING_DAILY_RHYTHM', buildWellbeingDailyRhythmSynthesis], ['WELLBEING_LOAD_PATTERN', buildWellbeingLoadPatternSynthesis], ['WELLBEING_RECOVERY_ORIENTATION', buildWellbeingRecoveryOrientationSynthesis], ['WELLBEING_CURRENT_ATTENTION', buildWellbeingCurrentAttentionSynthesis],
  ]) run(id, () => recipe({ chart, ...(id.endsWith('CURRENT_ATTENTION') ? { timing } : {}), ...(id.startsWith('RELATIONSHIP_') ? { gender } : {}), contextId: 'CTX_NONE' }));
  return out;
}
