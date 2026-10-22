// v2 question generators: one entry per product question. gen(facts, copy, contextId?) -> answer.
import { careerCurrentState, careerJobChange, careerNewOpportunity, careerPromotion, careerEntrepreneurship, careerNext6m, JOB_CHANGE_CONTEXTS, NEW_OPPORTUNITY_CONTEXTS } from './questions/career.mjs';
import { wealthCurrentState, wealthIncomeGrowth, wealthCashflow, wealthOpportunity, wealthInvestmentStyle, wealthNext12m } from './questions/wealth.mjs';
import { relationshipBoundaries, relationshipCommunication, relationshipSupportCare, relationshipCurrentAttention } from './questions/relationship.mjs';
import { wellbeingDailyRhythm, wellbeingLoadPattern, wellbeingRecoveryOrientation, wellbeingCurrentAttention } from './questions/wellbeing.mjs';
export { JOB_CHANGE_CONTEXTS, NEW_OPPORTUNITY_CONTEXTS };
export const GENERATORS = {
  CAREER_JOB_CHANGE: careerJobChange, CAREER_NEW_OPPORTUNITY: careerNewOpportunity, CAREER_CURRENT_STATE: careerCurrentState, CAREER_PROMOTION: careerPromotion, CAREER_ENTREPRENEURSHIP: careerEntrepreneurship, CAREER_NEXT_6M: careerNext6m,
  WEALTH_CURRENT_STATE: wealthCurrentState, WEALTH_INCOME_GROWTH: wealthIncomeGrowth, WEALTH_CASHFLOW: wealthCashflow, WEALTH_OPPORTUNITY: wealthOpportunity, WEALTH_INVESTMENT_STYLE: wealthInvestmentStyle, WEALTH_NEXT_12M: wealthNext12m,
  RELATIONSHIP_BOUNDARIES: relationshipBoundaries, RELATIONSHIP_COMMUNICATION: relationshipCommunication, RELATIONSHIP_SUPPORT_CARE: relationshipSupportCare, RELATIONSHIP_CURRENT_ATTENTION: relationshipCurrentAttention,
  WELLBEING_DAILY_RHYTHM: wellbeingDailyRhythm, WELLBEING_LOAD_PATTERN: wellbeingLoadPattern, WELLBEING_RECOVERY_ORIENTATION: wellbeingRecoveryOrientation, WELLBEING_CURRENT_ATTENTION: wellbeingCurrentAttention,
};
// Timing-based questions need an active Dayun (month windows / dayun theme); natal questions do not.
export const NEEDS_ACTIVE_LUCK = new Set(['CAREER_NEXT_6M', 'WEALTH_NEXT_12M']);
export const QUESTION_TEXT = {
  CAREER_JOB_CHANGE: '现在适不适合换工作？', CAREER_NEW_OPPORTUNITY: '这个新工作机会怎么样？', CAREER_CURRENT_STATE: '最近工作整体怎么样？', CAREER_PROMOTION: '近期有没有升职／承担更大职责的机会？', CAREER_ENTREPRENEURSHIP: '现在适不适合创业或独立发展？', CAREER_NEXT_6M: '未来半年事业怎么走？',
  WEALTH_CURRENT_STATE: '最近财运整体怎么样？', WEALTH_INCOME_GROWTH: '近期收入有没有提升机会？', WEALTH_CASHFLOW: '为什么最近钱容易留不住？', WEALTH_OPPORTUNITY: '接下来有没有比较明显的财富机会？', WEALTH_INVESTMENT_STYLE: '我更适合怎样的理财／资金安排方式？', WEALTH_NEXT_12M: '未来一年财富节奏如何？',
  RELATIONSHIP_BOUNDARIES: '我在关系中需要怎样的边界、空间与责任安排？', RELATIONSHIP_COMMUNICATION: '我在关系中通常怎样表达、回应与协调？', RELATIONSHIP_SUPPORT_CARE: '我在关系中更习惯怎样付出、照料与接受支持？', RELATIONSHIP_CURRENT_ATTENTION: '最近关系互动更需要留意哪些议题？',
  WELLBEING_DAILY_RHYTHM: '我的日常节奏更适合怎样安排？', WELLBEING_LOAD_PATTERN: '我的日常负荷与平衡模式有什么特点？', WELLBEING_RECOVERY_ORIENTATION: '我更适合怎样恢复、回稳与调整节奏？', WELLBEING_CURRENT_ATTENTION: '最近一段时间的节奏与负荷需要留意什么？',
};
