/**
 * fallback.ts — the labeled global-default fallback dial.
 *
 * When a country is ABSENT from a lookup dataset, the calculator does not silently pick a
 * value. It defaults to the **conservative** quartile and exposes an adjustable dial with
 * three labeled stops (Low / Median / High = 25th / 50th / 75th percentile of the source),
 * each explained by what it does to the CREDIT ESTIMATE — so a non-statistician can reason
 * about it, and every selection is recorded in the evidence trail.
 *
 * The conservative direction is defined PER PARAMETER (encoded, never assumed): for fNRB and
 * household size, a LOWER number means a lower baseline → fewer credits → conservative, so the
 * 25th percentile is the default. If a future parameter runs the other way, set
 * `conservativeDirection: "high"` and the labels follow the credit direction, not the number.
 *
 * Guardrails: this dial exists ONLY when the fallback fires (a country with real data gets no
 * picker — overriding a real value is the normal input, logged as user-supplied), and the
 * selection is always written to `provenance`.
 */

export type ConservativeDirection = "low" | "high";
export type FallbackStopKey = "low" | "median" | "high";
export type CreditEffect = "most-conservative" | "neutral" | "generous";

export interface FallbackSpec {
  conservativeDirection: ConservativeDirection;
  percentiles: { p25: number; p50: number; p75: number };
  cite: string;
}

export interface FallbackStop {
  stop: FallbackStopKey;
  percentile: 25 | 50 | 75;
  value: number;
  creditEffect: CreditEffect;
  explanation: string;
  isDefault: boolean;
}

// Wording keyed by CREDIT effect (not by percentile), so it stays correct when the
// conservative direction flips for a future parameter.
const EXPLANATION: Record<CreditEffect, string> = {
  "most-conservative":
    "Most conservative. Assumes conditions like the lower quarter of countries in the source. Your credit estimate will be cautious — defensible, unlikely to be challenged.",
  neutral:
    "The middle of the dataset. Neutral, but harder to defend without country evidence — if you choose this, be ready to justify it.",
  generous:
    "Generous. Inflates your estimate; only appropriate with strong project-specific evidence — at which point you should enter your actual value instead, not use a fallback.",
};

const PCT: Record<FallbackStopKey, 25 | 50 | 75> = { low: 25, median: 50, high: 75 };

function creditEffectOf(stop: FallbackStopKey, dir: ConservativeDirection): CreditEffect {
  if (stop === "median") return "neutral";
  const lowNumber = stop === "low";
  const lowIsConservative = dir === "low";
  return lowNumber === lowIsConservative ? "most-conservative" : "generous";
}

export function stopValue(f: FallbackSpec, stop: FallbackStopKey): number {
  return stop === "low" ? f.percentiles.p25 : stop === "median" ? f.percentiles.p50 : f.percentiles.p75;
}

/** The default stop = the most-conservative percentile for this parameter's direction. */
export function defaultStop(f: FallbackSpec): FallbackStopKey {
  return f.conservativeDirection === "low" ? "low" : "high";
}

/** The three labeled stops for the UI picker — shown ONLY when the fallback fires. */
export function fallbackStops(f: FallbackSpec): FallbackStop[] {
  const def = defaultStop(f);
  return (["low", "median", "high"] as FallbackStopKey[]).map((stop) => {
    const creditEffect = creditEffectOf(stop, f.conservativeDirection);
    return { stop, percentile: PCT[stop], value: stopValue(f, stop), creditEffect, explanation: EXPLANATION[creditEffect], isDefault: stop === def };
  });
}
