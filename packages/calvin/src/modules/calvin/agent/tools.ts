/**
 * gs4gg-carbon agent tools — the FIRST CONSUMER of the global calculatorTool wrapper (M11 Slice A).
 * One tool this slice: `computeScenario` (legacy + PAA via its `version` arg). The transition
 * waterfall tool is added when Vector needs it (rung 3), per the approved scope.
 *
 * The tool's `execute` is a pure call into `calculators/gs4gg-carbon` — the model NEVER computes an
 * ER; it calls this and explains the result. The scenario's own `provenance` trail becomes the tool's
 * `sources`, so a host's evidence trail records exactly which defaults / vintages / citations produced the number.
 */
import type { AgentTool } from "../../core/agent";
import { makeCalculatorTool } from "../../core/calculatorTool";
import {
  DEVICES_PER_PREMISES_RULE,
  GS4GG_CALCULATOR_VERSION,
  PRESETS,
  computeScenario,
  computeTransitionWaterfall,
  validDevicesPerPremises,
  type ScenarioInput,
  type ScenarioResult,
} from "../engine";

type TransitionWaterfall = ReturnType<typeof computeTransitionWaterfall>;

/**
 * The gs4gg-carbon calculator version — owned by the engine (`calculators/gs4gg-carbon/version.ts`)
 * and re-exported here; recorded on every tool call in the evidence trail.
 */
export { GS4GG_CALCULATOR_VERSION };

/** Minimal JSON Schema for the model — the core inputs plus the common overrides. */
const SCENARIO_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["version", "method", "countryIso", "populationMode", "populationCount", "litresPerPersonPerDay", "operationalDays"],
  properties: {
    version: { type: "string", enum: ["legacy", "paa"], description: "Methodology: legacy = SDWS V1.0; paa = PAA v2.0." },
    method: { type: "number", enum: [1, 2], description: "A PROJECT FACT, from the project's technology: 1 = CWS/CWT (community supply); 2 = HWT/IWT (household treatment). Never assume it; if you do not know the technology, ask." },
    mode: { type: "string", enum: ["ex-ante", "ex-post"], description: "Defaults to ex-ante." },
    countryIso: { type: "string", description: "A PROJECT FACT: the project's country, as an ISO code (alpha-2 or alpha-3); drives the fNRB/DAF lookups. Never assume it; if you do not know it, ask." },
    populationMode: { type: "string", enum: ["people", "households"], description: "A PROJECT FACT: whether populationCount counts people or households. Never assume it; if you do not know, ask." },
    populationCount: { type: "number", description: "A PROJECT FACT: people served, or households served (per populationMode). Never assume it; if you do not know it, ask." },
    litresPerPersonPerDay: { type: "number", description: "Design or measured L/person/day (the engine caps at 5.5)." },
    operationalDays: { type: "number", description: "Operational days in the year." },
    meteredVolumeL: { type: ["number", "null"], description: "Metered annual volume (L), if available." },
    deviceCapacityLPerHour: { type: "number", description: "Method 2 only: a device's flow rate in litres per hour, from the manufacturer's specification. Pass it only if the person gives it." },
    devicesPerPremises: { type: "integer", minimum: 1, description: "A PROJECT FACT that matters only when a device flow rate is given: devices per household, a whole number, 1 or more. When the person gives a flow rate, ask how many devices a household has. If they do not know, leave it out: the calculator assumes 1, the lowest and safest." },
    preset: { type: "string", enum: Object.keys(PRESETS), description: "Methodology-default baseline preset id (optional). A project's own baseline is never guessed: ask for it." },
    fnrbOverride: { type: ["number", "null"], description: "PAA fNRB override (fraction 0–1)." },
    fnrbFiledV1: { type: ["number", "null"], description: "Legacy path: the project's filed V1-era fNRB (fraction 0–1)." },
    etaOverride: { type: "number", description: "Override stove efficiency η (fraction)." },
    C_b: { type: "number", description: "Baseline usage fraction C_b (0–1)." },
    DAF: { type: "number", description: "PAA downward-adjustment factor override (fraction)." },
  },
};

