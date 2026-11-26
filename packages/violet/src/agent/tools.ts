// Violet's calculator tool. The model never works out a water benefit: it calls this tool, and the tool calls
// the D-3 engine. The tool hands back every source the engine used, so a host's evidence trail is complete.

import { HOME_USES, type ProjectFacts } from "@waterbots/core/record";
import { FACT_LABEL, KIND_FACTS, KIND_FACT_SCHEMA, NO_CALCULATOR_YET } from "@waterbots/core/projectKinds";
import type { AgentTool } from "@waterbots/core/agent";
import { makeCalculatorTool } from "@waterbots/core/calculatorTool";
import { checkD3Input, computeD3 } from "../d3/compute.js";
import { D3_ENGINE_VERSION } from "../d3/defaults.js";
import type { D3Input, D3Result } from "../d3/types.js";
import { violetNoteFacts } from "../exportNotes.js";
import { d3Refusals } from "../ranges.js";
import { d3Stop, kindFacts, readKind, type D3Stop } from "../supply.js";

/** The facts the kind is worked out from, where there is no project record. Her method needs no others. */
const KIND_PROPERTIES: Record<string, unknown> = {
  waterSource: { ...KIND_FACT_SCHEMA.waterSource, description: `A PROJECT FACT. ${String(KIND_FACT_SCHEMA.waterSource.description)}` },
  treatment: { ...KIND_FACT_SCHEMA.treatment, description: `A PROJECT FACT. ${String(KIND_FACT_SCHEMA.treatment.description)}` },
  homeUse: {
    type: "string",
    enum: [...HOME_USES],
    description: "A PROJECT FACT, needed for a new or restored source: whether people use the water at home. The tool works out a figure only when they do.",
  },
};

const D3_PROPERTIES: Record<string, unknown> = {
    view: { type: "string", enum: ["ex-ante", "ex-post"], description: "ex-ante: before the project runs. ex-post: after it runs, with monitoring data." },
    option: {
      type: "string",
      enum: ["metered", "capacity", "beneficiaries"],
      description: "How the volume is worked out, in order of preference: meter readings (ex-post only), the system's capacity, or the people served.",
    },
    withoutProjectM3PerYear: { type: "number", minimum: 0, description: "A PROJECT FACT: water this supply gave each year before the project, in m³. 0 for a brand-new supply." },
    population: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { type: "string", enum: ["people", "households"], description: "A PROJECT FACT: whether 'served' counts people or households." },
        served: { type: "integer", minimum: 1, description: "A PROJECT FACT: how many are served." },
        householdSize: { type: "number", exclusiveMinimum: 0, description: "A PROJECT FACT, needed only when mode is households: people per household." },
      },
    },
    accessLevel: { type: "string", enum: ["full", "limited"], description: "A PROJECT FACT: full access (at home or nearby, all year) or limited access (for example a school). It picks the default litres per person." },
    meteredM3PerYear: { type: "number", minimum: 0, description: "Ex-post, option metered: the metered volume for the year, in m³." },
    flowM3PerHour: { type: "number", minimum: 0, description: "A PROJECT FACT: the system's design delivery or pumping capacity, or its expected average flow, in m³ per hour." },
    operatingHoursPerYear: { type: "number", minimum: 0, maximum: 8760, description: "Hours a year the system runs at that flow. Ex-ante: the user's planned figure. Ex-post: from operating logs." },
    litresPerPersonPerDay: {
      type: "object",
      additionalProperties: false,
      required: ["value", "source"],
      properties: {
        value: { type: "number", minimum: 0 },
        source: { type: "string", description: "Where the figure comes from: local data, a national guideline, or monitoring." },
      },
      description: "Only when the user gives their own figure with its source. Leave it out and the engine uses the cited default.",
    },
    daysOfAccessPerYear: { type: "number", minimum: 0, maximum: 365, description: "Days of access in the year. Ex-ante: the user's planned figure. Ex-post: from monitoring." },
};

/** With a project record the kind comes from the record, so the model is not asked for it. */
function d3Schema(withRecord: boolean): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [...(withRecord ? [] : ["waterSource", "treatment"]), "view", "option"],
    properties: { ...(withRecord ? {} : KIND_PROPERTIES), ...D3_PROPERTIES },
  };
}

/** What the model is told when no figure can be worked out. */
function refusal(stop: D3Stop): string {
  switch (stop.because) {
    case "fact not given":
      return `${stop.fact} is a project fact (${FACT_LABEL[stop.fact]}), and it is missing.`;
    case "home use not given":
      return `homeUse is a project fact ("yes", "no" or "not sure": ${FACT_LABEL.homeUse}), and it is missing.`;
    case "not covered yet":
      return `Held for now. No figure can be worked out for this project. The visitor reads: "${NO_CALCULATOR_YET}"`;
    case "another kind of project":
      return `Not set up yet. No figure can be worked out for this project. The visitor reads: "${NO_CALCULATOR_YET}"`;
  }
}

/**
 * Turns the model's JSON into a D-3 input, or throws with words that tell the model what to ask for. `record` is the project's
 * facts where a site has them: they decide what is counted, never the model.
 */
export function parseD3Input(raw: unknown, record?: ProjectFacts): D3Input {
  if (typeof raw !== "object" || raw === null) throw new Error("The D-3 input must be an object.");
  // WHETHER IT IS COUNTED COMES FIRST, as in Calvin's tools.
  const stop = d3Stop(record ?? kindFacts(readKind(raw)));
  if (stop !== null) throw new Error(refusal(stop));
  // The facts that decide it stay out of the engine's input: the engine is told only what it counts.
  const rest = { ...raw } as D3Input & Record<string, unknown>;
  for (const k of [...KIND_FACTS, "homeUse", "technology"]) delete rest[k];
  const input: D3Input = rest;
  // Every number in its range (ruled 2026-11-23), with the same check and the same words as her screen. A refused number
  // never reaches the engine.
  const [refused] = d3Refusals(input);
  if (refused !== undefined) throw new Error(refused.message);
  checkD3Input(input);
  return input;
}

/** Every source the result rests on, once each. */
export function d3Sources(result: D3Result): string[] {
  return [...new Set(result.values.map((v) => v.source).concat(result.steps.map((s) => s.source)))];
}

const d3Tool = (record?: ProjectFacts): AgentTool => makeCalculatorTool<D3Input, D3Result>({
  id: "calc/vwba-d3.computeD3",
  version: D3_ENGINE_VERSION,
  description:
    "Works out the volumetric water benefit of a household or community water supply project, by VWBA 2.0's Volume Provided method (D-3). Returns every value with where it came from, the steps of the sum, notes, what is still awaited, and blankOrAssumed: the values this run left blank or assumed.",
  inputSchema: d3Schema(record !== undefined),
  compute: computeD3,
  parseInput: (raw) => parseD3Input(raw, record),
  extractSources: d3Sources,
  blankOrAssumed: (_input, result) => violetNoteFacts(result),
});

/** Where there is no project record (the Agent Commons, MCP): the person gives the facts that say whether it is counted. */
export const computeD3Tool: AgentTool = d3Tool();

/** The same tool for a project on a site's record: the record decides, never the model. Make it again when its facts change. */
export function violetToolsFor(facts: ProjectFacts): AgentTool[] {
  return [d3Tool(facts)];
}

/** Violet's tools, where there is no project record. */
export const VIOLET_TOOLS: readonly AgentTool[] = [computeD3Tool];
