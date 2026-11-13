// Violet's calculator tool. The model never works out a water benefit: it calls this tool, and the tool calls
// the D-3 engine. The tool hands back every source the engine used, so a host's evidence trail is complete.

import type { AgentTool } from "@waterbots/core/agent";
import { makeCalculatorTool } from "@waterbots/core/calculatorTool";
import { checkD3Input, computeD3 } from "../d3/compute.js";
import { D3_ENGINE_VERSION } from "../d3/defaults.js";
import type { D3Input, D3Result } from "../d3/types.js";

const D3_INPUT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["view", "option"],
  properties: {
    view: { type: "string", enum: ["ex-ante", "ex-post"], description: "ex-ante: before the project runs. ex-post: after it runs, with monitoring data." },
    option: {
      type: "string",
      enum: ["metered", "capacity", "beneficiaries"],
      description: "How the volume is worked out, in order of preference: meter readings (ex-post only), the system's capacity, or the people served.",
    },
    withoutProjectM3PerYear: { type: "number", minimum: 0, description: "A PROJECT FACT: water this supply gave each year before the project, in m³. 0 for a brand-new supply. Never assume it; ask." },
    population: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { type: "string", enum: ["people", "households"], description: "A PROJECT FACT: whether 'served' counts people or households. Never assume it; ask." },
        served: { type: "number", minimum: 0, description: "A PROJECT FACT: how many are served. Never assume it; ask." },
        householdSize: { type: "number", minimum: 0, description: "A PROJECT FACT, needed only when mode is households: people per household. Never assume it; ask." },
      },
    },
    accessLevel: { type: "string", enum: ["full", "limited"], description: "A PROJECT FACT: full access (at home or nearby, all year) or limited access (for example a school). It picks the default litres per person. Never assume it; ask." },
    meteredM3PerYear: { type: "number", minimum: 0, description: "Ex-post, option metered: the metered volume for the year, in m³." },
    flowM3PerHour: { type: "number", minimum: 0, description: "A PROJECT FACT: the system's design delivery or pumping capacity, or its expected average flow, in m³ per hour." },
    operatingHoursPerYear: { type: "number", minimum: 0, description: "Hours a year the system runs at that flow. Ex-ante: the user's planned figure. Ex-post: from operating logs." },
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
    daysOfAccessPerYear: { type: "number", minimum: 0, description: "Days of access in the year. Ex-ante: the user's planned figure. Ex-post: from monitoring." },
  },
};

/** Turns the model's JSON into a D-3 input, or throws with words that tell the model what to ask for. */
export function parseD3Input(raw: unknown): D3Input {
  if (typeof raw !== "object" || raw === null) throw new Error("The D-3 input must be an object.");
  const input = raw as D3Input;
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
    "Works out the volumetric water benefit of a household or community water supply project, by VWBA 2.0's Volume Provided method (D-3). Returns every value with where it came from, the steps of the sum, notes, and what is still awaited.",
  inputSchema: D3_INPUT_SCHEMA,
  compute: computeD3,
  parseInput: parseD3Input,
  extractSources: d3Sources,
});

/** Violet's tools. */
export const VIOLET_TOOLS: readonly AgentTool[] = [computeD3Tool];