/** Coerce the model's raw JSON into a typed ScenarioInput, validating the required fields. */
function parseScenarioInput(raw: unknown): ScenarioInput {
  if (typeof raw !== "object" || raw === null) throw new Error("computeScenario input must be an object");
  const o = raw as Record<string, unknown>;

  const version = o.version;
  if (version !== "legacy" && version !== "paa") throw new Error('version must be "legacy" or "paa"');

  const num = (key: string): number => {
    const v = o[key];
    if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${key} must be a finite number`);
    return v;
  };
  const countryIso = o.countryIso;
  if (typeof countryIso !== "string" || countryIso.trim() === "") throw new Error("countryIso must be a non-empty string");

  // PROJECT FACTS ARE REQUIRED, NEVER DEFAULTED (CALCULATOR_SPEC §0.2): the method (from the
  // technology) and whether the count is people or households join the country and the count. A
  // missing one is refused in words that tell the model to ask, not to guess.
  if (o.method !== 1 && o.method !== 2) throw new Error("method is a project fact (1 = CWS/CWT, 2 = HWT/IWT, from the technology). Ask the person for the project's technology; do not assume it.");
  if (o.populationMode !== "people" && o.populationMode !== "households") throw new Error('populationMode is a project fact ("people" or "households"). Ask the person how people served were counted; do not assume it.');

  const input: ScenarioInput = {
    version,
    method: o.method,
    countryIso: countryIso.toUpperCase(),
    populationMode: o.populationMode,
    populationCount: num("populationCount"),
    litresPerPersonPerDay: num("litresPerPersonPerDay"),
    operationalDays: num("operationalDays"),
  };

  // Optional pass-throughs (only when present + well-typed).
  if (o.mode === "ex-ante" || o.mode === "ex-post") input.mode = o.mode;
  if (typeof o.preset === "string") {
    // The tool boundary, not the engine, names the valid ids: an unknown one (including a preset that
    // has been removed) is refused in plain words rather than crashing inside the engine.
    if (!Object.prototype.hasOwnProperty.call(PRESETS, o.preset)) {
      throw new Error(`preset "${o.preset}" is not one of the baseline presets (${Object.keys(PRESETS).join(", ")}). Omit it to use the default, or enter the project's own baseline shares.`);
    }
    input.preset = o.preset as ScenarioInput["preset"];
  }
  if (typeof o.meteredVolumeL === "number") input.meteredVolumeL = o.meteredVolumeL;
  if (typeof o.deviceCapacityLPerHour === "number" && o.deviceCapacityLPerHour > 0) input.deviceCapacityLPerHour = o.deviceCapacityLPerHour;
  if (o.devicesPerPremises !== undefined) {
    // Same rule as the engine and the screen (Amy, 2026-10-23): a whole number, 1 or more.
    if (!validDevicesPerPremises(o.devicesPerPremises)) throw new Error(DEVICES_PER_PREMISES_RULE);
    input.devicesPerPremises = o.devicesPerPremises;
  }
  if (typeof o.fnrbOverride === "number") input.fnrbOverride = o.fnrbOverride;
  if (typeof o.fnrbFiledV1 === "number") input.fnrbFiledV1 = o.fnrbFiledV1;
  if (typeof o.etaOverride === "number") input.etaOverride = o.etaOverride;
  if (typeof o.C_b === "number") input.C_b = o.C_b;
  if (typeof o.DAF === "number") input.DAF = o.DAF;

  return input;
}

/** Provenance trail → flat source strings for the evidence log. */
function extractScenarioSources(out: ScenarioResult): string[] {
  const sources = out.provenance.map((p) => p.label);
  sources.push(`fNRB vintage: ${out.fnrbVintage}`);
  return sources;
}

/** The one gs4gg-carbon tool this slice. */
export const computeScenarioTool: AgentTool = makeCalculatorTool<ScenarioInput, ScenarioResult>({
  id: "calc/gs4gg-carbon.computeScenario",
  version: GS4GG_CALCULATOR_VERSION,
  description:
    "Compute GS4GG Safe Water emission reductions (tCO2e) for a project scenario, legacy (SDWS V1.0) " +
    "or PAA v2.0. Deterministic — returns the ER plus a full provenance trail. Use this for every " +
    "ER/EF_b/Q_y number; never compute one yourself.",
  inputSchema: SCENARIO_INPUT_SCHEMA,
  compute: computeScenario,
  parseInput: parseScenarioInput,
  extractSources: extractScenarioSources,
});

/**
 * The legacy→PAA transition waterfall tool (Rung 3). Computes both versions, the fNRB rule update as
 * its own line (amended R1, 2026-09-21: the filed V1.0 value vs the current standardised value; null
 * when nothing is filed), and the ordered drivers of the methodology transition (η → discount placement
 * → volume basis → leakage → DAF) with fNRB held equal. Version in the input is ignored — it always
 * compares both. Deterministic; the model uses it to EXPLAIN the transition, never to invent the delta.
 */
export const transitionWaterfallTool: AgentTool = makeCalculatorTool<ScenarioInput, TransitionWaterfall>({
  id: "calc/gs4gg-carbon.transitionWaterfall",
  version: GS4GG_CALCULATOR_VERSION,
  description:
    "Compute the legacy → PAA v2.0 transition for a project: the two ER totals, the total delta, the fNRB " +
    "rule update as its own line (the project's filed V1.0 fNRB vs the current standardised value; null when " +
    "no filed value is on the record), and the ordered drivers of the methodology transition itself (stove " +
    "efficiency η, discount placement, volume basis, leakage, DAF) with fNRB held equal. Deterministic. " +
    "Use this to explain WHY the number changes between methodologies; never estimate the delta yourself.",
  inputSchema: SCENARIO_INPUT_SCHEMA,
  compute: computeTransitionWaterfall,
  parseInput: parseScenarioInput,
  extractSources: (out) => [
    `legacy ER ${out.legacyER.toFixed(1)} → PAA ER ${out.paaER.toFixed(1)} (total delta ${out.delta.toFixed(1)} tCO₂e)`,
    out.fnrbRuleUpdate.impact != null
      ? `${out.fnrbRuleUpdate.label}: filed ${out.fnrbRuleUpdate.filedFnrb} → current ${out.fnrbRuleUpdate.currentFnrb} (${out.fnrbRuleUpdate.impact >= 0 ? "+" : ""}${out.fnrbRuleUpdate.impact.toFixed(1)} tCO₂e; ${out.fnrbRuleUpdate.cite})`
      : `${out.fnrbRuleUpdate.label}: not shown — no filed V1.0 fNRB on the record`,
    `methodology transition (fNRB held equal): ${out.transitionStartER.toFixed(1)} → ${out.paaER.toFixed(1)} (${out.transitionDelta.toFixed(1)} tCO₂e)`,
    ...out.steps.map((s) => `driver: ${s.label} (${s.impact >= 0 ? "+" : ""}${s.impact.toFixed(1)} tCO₂e)`),
  ],
});

/** All gs4gg-carbon tools (registered globally in registry.ts). */
export const GS4GG_CARBON_TOOLS: AgentTool[] = [computeScenarioTool, transitionWaterfallTool];
