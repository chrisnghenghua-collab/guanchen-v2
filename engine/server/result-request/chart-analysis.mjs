import { assessStrength } from '../../src/strengthEngine.mjs';
import { tenGod, assessPattern } from '../../src/patternEngine.mjs';
import { resolvePattern } from '../../src/patternResolutionEngine.mjs';
import { evaluateSpecialStructure } from '../../src/specialStructureEngine.mjs';
import { resolveRelationTransformations } from '../../src/relationTransformationEngine.mjs';

export function composeChartAnalysis(core) {
  if (core.status !== 'OK') throw new Error('STEP01_OK_REQUIRED');
  const chart = structuredClone(core.pillars);
  const strength = assessStrength(chart);
  const special = evaluateSpecialStructure(chart, strength);
  const pattern = assessPattern(chart, strength, special);
  const resolution = resolvePattern(chart);
  const relations = resolveRelationTransformations(chart, strength.relations);
  const visibleTenGods = Object.fromEntries(Object.entries(chart).map(([position, pillar]) => [position, tenGod(chart.day[0], pillar[0])]));
  return { chart, strength, special, pattern, resolution, relations, visibleTenGods };
}
