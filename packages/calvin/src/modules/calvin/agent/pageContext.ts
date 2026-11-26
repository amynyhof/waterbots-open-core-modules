import type { FiledFnrbRefusal, FnrbRefusal, ScenarioResult, TransitionWaterfall } from "../engine";
import type { CalcState, ProjectFact } from "../screen/state";
import type { MonitoringValue } from "../screen/monitoring";
import { hasProjectRecord, type Place } from "@waterbots/core/places";
import { FACT_LABEL, answerForAgent, type Answer } from "@waterbots/core/projectKinds";
import type { EntryCheck } from "@waterbots/core/record";

/** How a refused count is named to Calvin. Codes from core's fact check; he says it in his own words. */
const REFUSED_FACT: Record<Extract<EntryCheck, { ok: false }>["fact"], string> = {
  "population.served": "people served",
  "population.householdSize": "people per household",
  lpcd: "litres per person a day",
  withoutProjectM3PerYear: "water the supply gave before the project",
};

/**
 * WHAT CALVIN CAN SEE OF THE SCREEN — the same figures the user is looking at, so he answers
 * about the screen rather than about the record (moved here from the state hook with the cut,
 * seam S9; plan §8.4).
 *
 * The host reads it at send-time and puts it in the system prompt. Figures come from the engine's
 * results, never recomputed here — and the closing line tells the agent to call the calculator
 * tool rather than estimate, which is what keeps his answers grounded in the deterministic engine.
 */
export interface PageContextInput {
  projectName: string;
  state: CalcState;
  /** Project facts nobody has provided: the screen asks for them and shows no figures. */
  missingFacts?: ProjectFact[];
  /** Set when the pump runs on diesel or grid power and its emissions are not entered: no figures. */
  activityAsk?: { power: "diesel" | "grid" } | null;
  /** Ex-post monitoring values not entered yet: the screen asks for them and shows no figures (ruling 2026-11-21). */
  missingMonitoring?: MonitoringValue[];
  fnrbRefusal: FnrbRefusal | null;
  /** Set when a transitioning project's filed V1.0 fNRB is not on the record: the screen asks for it. */
  filedFnrbRefusal?: FiledFnrbRefusal | null;
  /** False for a new project: the screen shows V2.0 only (ruling 2026-09-21). */
  transition?: boolean;
  result: ScenarioResult | null;
  legacyResult: ScenarioResult | null;
  paaResult: ScenarioResult | null;
  waterfall: TransitionWaterfall | null;
  /**
   * WHERE CALVIN IS WORKING (J2; agent rule 21), as the host names it. Left out, a site with a project record, as
   * before. In the Agent Commons and at MCP there is no record: the person gives each fact.
   */
  place?: Place;
  /** Numbers the screen holds that are outside their range, each with its message: no figures (ruled 2026-11-23). */
  outOfRange?: string[];
  /** The project's technology label, when it is not covered yet (ruled 2026-11-23). */
  notCoveredYet?: string;
  /** What the one table says for the project (2026-11-25). Left out for a project that already exists. */
  answer?: Answer;
  /** A project credited under V1.0: what the one table says under the 2021 version. Each version's figure stands on its own. */
  answerV1?: Answer;
  /** Counts on the record that the fact check refuses, such as people served below zero (W1). */
  recordProblems?: Array<Extract<EntryCheck, { ok: false }>>;
}

