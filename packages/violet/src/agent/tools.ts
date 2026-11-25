// Violet's calculator tool. The model never works out a water benefit: it calls this tool, and the tool calls
// the D-3 engine. The tool hands back every source the engine used, so a host's evidence trail is complete.

import { HOME_USES } from "@waterbots/core/record";
import { notCoveredYet } from "@waterbots/core/technologyLabels";
import type { AgentTool } from "@waterbots/core/agent";
import { makeCalculatorTool } from "@waterbots/core/calculatorTool";
import { checkD3Input, computeD3 } from "../d3/compute.js";
import { D3_ENGINE_VERSION } from "../d3/defaults.js";
import type { D3Input, D3Result } from "../d3/types.js";
import { violetNoteFacts } from "../exportNotes.js";
import { d3Refusals } from "../ranges.js";
import { D3_TECHNOLOGIES, d3Stop, d3Technology, kindFacts, readKind } from "../supply.js";

const D3_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["technology", "view", "option"],
  properties: {
    technology: {
      type: "string",
      enum: [...D3_TECHNOLOGIES],
      description:
        "A PROJECT FACT: CWS = a community water supply; C-11 = a new or alternative water supply. HWT (household treatment), CWT (community level treatment) and IWT (institutional treatment) are not covered yet: the tool refuses them, so say so and work out nothing.",
    },
    homeUse: {
      type: "string",
      enum: [...HOME_USES],
      description: "A PROJECT FACT, needed only for C-11: whether people use the water at home. The tool works out a figure only when they do.",
    },
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
  },
};

/** Turns the model's JSON into a D-3 input, or throws with words that tell the model what to ask for. */
export function parseD3Input(raw: unknown): D3Input {
  if (typeof raw !== "object" || raw === null) throw new Error("The D-3 input must be an object.");
  // THE KIND OF PROJECT COMES FIRST, as in Calvin's tools. Treatment is refused here too (ruled 2026-11-24).
  const kind = readKind(raw);
  if (kind.technology === undefined) throw new Error('technology is a project fact ("CWS", a community water supply, or "C-11", a new or alternative water supply), and it is missing.');
  const stop = d3Stop(kindFacts(kind));
  const { label } = d3Technology(kind.technology);
  if (stop?.because === "home use not given") throw new Error(`homeUse is a project fact ("yes", "no" or "not sure": whether people use the water at home). It is needed for “${label}”, and it is missing.`);
  if (stop?.because === "another kind of project") throw new Error(`“${label}” is covered only where people use the water at home.`);
  if (stop !== null) throw new Error(notCoveredYet(label));
  // Both stay out of the engine's input: the engine is told only what it counts.
  const { technology: _technology, homeUse: _homeUse, ...rest } = raw as D3Input & { technology?: unknown; homeUse?: unknown };
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

export const computeD3Tool: AgentTool = makeCalculatorTool<D3Input, D3Result>({
  id: "calc/vwba-d3.computeD3",
  version: D3_ENGINE_VERSION,
  description:
    "Works out the volumetric water benefit of a household or community water supply project, by VWBA 2.0's Volume Provided method (D-3). Returns every value with where it came from, the steps of the sum, notes, what is still awaited, and blankOrAssumed: the values this run left blank or assumed.",
  inputSchema: D3_INPUT_SCHEMA,
  compute: computeD3,
  parseInput: parseD3Input,
  extractSources: d3Sources,
  blankOrAssumed: (_input, result) => violetNoteFacts(result),
});

/** Violet's tools. */
export const VIOLET_TOOLS: readonly AgentTool[] = [computeD3Tool];
