// Calvin's notes on values (J5, one calculator screen; rulings 2026-11-23).
//
// The export on the Paid site, the Free site and the Agent Commons carries Calvin's notes: one for each value that is
// still blank or assumed, saying in plain words that the credit estimate would likely change once it is known. At MCP
// there is no export: his tools return the facts, and the visitor's own AI says them. Each note is worked out from
// the facts of the run (which values are blank, which are assumed), never invented, and it states no new number
// (agent rule 7). Core gives only the fact; the words here are Calvin's.

import type { AgentNoteFact, NoteLine, NoteStanding } from "@waterbots/core/noteFacts";
import { computeScenario, type ScenarioInput, type ScenarioResult } from "../engine";
import type { CalcState } from "../screen/state";
import { sliderLabel, sliderSpecs, showSliders } from "../screen/exAnte";

/** The plain name of each value, as a note says it. A value the sliders show keeps the slider's own label. */
const LABELS = {
  testsPass: "Share of water tests that pass",
  usage: "Share of homes that really use the device",
  stoveMix: "The mix of stoves people used before",
  fuelMix: "The mix of fuels people used before",
  fossilStove: "How well the fossil fuel stove turns fuel into heat",
  deviceCapacity: "Water a device can treat in an hour",
  devicesPerPremises: "Devices per household",
  production: "Water the system will produce in a year",
  metered: "Metered water for the year",
  cBaseline: "Share of people who already had safe water",
  xCleanboil: "Share of people who still boil the safe water",
  pump: "The yearly total of pump and fuel emissions",
  embodied: "Emissions from making the new devices",
} as const;

/**
 * Values that can only limit the credits: the volume is the smaller of two figures, or the pump's emissions are taken
 * off. Knowing one may leave the estimate as it is, so its note says "may", not "will likely".
 */
const MAY_CHANGE: ReadonlySet<string> = new Set(["deviceCapacity", "devicesPerPremises", "production", "pump"]);

const fact = (key: string, label: string, standing: NoteStanding): AgentNoteFact => ({ key, label, standing });

/** What the facts need beside the inputs: whether the sliders show, and the run's own result. */
export interface CalvinNoteView {
  /** Whether the sliders show. Left out: they show before the project runs, as on the Free site. */
  sliders?: boolean;
  /** The run's result, for the stove and fuel mix it used. */
  result?: Pick<ScenarioResult, "baselineMix"> | null;
}

/** The values of this run that are still blank or assumed, as the screen shows them. */
export function calvinNoteFacts(state: CalcState, view: CalvinNoteView = {}): AgentNoteFact[] {
  const sliders = view.sliders ?? showSliders(true, state);
  const exPost = state.mode === "ex-post";
  const m2 = state.method === 2;
  // With typed boxes the litres are a cited default, so only the sliders' litres are assumed. After the project runs a
  // monitoring value nobody entered is a blank box, never an assumed one.
  const facts = sliderSpecs(state)
    .filter((s) => (sliders || s.key !== "litres") && sliderLabel(state, s.key) === "assumed")
    .map((s) => fact(`slider:${s.key}`, s.label, exPost ? "blank" : "assumed"));
  facts.push(...mixFacts(view.result?.baselineMix));
  const fossilShare = state.stoveSharesEntered?.fossil ?? view.result?.baselineMix.shares?.stove?.fossil ?? 0;
  if (fossilShare > 0 && state.fossilStoveEta == null) facts.push(fact("fossilStove", LABELS.fossilStove, "blank"));
  if (m2) facts.push(...deviceFacts(state));
  // Planned or metered water is a community system's value; the engine does not use it for a household device.
  else if (state.meteredVolumeL == null) facts.push(fact("production", exPost ? LABELS.metered : LABELS.production, "blank"));
  // C_b: V2.0 sets no default for it; the screens use 0% until a baseline survey sets it.
  if (state.cBaseline === 0) facts.push(fact("cBaseline", LABELS.cBaseline, "assumed"));
  if (!state.xCleanboilEntered) facts.push(fact("xCleanboil", LABELS.xCleanboil, exPost ? "blank" : "assumed"));
  const burnsNothing = state.pumpPower === "hand" || state.pumpPower === "gravity" || state.pumpPower === "solar";
  if (state.activityEmissions == null && !burnsNothing) facts.push(fact("pump", LABELS.pump, "assumed"));
  // Embodied emissions: the screens have no box for them yet, so a V2.0 run always leaves them blank.
  if (state.version === "paa") facts.push(fact("embodied", LABELS.embodied, "blank"));
  return facts;
}

