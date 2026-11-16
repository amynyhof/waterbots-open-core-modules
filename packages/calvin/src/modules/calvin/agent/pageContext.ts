import type { FiledFnrbRefusal, FnrbRefusal, ScenarioResult, TransitionWaterfall } from "../engine";
import type { CalcState, ProjectFact } from "../screen/state";

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
  fnrbRefusal: FnrbRefusal | null;
  /** Set when a transitioning project's filed V1.0 fNRB is not on the record: the screen asks for it. */
  filedFnrbRefusal?: FiledFnrbRefusal | null;
  /** False for a new project: the screen shows V2.0 only (ruling 2026-09-21). */
  transition?: boolean;
  result: ScenarioResult | null;
  legacyResult: ScenarioResult | null;
  paaResult: ScenarioResult | null;
  waterfall: TransitionWaterfall | null;
}

export function calculatorPageContext({
  projectName,
  state,
  missingFacts,
  fnrbRefusal,
  filedFnrbRefusal = null,
  transition = true,
  result,
  legacyResult,
  paaResult,
  waterfall,
}: PageContextInput): string {
  // A MISSING PROJECT FACT IS ASKED FOR, NEVER ASSUMED (CALCULATOR_SPEC §0.2). Calvin is told which
  // ones, so he can ask the person for each — and told not to fill any of them in himself.
  if (missingFacts && missingFacts.length > 0) {
    return (
      `The user is on the GS Safe Water calculator for project "${projectName}", and it is asking for project facts rather than showing a result. ` +
      `Missing project facts: ${missingFacts.map((f) => f.label).join("; ")}. There are NO figures on this screen. ` +
      "Ask the user for each missing fact. Do not estimate a figure, and do not assume a technology, country, population or counting unit. " +
      "Once the facts are on the project record, the calculator runs."
    );
  }
  // THE AGENT IS TOLD THERE IS NOTHING ON THE SCREEN, AND TOLD NOT TO FILL THE GAP. A refusal
  // the seat shows honestly and the agent then paves over with a plausible number is the same
  // fabrication, one surface along.
  if (fnrbRefusal) {
    return (
      `The user is on the GS Safe Water calculator for project "${projectName}", and it is showing a refusal rather than a result. ` +
      `${fnrbRefusal.message} (${fnrbRefusal.cite}.) ` +
      "There are NO figures on this screen. Do not estimate one, and do not offer a regional or global stand-in — " +
      "the tools publish neither for this country. The project's own filed fNRB, entered with its source, is what unblocks the calculation."
    );
  }
  // A TRANSITION WAITING ON THE FILED V1.0 fNRB shows the ask and no figures, so Calvin is given none either.
  // (Before the V2.0-only view, this case fell through to the lines below and read a V1.0 result that did not exist.)
  if (transition && filedFnrbRefusal) {
    return (
      `The user is on the GS Safe Water calculator for project "${projectName}", a project credited under V1.0, and the transition screen is asking for its filed V1.0 fNRB rather than showing a result. ` +
      `${filedFnrbRefusal.message} (Where to find it: ${filedFnrbRefusal.cite}.) ` +
      "There are NO figures on this screen. Do not estimate the filed value or a V1.0 figure; only the project's own filing unblocks the comparison."
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
    : `Current view: PAA v2.0 only, Method ${state.method}, basis ${state.mode}. This is a new project, not credited under V1.0, so the screen shows no V1.0 figure and no transition; do not offer either. ` +
      `Live calculator result (from the deterministic engine): PAA ER ${pr.result.ER.toFixed(0)} tCO₂e. `;
  return (
    `The user is on the GS Safe Water calculator for project "${projectName}". ` +
    figures +
    (r.fnrbMultiNational
      ? `fNRB has no national default for this country: A6.4-AMT-009 Table 2's multi-national value for ${r.fnrbMultiNational.region} is in force, and it carries a condition — ${r.fnrbMultiNational.condition} `
      : "") +
    `Key inputs: ${state.litresPerPersonPerDay} L/person/day, ${state.operationalDays} operational days, fNRB ${r.fNRB}. ` +
    `If the user asks what changes when an input differs from these, call the calculator tool to recompute — do not estimate.`
  );
}
