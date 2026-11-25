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
import { requireInRange } from "@waterbots/core/ranges";
import { FACT_LABEL, KIND_FACT_SCHEMA, NO_CALCULATOR_YET, SHORTFALL_WORDS, factsWithKind, readKindFacts, type CarbonVersion } from "@waterbots/core/projectKinds";
import { carbonAnswer, recordTechnology, underTodaysRules, type ProjectFacts } from "@waterbots/core/record";
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
import { fnrbTableLabel, FNRB_ORIGIN } from "../screen/citations";
import { calvinToolFacts, calvinTransitionFacts } from "./exportNotes";

type TransitionWaterfall = ReturnType<typeof computeTransitionWaterfall>;

/**
 * The gs4gg-carbon calculator version — owned by the engine (`calculators/gs4gg-carbon/version.ts`)
 * and re-exported here; recorded on every tool call in the evidence trail.
 */
export { GS4GG_CALCULATOR_VERSION };

/** The baseline presets the tool offers. The institutional one waits with institutional treatment, which is not set up yet. */
const OFFERED_PRESETS = Object.keys(PRESETS).filter((id) => id !== "institutional-wood-iwt");

/** Minimal JSON Schema for the model — the core inputs plus the common overrides. */
const SCENARIO_PROPERTIES: Record<string, unknown> = {
    version: { type: "string", enum: ["legacy", "paa"], description: "Methodology: legacy = SDWS V1.0; paa = PAA v2.0." },
    method: { type: "number", enum: [1, 2], description: "Leave it out: it follows the project's facts." },
    mode: { type: "string", enum: ["ex-ante", "ex-post"], description: "Defaults to ex-ante." },
    countryIso: { type: "string", description: "A PROJECT FACT: the project's country, as an ISO code (alpha-2 or alpha-3); drives the fNRB/DAF lookups." },
    populationMode: { type: "string", enum: ["people", "households"], description: "A PROJECT FACT: whether populationCount counts people or households." },
    populationCount: { type: "number", minimum: 1, description: "A PROJECT FACT: people served, or households served (per populationMode)." },
    litresPerPersonPerDay: { type: "number", minimum: 0, description: "Design or measured L/person/day (the engine caps at 5.5)." },
    operationalDays: { type: "number", minimum: 0, maximum: 365, description: "Operational days in the year." },
    meteredVolumeL: { type: ["number", "null"], description: "Metered annual volume (L), if available." },
    deviceCapacityLPerHour: { type: "number", description: "Method 2 only: a device's flow rate in litres per hour, from the manufacturer's specification. Pass it only if the person gives it." },
    devicesPerPremises: { type: "integer", minimum: 1, description: "A PROJECT FACT that matters only when a device flow rate is given: devices per household, a whole number, 1 or more. Left out, the calculator uses 1, the lowest." },
    preset: { type: "string", enum: OFFERED_PRESETS, description: "Methodology-default baseline preset id (optional)." },
    fnrbOverride: { type: ["number", "null"], description: "PAA fNRB override (fraction 0–1)." },
    fnrbFiledV1: { type: ["number", "null"], description: "Legacy path: the project's filed V1-era fNRB (fraction 0–1)." },
    etaOverride: { type: "number", description: "Override stove efficiency η (fraction)." },
    C_b: { type: "number", description: "Baseline usage fraction C_b (0–1)." },
    DAF: { type: "number", description: "PAA downward-adjustment factor override (fraction)." },
};

/**
 * The shape the model fills. With a project record the kind comes from the record, so the model is not asked for it. With
 * none (the Agent Commons, MCP) each fact it is worked out from is a project fact the person gives.
 */
function scenarioSchema(withRecord: boolean): Record<string, unknown> {
  const facts = Object.fromEntries(Object.entries(KIND_FACT_SCHEMA).map(([k, v]) => [k, { ...v, description: `A PROJECT FACT. ${String(v.description)}` }]));
  return {
    type: "object",
    additionalProperties: false,
    required: ["version", ...(withRecord ? [] : ["waterSource", "treatment"]), "countryIso", "populationMode", "populationCount", "litresPerPersonPerDay", "operationalDays"],
    properties: { ...SCENARIO_PROPERTIES, ...(withRecord ? {} : facts) },
  };
}

/** What the visitor's AI, or the agent, is told when no figure can be worked out. */
const NOT_COUNTED = `No figure can be worked out for this project. The visitor reads: "${NO_CALCULATOR_YET}"`;

/**
 * The method's way of counting, from the project's facts (2026-11-25). No label and no agent can change it. Throws, in words
 * that say which fact to ask for, when there is none.
 */
