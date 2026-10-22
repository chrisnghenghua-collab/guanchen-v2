import { jieTermsForGregorianYear } from '../../packages/step01-production-core/src/core/bazi/calendar/solarTerms.ts';
import { addCalendarComponents } from '../../packages/step01-production-core/src/core/bazi/calendar/gregorian.ts';
import { buildSixMonthTimingWindows, buildTwelveMonthTimingWindows } from '../../src/monthTimingAdapterEngine.mjs';
import { resolveTimingRelations } from '../../src/timingRelationResolutionEngine.mjs';

export function composeTimingRoot(core, normalized, analysis) {
  const active = core.luck.asOf.status === 'ACTIVE';
  const timing = { ...(active ? { dayun: core.luck.asOf.period.name } : {}), year: core.timing.annual.name };
  const relationResolution = resolveTimingRelations(analysis.chart, timing);
  const result = { status: core.luck.asOf.status, timing, activeJie: structuredClone(core.timing.activeJie), annual: structuredClone(core.timing.annual), asOf: normalized.asOf.original, relationResolution, sixMonth: null, twelveMonth: null, windowLimitations: {}, jieBoundaries: [], dayunTransitions: [] };
  if (!active) {
    result.windowLimitations = { sixMonth: 'PRE_LUCK', twelveMonth: 'PRE_LUCK' };
    return result;
  }
  const endMs = months => {
    const end = addCalendarComponents(normalized.asOf.local, { months });
    return Date.UTC(end.year, end.month - 1, end.day, end.hour, end.minute, end.second) - normalized.asOf.offsetMinutes * 60000;
  };
  const utcYear = new Date(normalized.asOf.instantMs).getUTCFullYear();
  if (utcYear + 2 > 9999) { result.windowLimitations = { sixMonth: 'UNSUPPORTED_CALENDAR_RANGE', twelveMonth: 'UNSUPPORTED_CALENDAR_RANGE' }; return result; }
  // Exact boundaries come from the restored STEP01 calculator, not month tables.
  result.jieBoundaries = [utcYear, utcYear + 1, utcYear + 2].flatMap(jieTermsForGregorianYear)
    .filter(term => term.instantMs > normalized.asOf.instantMs).sort((a, b) => a.instantMs - b.instantMs)
    .map(term => ({ name: term.name, instant: new Date(term.instantMs).toISOString(), confirmed: true, source: 'STEP01_EXACT_JIE_RECOVERED_E2C' }));
  result.dayunTransitions = core.luck.boundariesUTC.slice(1, core.luck.sequence.length).map((instantMs, i) => ({ instant: new Date(instantMs).toISOString(), pillarAfter: core.luck.sequence[i + 1].name, confirmed: true, source: 'STEP01_DAYUN_EXACT_S2_FACADE' }));
  const input = { chart: analysis.chart, asOf: normalized.asOf.original, activeDayun: timing.dayun, activeYearPillar: timing.year, jieBoundaries: result.jieBoundaries, dayunTransitions: result.dayunTransitions };
  for (const [key, months, builder] of [['sixMonth', 6, buildSixMonthTimingWindows], ['twelveMonth', 12, buildTwelveMonthTimingWindows]]) {
    if (endMs(months) > core.luck.boundariesUTC.at(-1)) { result.windowLimitations[key] = 'POST_SUPPORTED_DAYUN_RANGE'; continue; }
    result[key] = builder(input);
  }
  return result;
}
