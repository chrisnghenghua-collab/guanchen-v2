import { assembleCanonicalInterpretationReadModel, canonicalizeSingleQuestion, STEP04_A1_CANONICAL_ASSEMBLY_VERSION } from '../../src/step04A1CanonicalInterpretationAssembly.mjs';
import { buildStep04A2PublicProductPayload, buildStep04A2PublicEnvelope, serializeSingleQuestion, serializeStep04A2PublicProductPayload } from '../../src/step04A2PublicSerializationBoundary.mjs';
import { buildStep04A3PublicProductPayload } from '../../src/step04A3AvailabilityStateSemantics.mjs';
import { createStep05PublicResultAdapter, validateStep05PublicPayload } from '../../src/step05A1WebRuntimePublicContractAdapterFoundation.mjs';
import { FROZEN_PRODUCT_RECIPE_CATALOG, PRODUCT_DOMAIN_ORDER, STEP04_A0_PRODUCT_SURFACE_CONTRACT_VERSION, CHART_SURFACE_TAXONOMY, TIMING_SURFACE_TAXONOMY } from '../../src/step04A0ProductSurfaceContractAuthority.mjs';
import { assertQuestionAdmissionPlan } from './question-admission.mjs';

const forbidden = /^(?:admissionPlan|admissionReason|limitations|rawEvidence|evidence|evidenceStack|trace|resolverTrace|resolverInternals|recipeInputs|recipeInternal|calibrationData|sourceEngine|sourceEngineSha256|sourceAuthorityStatus|finalGateArtifact|hashManifest|policy|debug|score|internalScore|confidence|confidencePercent|rank|ranking|topN|strengthRaw|timezoneInternals|historicalPackage)$/i;
export function assertPublicResultFirewall(payload) {
  const validation = validateStep05PublicPayload(payload);
  if (!validation.valid) throw new Error('PUBLIC_SCHEMA_VALIDATION_FAILED');
  const questions = PRODUCT_DOMAIN_ORDER.flatMap(domain => payload.domains[domain].questions);
  if (JSON.stringify(questions.map(row => row.questionId)) !== JSON.stringify(FROZEN_PRODUCT_RECIPE_CATALOG.map(row => row.questionId))) throw new Error('PUBLIC_QUESTION_IDENTITY_FAILED');
  function visit(value, location = '') {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${location}.${key}`;
      // Frozen current-attention renderers explicitly emit null markers to deny
      // rank/score/confidence. Preserve those exact markers, never numeric values.
      const frozenNullMarker = child === null && /^\.domains\.(?:RELATIONSHIP|WELLBEING)\.questions\.3\.answer\.currentFocus\.\d+\.(?:rank|score|confidencePercent)$/.test(childPath);
      if (forbidden.test(key) && !frozenNullMarker) throw new Error('PUBLIC_INTERNAL_LEAKAGE');
      visit(child, childPath);
    }
  }
  visit(payload);
  if (/(?:UNAVAILABLE_MISSING_REALITY_CONTEXT|UNAVAILABLE_MISSING_REQUIRED_INPUT|UNSUPPORTED_TIMING|[A-Z]:[\\/]|src\/core\/bazi|node_modules|guancheng-bazi-core-prototype|STEP01_EXACT_JIE_RECOVERED|moment-timezone|astronomy-engine)/i.test(JSON.stringify(payload))) throw new Error('PUBLIC_INTERNAL_LEAKAGE');
  return true;
}
export function assembleCompletePublicResult({ chartSurface, timingSurface, recipeOutputs, availabilityPlan }) {
  // Legacy full-batch path remains available for complete recipe output callers.
  const missing = FROZEN_PRODUCT_RECIPE_CATALOG.filter(row => !Object.hasOwn(recipeOutputs, row.questionId));
  if (missing.length) { const error = new Error('Product composition is not ready'); error.code = 'PRODUCT_COMPOSITION_NOT_READY'; throw error; }
  const model = assembleCanonicalInterpretationReadModel({ chartSurface, timingSurface, recipeOutputs });
  const base = buildStep04A2PublicProductPayload(model);
  return finalizePublicResult(base, availabilityPlan);
}

/** Server-only admission path. Never manufactures an A1 model or recipe output. */
export function assembleAvailabilityAwarePublicResult({ chartSurface, timingSurface, recipeOutputs, admissionPlan, availabilityPlan }) {
  assertQuestionAdmissionPlan(admissionPlan);
  const admitted = FROZEN_PRODUCT_RECIPE_CATALOG.filter(row => admissionPlan[row.questionId] === 'ADMITTED').map(row => row.questionId);
  if (!recipeOutputs || JSON.stringify(Object.keys(recipeOutputs).sort()) !== JSON.stringify([...admitted].sort())) throw new Error('ADMISSION_RECIPE_OUTPUT_MISMATCH');
  for (const [surface, slots] of [[chartSurface, CHART_SURFACE_TAXONOMY.canonicalSlots], [timingSurface, TIMING_SURFACE_TAXONOMY.canonicalSlots]]) {
    if (!surface || Array.isArray(surface) || typeof surface !== 'object' || Object.keys(surface).some(key => !slots.includes(key))) throw new Error('UNAUTHORIZED_PUBLIC_CARRIER');
  }
  const questions = FROZEN_PRODUCT_RECIPE_CATALOG.map(row => {
    if (admissionPlan[row.questionId] === 'ADMITTED') return serializeSingleQuestion(canonicalizeSingleQuestion(row, recipeOutputs[row.questionId]));
    return { questionId: row.questionId, domain: row.domain, timingDependency: row.timingDependency, availability: 'UNAVAILABLE', state: null, answer: null, provenance: { sourceRecipeVersion: null } };
  });
  const plan = Object.fromEntries(questions.map(q => [q.questionId, { availability: q.availability }]));
  if (JSON.stringify(availabilityPlan) !== JSON.stringify(plan)) throw new Error('ADMISSION_AVAILABILITY_MISMATCH');
  const domains = Object.fromEntries(PRODUCT_DOMAIN_ORDER.map(domain => {
    const selected = questions.filter(q => q.domain === domain);
    return [domain, { domain, questionCount: selected.length, questions: selected }];
  }));
  // Shared A2 envelope projection only. Existing A3 computes final aggregate
  // availability and applies all transition semantics before STEP05 validation.
  const base = buildStep04A2PublicEnvelope({
    contract: { version: STEP04_A1_CANONICAL_ASSEMBLY_VERSION, authority: STEP04_A0_PRODUCT_SURFACE_CONTRACT_VERSION, recipeCount: FROZEN_PRODUCT_RECIPE_CATALOG.length },
    chart: chartSurface, timing: timingSurface, availability: { overall: 'UNAVAILABLE' },
  }, domains, Object.fromEntries(questions.map(q => [q.questionId, q.availability])));
  return finalizePublicResult(base, plan);
}

function finalizePublicResult(base, availabilityPlan) {
  const transitioned = buildStep04A3PublicProductPayload(base, availabilityPlan);
  const serialized = serializeStep04A2PublicProductPayload(transitioned);
  const result = JSON.parse(serialized);
  assertPublicResultFirewall(result);
  return createStep05PublicResultAdapter(result).getPayload();
}