export function calculatorPageContext({
  projectName,
  state,
  missingFacts,
  activityAsk = null,
  missingMonitoring = [],
  fnrbRefusal,
  filedFnrbRefusal = null,
  transition = true,
  result,
  legacyResult,
  paaResult,
  waterfall,
  place,
  outOfRange = [],
  notCoveredYet,
  answer,
  answerV1,
  recordProblems = [],
}: PageContextInput): string {
  const withRecord = place === undefined || hasProjectRecord(place);
  // HELD FOR NOW, NOT SET UP YET OR FALLING SHORT IS SAID, NOT ASKED FOR AGAIN (2026-11-25).
  if (answer !== undefined && answer.says !== "counted" && answer.says !== "ask" && missingFacts?.some((f) => f.key === "technology")) {
    return `The user is on the GS Safe Water calculator for project "${projectName}". ${answerForAgent(answer)} There are NO figures on this screen, and neither tool counts it.`;
  }
  // A PROJECT THAT ALREADY EXISTS, with a technology that is not covered yet: said, not asked for again.
  if (notCoveredYet !== undefined && missingFacts?.some((f) => f.key === "technology")) {
    return (
      `The user is on the GS Safe Water calculator for project "${projectName}". Its technology is "${notCoveredYet}", which is not covered yet. ` +
      "There are NO figures on this screen, and neither tool counts it."
    );
  }
  // A MISSING PROJECT FACT IS ASKED FOR, NEVER ASSUMED. Calvin is told which
  // ones, so he can ask the person for each — and told not to fill any of them in himself.
  if (missingFacts && missingFacts.length > 0) {
    // A COUNT THE RECORD HOLDS BUT THE FACT CHECK REFUSES (W1) is named as wrong, not as missing.
    const refused = recordProblems.map((p) => `the project record's ${REFUSED_FACT[p.fact]} can't be used: ${p.problem}`);
    return (
      `The user is on the GS Safe Water calculator for project "${projectName}", and it is asking for project facts rather than showing a result. ` +
      `Missing project facts: ${missingFacts.map((f) => (f.key === "technology" && answer?.says === "ask" ? FACT_LABEL[answer.fact] : f.label)).join("; ")}. There are NO figures on this screen. ` +
      (answer?.says === "ask" && missingFacts.some((f) => f.key === "technology") ? `${answerForAgent(answer)} ` : "") +
      (refused.length > 0 ? `Of these, ${refused.join("; ")}. It is put right where the record is kept. ` : "") +
      (withRecord
        ? "Once the facts are on the project record, the calculator runs."
        : "There is no project record here: the person gives each fact, and then the calculator runs.")
    );
  }
  if (outOfRange.length > 0) {
    return (
      `The user is on the GS Safe Water calculator for project "${projectName}", and it holds a number outside its range, so it shows no result. ` +
      `${outOfRange.join(" ")} There are NO figures on this screen until it is put right.`
    );
  }
  if (activityAsk) {
    return (
      `The user is on the GS Safe Water calculator for project "${projectName}", and it is asking for the pump's activity emissions rather than showing a result. ` +
      `The project record says the pump runs on ${activityAsk.power === "diesel" ? "diesel" : "grid power"}, so running it gives off greenhouse gas. There are NO figures on this screen. ` +
      "The screen asks for the pump's emissions for a year, in tCO2e."
    );
  }
  if (missingMonitoring.length > 0) {
    return (
      `The user is on the GS Safe Water calculator for project "${projectName}", in an ex-post run, and it is asking for monitoring values rather than showing a result. ` +
      `Not entered yet: ${missingMonitoring.map((m) => `${m.label} (from ${m.record}, ${m.sdws})`).join("; ")}. There are NO figures on this screen. ` +
      "Each value comes from the project's monitoring records. The screen offers no starting value or default in its place."
    );
  }
  // THE AGENT IS TOLD THERE IS NOTHING ON THE SCREEN, AND TOLD NOT TO FILL THE GAP. A refusal
  // the seat shows honestly and the agent then paves over with a plausible number is the same
  // fabrication, one surface along.
  if (fnrbRefusal) {
    return (
      `The user is on the GS Safe Water calculator for project "${projectName}", and it is showing a refusal rather than a result. ` +
      `${fnrbRefusal.message} (${fnrbRefusal.cite}.) ` +
      "There are NO figures on this screen. The tools publish no regional or global value for this country. The project's own filed fNRB, entered with its source, is what unblocks the calculation."
    );
  }
  // A TRANSITION WAITING ON THE FILED V1.0 fNRB shows the ask and no figures, so Calvin is given none either.
  // (Before the V2.0-only view, this case fell through to the lines below and read a V1.0 result that did not exist.)
  if (transition && filedFnrbRefusal) {
    return (
      `The user is on the GS Safe Water calculator for project "${projectName}", a project credited under V1.0, and the transition screen is asking for its filed V1.0 fNRB rather than showing a result. ` +
      `${filedFnrbRefusal.message} (Where to find it: ${filedFnrbRefusal.cite}.) ` +
      "There are NO figures on this screen. Only the project's own filing unblocks the comparison."
    );
  }
  const pr = paaResult!;
  const r = result!;
  // A NEW PROJECT (ruling 2026-09-21): the screen shows V2.0 only. There is no V1.0 figure and no transition to report.
  const figures = transition
    ? (() => {
        const lr = legacyResult!;
        const w = waterfall!;
        return (
          `Current view: methodology ${state.version === "paa" ? "PAA v2.0" : "legacy SDWS V1.0"}, Method ${state.method}, basis ${state.mode}. ` +
          `Live calculator results (from the deterministic engine): legacy ER ${lr.result.ER.toFixed(0)} tCO₂e, ` +
          `PAA ER ${pr.result.ER.toFixed(0)} tCO₂e, total difference ${w.delta.toFixed(0)} tCO₂e` +
          (w.fnrbRuleUpdate.impact != null
            ? ` (of which ${w.fnrbRuleUpdate.label} ${w.fnrbRuleUpdate.impact.toFixed(0)} tCO₂e, methodology transition ${w.transitionDelta.toFixed(0)} tCO₂e). `
            : ` (all of it the methodology transition; no filed V1.0 fNRB on the record, so the fNRB rule update is not shown). `)
        );
      })()
    : answerV1 !== undefined && answerV1.says !== "counted"
      ? `Current view: PAA v2.0 only, Method ${state.method}, basis ${state.mode}. The project was credited under V1.0, and each version's figure stands on its own conditions. The V2.0 figure shows. The V1.0 figure and the transition do not, yet: ${answerForAgent(answerV1)} ` +
        `Live calculator result (from the deterministic engine): PAA ER ${pr.result.ER.toFixed(0)} tCO₂e. `
      : `Current view: PAA v2.0 only, Method ${state.method}, basis ${state.mode}. This is a new project, not credited under V1.0, so the screen shows no V1.0 figure and no transition; do not offer either. ` +
        `Live calculator result (from the deterministic engine): PAA ER ${pr.result.ER.toFixed(0)} tCO₂e. `;
  return (
    `The user is on the GS Safe Water calculator for project "${projectName}". ` +
    figures +
    (r.fnrbMultiNational
      ? `fNRB has no national default for this country: A6.4-AMT-009 Table 2's multi-national value for ${r.fnrbMultiNational.region} is in force, and it carries a condition — ${r.fnrbMultiNational.condition} `
      : "") +
    `Key inputs: ${state.litresPerPersonPerDay} L/person/day, ${state.operationalDays} operational days, fNRB ${r.fNRB}. ` +
    `If the user asks what changes when an input differs from these, call the calculator tool to recompute.`
  );
}
