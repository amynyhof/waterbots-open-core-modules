/**
 * THE AGENT CONTRACT — the boundary between an agent and the deterministic code it calls.
 *
 * A tool is a NARROW, typed capability the model may invoke; the HOST's runtime (never the model)
 * executes it, records it in its own evidence trail, and feeds the result back. For a calculator
 * tool the `execute` body is a PURE call into the engine — no LLM maths ever crosses this line. The
 * tool surfaces the calculation's provenance as `sources` so a host's trail can be complete.
 *
 * Moved here from the paid site's agent tools with the cut (seam S9). What a host adds at run time
 * — a data client, the active knowledge packs — is the host's business, so this contract takes it
 * as a type parameter (`Ctx`) and names nothing of it. Each host supplies its own context type.
 */

/** The result of running a tool — the output the model sees, plus the provenance for the trail. */
export interface AgentToolResult {
  /** JSON-serializable output handed back to the model (and logged verbatim). */
  output: unknown;
  /** Provenance strings (defaults / vintages / citations the deterministic code used). */
  sources: string[];
  /** Extra trail metadata, e.g. `{ calculatorVersion }`. */
  meta?: Record<string, unknown>;
}

/** A tool the model may call. `execute` is pure for calculators (kept sync-or-async for generality). */
export interface AgentTool<Ctx = unknown> {
  /** Stable id referenced from agent configs, e.g. "calc/gs4gg-carbon.computeScenario". */
  readonly id: string;
  /** Semver of the underlying capability (e.g. the calculator version). */
  readonly version: string;
  /** One-line description the model reads to decide when to call it. */
  readonly description: string;
  /** JSON Schema for the tool input. */
  readonly inputSchema: Record<string, unknown>;
  /**
   * Run the tool. Throws on invalid input (surfaced to the model as an error tool_result). `ctx` is
   * the host's optional run-time context; pure calculator tools ignore it.
   */
  execute(input: unknown, ctx?: Ctx): AgentToolResult | Promise<AgentToolResult>;
}