function codeFor(facts: ProjectFacts, versions: readonly CarbonVersion[]): "CWS" | "HWT" {
  if (!underTodaysRules(facts)) {
    const code = recordTechnology({ facts });
    if (code === "CWS" || code === "HWT") return code;
    throw new Error(NOT_COUNTED);
  }
  const a = carbonAnswer(facts, versions);
  switch (a.says) {
    case "counted":
      return a.code!;
    case "ask":
      throw new Error(
        a.fix
          ? "treatment is a project fact. The water at the source is not safe to drink, so the project needs treatment, and where the water is treated is missing."
          : `${a.fact} is a project fact (${FACT_LABEL[a.fact]}), and it is missing.`,
      );
    case "falls short":
      throw new Error(`As it stands, the project falls short. ${SHORTFALL_WORDS[a.because]}`);
    case "held for now":
      throw new Error(`Held for now. ${NOT_COUNTED}`);
    case "not set up yet":
      throw new Error(`Not set up yet. ${NOT_COUNTED}`);
    case "another kind of project":
      throw new Error(NOT_COUNTED);
  }
}

/** Coerce the model's raw JSON into a typed ScenarioInput, validating the required fields. */
function parseScenarioInput(raw: unknown, record: ProjectFacts | undefined, versionsInUse?: readonly CarbonVersion[]): ScenarioInput {
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

  // PROJECT FACTS ARE REQUIRED, NEVER DEFAULTED: the method (from the facts about the
  // source and the treatment) and whether the count is people or households join the country and the count. A
  // missing one is refused in words that tell the model to ask, not to guess.
  // THE RECORD DECIDES WHERE THERE IS ONE. With none, the facts the person gave do.
  const code = codeFor(record ?? factsWithKind(readKindFacts(o)), versionsInUse ?? [version === "legacy" ? "2021" : "2026"]);
  const method = code === "CWS" ? 1 : 2;
  if (o.method !== undefined && o.method !== method) throw new Error(`method follows the project's facts: it is ${method} here. Leave it out.`);
  if (o.populationMode !== "people" && o.populationMode !== "households") throw new Error('populationMode is a project fact ("people" or "households": how people served were counted), and it is missing.');

  const input: ScenarioInput = {
    version,
    method,
    countryIso: countryIso.toUpperCase(),
    populationMode: o.populationMode,
    populationCount: num("populationCount"),
    litresPerPersonPerDay: num("litresPerPersonPerDay"),
    operationalDays: num("operationalDays"),
  };

  // EVERY NUMBER IN ITS RANGE (ruled 2026-11-23), with the same check and the same words as the screen. A refused number
  // never reaches the engine.
  requireInRange("population.served", input.populationCount, o.populationMode === "households" ? { name: "Households served" } : {});
  requireInRange("lpcd", input.litresPerPersonPerDay);
  requireInRange("daysOfOperation", input.operationalDays, method === 2 ? { name: "Days the device is in the home" } : {});
  const optional = [["meteredVolumeL", "waterProduced"], ["deviceCapacityLPerHour", "deviceFlow"], ["fnrbOverride", "fnrb"], ["fnrbFiledV1", "fnrb"], ["etaOverride", "stoveEfficiency"], ["C_b", "alreadySafe"], ["DAF", "daf"]] as const;
  for (const [field, range] of optional) if (o[field] !== undefined && o[field] !== null) requireInRange(range, o[field]);

  // Optional pass-throughs (only when present + well-typed).
  if (o.mode === "ex-ante" || o.mode === "ex-post") input.mode = o.mode;
  if (typeof o.preset === "string") {
    // The tool boundary, not the engine, names the valid ids: an unknown one (including a preset that
    // has been removed) is refused in plain words rather than crashing inside the engine.
    if (o.preset === "institutional-wood-iwt") throw new Error(`Institutional treatment is not set up yet. ${NOT_COUNTED}`);
    if (!Object.prototype.hasOwnProperty.call(PRESETS, o.preset)) {
      throw new Error(`preset "${o.preset}" is not one of the baseline presets (${OFFERED_PRESETS.join(", ")}). Omit it to use the default, or enter the project's own baseline shares.`);
    }
    input.preset = o.preset as ScenarioInput["preset"];
  }
  if (typeof o.meteredVolumeL === "number") input.meteredVolumeL = o.meteredVolumeL;
  if (typeof o.deviceCapacityLPerHour === "number" && o.deviceCapacityLPerHour > 0) input.deviceCapacityLPerHour = o.deviceCapacityLPerHour;
  if (o.devicesPerPremises !== undefined) {
    // Same rule as the engine and the screen (ruling 2026-10-23): a whole number, 1 or more.
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
  sources.push(`fNRB set of values: ${fnrbTableLabel(out.fnrbVintage)}. ${FNRB_ORIGIN}`);
  return sources;
}

/** The gs4gg-carbon scenario tool. With a project's facts, the record decides the kind. */
const scenarioTool = (facts?: ProjectFacts): AgentTool => makeCalculatorTool<ScenarioInput, ScenarioResult>({
  id: "calc/gs4gg-carbon.computeScenario",
  version: GS4GG_CALCULATOR_VERSION,
  description:
    "Compute GS4GG Safe Water emission reductions (tCO2e) for a project scenario, legacy (SDWS V1.0) " +
    "or PAA v2.0. Deterministic — returns the ER plus a full provenance trail, and blankOrAssumed: the values this run left blank or assumed.",
  inputSchema: scenarioSchema(facts !== undefined),
  compute: computeScenario,
  parseInput: (raw) => parseScenarioInput(raw, facts),
  extractSources: extractScenarioSources,
  blankOrAssumed: (input, out) => calvinToolFacts(input, out.baselineMix),
});

/**
 * The legacy→PAA transition waterfall tool (Rung 3). Computes both versions, the fNRB rule update as
 * its own line (amended R1, 2026-09-21: the filed V1.0 value vs the current standardised value; null
 * when nothing is filed), and the ordered drivers of the methodology transition (η → discount placement
 * → volume basis → leakage → DAF) with fNRB held equal. Version in the input is ignored — it always
 * compares both. Deterministic; the model uses it to EXPLAIN the transition, never to invent the delta.
 */
const waterfallTool = (facts?: ProjectFacts): AgentTool => makeCalculatorTool<ScenarioInput, TransitionWaterfall>({
  id: "calc/gs4gg-carbon.transitionWaterfall",
  version: GS4GG_CALCULATOR_VERSION,
  description:
    "Compute the legacy → PAA v2.0 transition for a project: the two ER totals, the total delta, the fNRB " +
    "rule update as its own line (the project's filed V1.0 fNRB vs the current standardised value; null when " +
    "no filed value is on the record), and the ordered drivers of the methodology transition itself (stove " +
    "efficiency η, discount placement, volume basis, leakage, DAF) with fNRB held equal. Deterministic. " +
    "Use this to explain why the number changes between methodologies. Also returns blankOrAssumed: the values this run left blank or assumed.",
  inputSchema: scenarioSchema(facts !== undefined),
  compute: computeTransitionWaterfall,
  parseInput: (raw) => parseScenarioInput(raw, facts, ["2026", "2021"]),
  blankOrAssumed: calvinTransitionFacts,
  extractSources: (out) => [
    `legacy ER ${out.legacyER.toFixed(1)} → PAA ER ${out.paaER.toFixed(1)} (total delta ${out.delta.toFixed(1)} tCO₂e)`,
    out.fnrbRuleUpdate.impact != null
      ? `${out.fnrbRuleUpdate.label}: filed ${out.fnrbRuleUpdate.filedFnrb} → current ${out.fnrbRuleUpdate.currentFnrb} (${out.fnrbRuleUpdate.impact >= 0 ? "+" : ""}${out.fnrbRuleUpdate.impact.toFixed(1)} tCO₂e; ${out.fnrbRuleUpdate.cite})`
      : `${out.fnrbRuleUpdate.label}: not shown — no filed V1.0 fNRB on the record`,
    `methodology transition (fNRB held equal): ${out.transitionStartER.toFixed(1)} → ${out.paaER.toFixed(1)} (${out.transitionDelta.toFixed(1)} tCO₂e)`,
    ...out.steps.map((s) => `driver: ${s.label} (${s.impact >= 0 ? "+" : ""}${s.impact.toFixed(1)} tCO₂e)`),
  ],
});

/** Where there is no project record (the Agent Commons, MCP): the person gives each fact the kind is worked out from. */
export const computeScenarioTool: AgentTool = scenarioTool();
export const transitionWaterfallTool: AgentTool = waterfallTool();

/** All gs4gg-carbon tools, where there is no project record. A site registers them with its agent. */
export const GS4GG_CARBON_TOOLS: AgentTool[] = [computeScenarioTool, transitionWaterfallTool];

/**
 * The same tools for a project on a site's record (2026-11-25). The record decides the kind, never the agent. A project that
 * already exists keeps the answer it had. Make them again when the record's facts change.
 */
export function calvinToolsFor(facts: ProjectFacts): AgentTool[] {
  return [scenarioTool(facts), waterfallTool(facts)];
}
