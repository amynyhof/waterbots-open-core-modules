/**
 * calculatorTool — the GLOBAL wrapper that turns any deterministic `/calculators` compute into an
 * agent tool (build-global-consume-locally). Every pathway's calculator becomes a tool through this
 * one factory; gs4gg-carbon is the first consumer (`gs4ggCarbonTools.ts`), VWBA follows as config.
 *
 * The contract that keeps "no LLM math" honest: `compute` is a pure function from `/calculators`, and
 * this wrapper only (a) coerces/validates the model's JSON input, (b) calls compute, (c) extracts the
 * output's provenance as `sources`. No arithmetic on methodology values lives here.
 */
import type { AgentTool, AgentToolResult } from "./agent";

export interface CalculatorToolSpec<TInput, TOutput> {
  /** Tool id, e.g. "calc/gs4gg-carbon.computeScenario". */
  id: string;
  /** Version of the underlying calculator (bumped when its math/defaults change). */
  version: string;
  description: string;
  /** JSON Schema for the tool input. */
  inputSchema: Record<string, unknown>;
  /** The pure deterministic function from `/calculators`. */
  compute: (input: TInput) => TOutput;
  /** Coerce/validate the model's raw JSON into the calculator's typed input (throws on invalid). */
  parseInput: (raw: unknown) => TInput;
  /** Pull provenance/citation strings out of the output for the evidence trail. */
  extractSources: (output: TOutput) => string[];
  /** Optional: shape the output the model sees (defaults to the whole output). */
  projectOutput?: (output: TOutput) => unknown;
}

export function makeCalculatorTool<TInput, TOutput>(
  spec: CalculatorToolSpec<TInput, TOutput>,
): AgentTool {
  return {
    id: spec.id,
    version: spec.version,
    description: spec.description,
    inputSchema: spec.inputSchema,
    execute(raw: unknown): AgentToolResult {
      const input = spec.parseInput(raw);
      const output = spec.compute(input);
      return {
        output: spec.projectOutput ? spec.projectOutput(output) : output,
        sources: spec.extractSources(output),
        meta: { calculatorVersion: spec.version },
      };
    },
  };
}