/** A half of the stove and fuel mix that came from the screening preset is assumed: no source stands behind it. */
function mixFacts(mix: ScenarioResult["baselineMix"] | undefined): AgentNoteFact[] {
  const facts: AgentNoteFact[] = [];
  if (mix?.stove === "preset") facts.push(fact("stoveMix", LABELS.stoveMix, "assumed"));
  if (mix?.fuel === "preset") facts.push(fact("fuelMix", LABELS.fuelMix, "assumed"));
  return facts;
}

/** Household devices: the flow rate, and the count per household, which matters (and is asked for) only with one. */
function deviceFacts(v: { deviceCapacityLPerHour?: number; devicesPerPremises?: number }): AgentNoteFact[] {
  if (v.deviceCapacityLPerHour == null || v.deviceCapacityLPerHour <= 0) return [fact("deviceCapacity", LABELS.deviceCapacity, "blank")];
  return v.devicesPerPremises == null ? [fact("devicesPerPremises", LABELS.devicesPerPremises, "assumed")] : [];
}

/**
 * The values a tool call left blank or assumed (MCP, and every other place his tools run). Facts only: his words are
 * for the export. `mix` is the stove and fuel mix the run used.
 */
export function calvinToolFacts(input: ScenarioInput, mix?: ScenarioResult["baselineMix"]): AgentNoteFact[] {
  const m2 = input.method === 2;
  const facts = mixFacts(mix);
  if (input.M_qy === undefined) facts.push(fact("testsPass", LABELS.testsPass, "assumed"));
  if (m2 && input.usageRate === undefined) facts.push(fact("usage", LABELS.usage, "assumed"));
  if (m2) facts.push(...deviceFacts(input));
  else if (input.meteredVolumeL == null) facts.push(fact("production", input.mode === "ex-post" ? LABELS.metered : LABELS.production, "blank"));
  if (input.C_b === undefined) facts.push(fact("cBaseline", LABELS.cBaseline, "assumed"));
  if (input.X_cleanboil === undefined) facts.push(fact("xCleanboil", LABELS.xCleanboil, "assumed"));
  if (input.PE === undefined) facts.push(fact("pump", LABELS.pump, "assumed"));
  if (input.version === "paa" && input.embodied === undefined) facts.push(fact("embodied", LABELS.embodied, "blank"));
  return facts;
}

/** The facts of a transition run, which always works out both versions. The mix is the one its V2.0 side uses. */
export function calvinTransitionFacts(input: ScenarioInput): AgentNoteFact[] {
  const v2: ScenarioInput = { ...input, version: "paa" };
  return calvinToolFacts(v2, computeScenario(v2).baselineMix);
}

/** Calvin's words for one fact. No number. */
export function calvinNoteText(f: AgentNoteFact): string {
  const change = MAY_CHANGE.has(f.key) ? "may change" : "will likely change";
  return f.standing === "blank"
    ? `${f.label} was left blank. Once it is known, the credit estimate ${change}.`
    : `${f.label} is assumed for now. Once the project's own figure is known, the credit estimate ${change}.`;
}

/** Calvin's notes for the export's "Notes on values". */
export function calvinAgentNoteLines(state: CalcState, view: CalvinNoteView = {}): NoteLine[] {
  return calvinNoteFacts(state, view).map((f) => ({ key: f.key, label: f.label, amount: "", text: calvinNoteText(f), by: "agent" }));
}
