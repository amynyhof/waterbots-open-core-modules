/**
 * Zero-credit guard. When a single input has driven the result to zero, the calculator must
 * say so plainly — never silently show ER = 0. This identifies the specific culprit among the
 * discounts / quantity inputs (the extremes diagnosed 2026-07-22: M_q=0, C_b=1, X_cleanboil=1,
 * U_p=0, or a zeroed population/volume). Pure + testable.
 */
export interface ZeroCreditArgs {
  version: "legacy" | "paa";
  method: 1 | 2;
  M_qy: number;
  C_b: number;
  X_cleanboil: number;
  U_p: number;
  people: number;
  lpcd: number;
  days: number;
}

export function zeroCreditWarning(p: ZeroCreditArgs): string | null {
  if (p.M_qy === 0) return "M_q = 0 — no credits: all water-quality samples are failing.";
  if (p.C_b >= 1) return "C_b = 1 — no credits: everyone is already using safe water.";
  if (p.X_cleanboil >= 1) return "X_cleanboil = 1 — no credits: everyone still boils the safe water.";
  if (p.version === "legacy" && p.C_b + p.X_cleanboil >= 1)
    return "C_b + X_cleanboil ≥ 1 — no credits: the eligible share is zero.";
  if (p.method === 2 && p.U_p === 0) return "U_p = 0 — no credits: nobody is using the technology.";
  if (!(p.people > 0)) return "Population is 0 — no water served, no credits.";
  if (!(p.lpcd > 0)) return "Litres / person / day is 0 — no water served.";
  if (!(p.days > 0)) return "Operational days is 0 — no water served.";
  return null;
}
