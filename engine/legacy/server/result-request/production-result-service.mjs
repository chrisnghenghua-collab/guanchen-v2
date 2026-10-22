import { computeStep01 } from '../../../packages/step01-production-core/facade.mjs';
import { validateProductionRequest } from './request-validation.mjs';
import { composeChartAnalysis } from '../../../server/result-request/chart-analysis.mjs';
import { composeTimingRoot } from '../../../server/result-request/timing-root.mjs';
import { composeDomains, emptyComposition } from './domain-composition.mjs';
import { assembleAvailabilityAwarePublicResult } from './public-boundary.mjs';

/** Internal diagnostic/composition stage. Never serialize this object to a client. */
export function composeProductionInputs(request) {
  const normalized = validateProductionRequest(request);
  const timeKnowledge = { mode: normalized.request.birth.timeKnowledge };
  if (timeKnowledge.mode !== 'KNOWN') return { normalized, core: null, analysis: null, timingRoot: null, chartSurface: { timeKnowledge }, timingSurface: {}, ...emptyComposition() };
  const core = computeStep01({
    birth: { calendar: { type: 'SOLAR', date: normalized.date }, time: normalized.time, gender: normalized.request.birth.gender, timeMode: 'TRUE_SOLAR_TIME' },
    location: normalized.location.id, asOf: { instantUTC: normalized.asOf.instantUTC },
  });
  if (core.status !== 'OK') {
    const error = new Error('STEP01 cannot produce a supported result');
    error.code = core.status === 'FAIL' ? 'STEP01_REGRESSION' : 'STEP01_INPUT_UNSUPPORTED';
    throw error;
  }
  const analysis = composeChartAnalysis(core);
  const timingRoot = composeTimingRoot(core, normalized, analysis);
  const domains = composeDomains(analysis, timingRoot, normalized.request.birth.gender);
  // Only curated categorical chart fields; raw strength/evidence stay internal.
  const chartSurface = { pillars: structuredClone(core.pillars), dayMaster: structuredClone(analysis.strength.dayMaster), strengthBand: analysis.strength.strengthBand, structureKey: analysis.resolution.baseStructure?.key ?? null, patternStage: analysis.resolution.stage ?? null, timeKnowledge };
  const timingSurface = { activeDayun: timingRoot.timing.dayun ?? null, annual: timingRoot.timing.year, monthlyWindows: {
    ...(timingRoot.sixMonth ? { CAREER_NEXT_6M: timingRoot.sixMonth.windows.map(row => row.id) } : {}),
    ...(timingRoot.twelveMonth ? { WEALTH_NEXT_12M: timingRoot.twelveMonth.windows.map(row => row.id) } : {}),
  } };
  return { normalized, core, analysis, timingRoot, chartSurface, timingSurface, ...domains };
}

/** Frozen request entry; reality context is deliberately absent from V1. */
export function requestProductionResult(request) {
  const inputs = composeProductionInputs(request);
  return assembleAvailabilityAwarePublicResult(inputs);
}
