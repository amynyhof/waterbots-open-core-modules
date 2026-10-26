/**
 * Display + input helpers for the calculator. Two hardening rules live here so a single
 * bad value can never take down the whole page (crash fix, 2026-07-22):
 *
 *  - `fmt` / `fmtExp` GUARD undefined / null / NaN / Infinity → "—". The formatter is the
 *    last line of defence; nothing upstream can crash the metrics strip or equation stack.
 *  - `parseNumericInput` makes an empty field a DELIBERATE state, not `NaN`: an optional
 *    field clears (unset), a required field holds its last valid value (the UI shows a
 *    "enter a value" hint). So `NaN` never reaches the engine or the formatter.
 */

export function fmt(n: number | null | undefined, dp = 2): string {
  return typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })
    : "—";
}

export function fmtExp(n: number | null | undefined, dp = 3): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toExponential(dp) : "—";
}

export type NumericInputResult =
  | { action: "hold" } // required field emptied → keep the last valid value
  | { action: "set"; value: number } // valid number entered
  | { action: "clear" }; // optional field emptied → unset

export function parseNumericInput(raw: string, optional: boolean): NumericInputResult {
  if (raw.trim() === "") return optional ? { action: "clear" } : { action: "hold" };
  const v = Number(raw);
  return Number.isFinite(v) ? { action: "set", value: v } : { action: "hold" };
}
