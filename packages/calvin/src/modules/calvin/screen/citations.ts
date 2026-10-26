/**
 * Version-aware methodology citations for the derivation surfaces (EquationStack on-screen,
 * ReportView export). The derivation must cite V1 sections under the Legacy basis and V2
 * sections under PAA — previously every row hardcoded "M400-12 v2.0 §7.3.x", so a Legacy run
 * mis-cited the current methodology (repro 2026-07-24).
 *
 * Section numbers are load-bearing provenance, NOT prose — sourced deliberately:
 *   • V1 (Legacy) numbers from CALCULATOR_SPEC.md §2 (EF_b §3.6.1–2, Q Method 1 §3.6.5–6,
 *     Q Method 2 §3.6.7–8, BE §3.6.3, PE §3.7, LE §3.8, ER §3.9.1).
 *   • V2 (PAA) numbers retained from the existing vetted derivation (§7.3.7/8/10, §7.4.1/4,
 *     §7.6, §8.2, §9.3, §10.1).
 * The full methodology-order audit + notation alignment is a POST-M9 pass (Amy, 2026-07-25);
 * this file only makes the per-basis switch honest, it does not re-order or add equation rows.
 */

export type Basis = "legacy" | "paa";

interface CiteEntry {
  legacy?: string; // V1 section, e.g. "3.6.7"
  paa?: string; // V2 section, e.g. "7.3.10"
  /** Plain-English tail for the export's GS-filing citation line. */
  desc: string;
}

const DOC: Record<Basis, string> = { legacy: "GS4GG SWS V1.0", paa: "GS4GG PAA M400-12 V2.0" };
const SHORT: Record<Basis, string> = { legacy: "SWS V1.0", paa: "M400-12 V2.0" };

export const CITES = {
  profile: { legacy: "3.6.1", paa: "7.3.7", desc: "baseline emission factor for making water safe" },
  se: { legacy: "3.6.2", paa: "7.3.8", desc: "specific energy required to boil water" },
  efb: { legacy: "3.6.1", paa: "7.3.7", desc: "baseline emission factor for making water safe" },
  // Quantity — Method 1 (Eq.5, population) vs Method 2 (Eq.6/7, per-premises)
  qMethod1: { legacy: "3.6.5", paa: "7.3.10", desc: "quantity of safe drinking water (capped at 5.5 L/p/d)" },
  qMethod2: { legacy: "3.6.7", paa: "7.3.10", desc: "quantity of safe water — premises basis (Method 2)" },
  qpwHh: { legacy: "3.6.8", paa: "7.3.10", desc: "per-premises volume QPW_hh (device-capacity limit deferred)" },
  qy: { legacy: "3.6.5", paa: "7.3.10", desc: "credited water volume — the smaller of demand and supply" },
  // Legacy-only baseline (subtractive); PAA splits this into Q_adj → BE_u → BE_CB below.
  beLegacy: { legacy: "3.6.3", desc: "baseline emissions (subtractive discounts)" },
  qadj: { paa: "7.4.1", desc: "adjustment for behaviour and compliance" },
  beU: { paa: "7.4.4", desc: "uncertainty-adjusted baseline emissions" },
  beAdj: { paa: "7.4.5", desc: "adjustment for ambition (DAF)" },
  pe: { legacy: "3.7", paa: "8.2", desc: "activity emissions" },
  le: { legacy: "3.8", paa: "9.1", desc: "leakage — embodied and market" },
  er: { legacy: "3.9.1", paa: "10.1", desc: "net GHG emission reductions" },
  bau: { paa: "7.5", desc: "conservative business-as-usual scenario" },
  beY: { paa: "7.6", desc: "crediting baseline — the lower of the adjusted baseline and BAU" },
  delta: { paa: "7.7", desc: "transparency check — the host-party mitigation contribution" },
} as const satisfies Record<string, CiteEntry>;

export type CiteKey = keyof typeof CITES;

/** The section number for this row under the given basis (basis-specific rows only define one). */
function section(basis: Basis, key: CiteKey): string | undefined {
  return (CITES[key] as CiteEntry)[basis];
}

/** Short inline form for the on-screen derivation, e.g. "per SWS V1.0 §3.6.7". Empty if N/A for the basis. */
export function citeShort(basis: Basis, key: CiteKey): string {
  const sec = section(basis, key);
  return sec ? `per ${SHORT[basis]} §${sec}` : "";
}

/** Long GS-filing form for the export, e.g. "As per §3.6.7 of GS4GG SWS V1.0 — <desc>." */
export function citeLong(basis: Basis, key: CiteKey): string {
  const sec = section(basis, key);
  if (!sec) return "";
  return `As per §${sec} of ${DOC[basis]} — ${CITES[key].desc}.`;
}

// ── Symbols and parameter numbers per rulebook (external review, 2026-09-15, comments E2, 3.2, 3.6 and
//    the rows around them; built 2026-09-21, step 7 of [#208]). Transcribed from the PDFs, not typed
//    from memory: V2 equation pages 29–39, parameter tables pp.46–75; V1 pp.12–15, 24–40. The V2 typo
//    (Eq.1 text cites fNRB as "SDWS 24" while the table numbers it SDWS 25) is recorded in
//    evals/gs4gg-carbon/v2-coverage.json; we cite 25. ──────────────────────────────────────────────

/** The rulebook's name, written one way everywhere (comment 3.2). */
export const RULEBOOK: Record<Basis, { long: string; short: string; version: string }> = {
  legacy: { long: "GS4GG SWS V1.0", short: "V1.0", version: "V1.0" },
  paa: { long: "GS4GG PAA M400-12 V2.0", short: "V2.0", version: "V2.0" },
};

export interface SymbolEntry {
  /** Base and subscript as the PDF prints them. */
  b: string;
  s?: string;
  /** The parameter's SDWS number under this rulebook, when it has one. */
  sdws?: number;
}

/** Every symbol the derivation prints, per rulebook. Subscripts p and y as the PDFs carry them. */
export const SYMBOLS: Record<Basis, Record<string, SymbolEntry>> = {
  paa: {
    SE: { b: "SE", s: "w,b,y" },
    eta: { b: "η", s: "wb", sdws: 11 },
    EFb: { b: "EF", s: "b" },
    EFco2: { b: "EF", s: "b,f,CO₂", sdws: 9 },
    EFnonco2: { b: "EF", s: "b,f,non-CO₂", sdws: 10 },
    fNRB: { b: "f", s: "NRB,f,y", sdws: 25 },
    xf: { b: "x", s: "f", sdws: 8 },
    Qunadj: { b: "Q", s: "y,unadj" },
    Qm: { b: "Q", s: "m,y", sdws: 28 },
    Qpop: { b: "Q", s: "pop,y" },
    HH: { b: "HH", s: "p,y", sdws: 31 },
    HN: { b: "HN", s: "p,y", sdws: 30 },
    QPW: { b: "QPW", s: "p", sdws: 29 },
    DO: { b: "DO", s: "p,y", sdws: 32 },
    Np: { b: "N", s: "p,y", sdws: 33 },
    QPWhh: { b: "QPW", s: "hh,p,y" },
    DP: { b: "DP", s: "p,y", sdws: 36 },
    qi: { b: "q", s: "i", sdws: 13 },
    tp: { b: "t", s: "p,y", sdws: 35 },
    DN: { b: "DN", s: "p,y", sdws: 37 },
    Qadj: { b: "Q", s: "y,adj" },
    X: { b: "X", s: "cleanboil,y", sdws: 26 },
    Mq: { b: "M", s: "q,y", sdws: 22 },
    Up: { b: "U", s: "p,y", sdws: 34 },
    BEunadj: { b: "BE", s: "unadj,y" },
    BEunc: { b: "BE", s: "unc,y" },
    Cb: { b: "C", s: "b", sdws: 12 },
    BEadj: { b: "BE", s: "adj,y" },
    DAF: { b: "DAF", s: "NetZero" },
    BAU: { b: "BAU", s: "y" },
    BEy: { b: "BE", s: "y" },
    Delta: { b: "Δ", s: "y" },
    AE: { b: "AE", s: "y" },
    AEff: { b: "AE", s: "ff,p,y" },
    AEec: { b: "AE", s: "ec,p,y" },
    LE: { b: "LE", s: "y" },
    LEemb: { b: "LE", s: "emb,y", sdws: 21 },
    LEmarket: { b: "LE", s: "Market,y", sdws: 40 },
    Nnew: { b: "N", s: "new,y", sdws: 41 },
    ER: { b: "ER", s: "y" },
  },
  legacy: {
    SE: { b: "SE", s: "w,b,y" },
    eta: { b: "η", s: "wb", sdws: 11 },
    EFb: { b: "EF", s: "b" },
    EFco2: { b: "EF", s: "b,f,CO₂", sdws: 9 },
    EFnonco2: { b: "EF", s: "b,f,nonCO₂", sdws: 10 },
    fNRB: { b: "f", s: "NRB,f,y", sdws: 21 },
    xf: { b: "x", s: "f", sdws: 8 },
    Qy: { b: "Q", s: "y" },
    Qm: { b: "Q", s: "m,y", sdws: 23 },
    Qpop: { b: "Q", s: "pop,y" },
    HH: { b: "HH", s: "p,y", sdws: 26 },
    HN: { b: "HN", s: "p,y", sdws: 25 },
    QPW: { b: "QPW", s: "p", sdws: 24 },
    DO: { b: "DO", s: "p,y", sdws: 27 },
    Np: { b: "N", s: "p,y", sdws: 28 },
    QPWhh: { b: "QPW", s: "hh,p,y" },
    DP: { b: "DP", s: "p,y", sdws: 31 },
    qi: { b: "q", s: "i", sdws: 13 },
    tp: { b: "t", s: "p,y", sdws: 30 },
    DN: { b: "DN", s: "p,y", sdws: 32 },
    X: { b: "X", s: "cleanboil,y", sdws: 22 },
    Mq: { b: "M", s: "q,y", sdws: 18 },
    Up: { b: "U", s: "p,y", sdws: 29 },
    Cb: { b: "C", s: "b", sdws: 12 },
    BEy: { b: "BE", s: "y" },
    PE: { b: "PE", s: "y" },
    LE: { b: "LE", s: "y", sdws: 35 },
    ER: { b: "ER", s: "y" },
  },
};

/** A symbol's entry for the basis, or throw — a misspelled key must fail a test, not print "undefined". */
export function sym(basis: Basis, key: string): SymbolEntry {
  const e = SYMBOLS[basis][key];
  if (!e) throw new Error(`no ${basis} symbol "${key}"`);
  return e;
}

/**
 * "V1.0 SDWS n" / "V2.0 SDWS n" for the basis, or "" when the parameter has no number under that
 * rulebook.
 *
 * ⚠ THE VERSION IS PART OF THE CITATION, NOT DECORATION (Amy, ruling (3), 2026-09-24). The two
 * rulebooks number their parameters DIFFERENTLY — QPW_p is SDWS 24 under V1.0 and SDWS 29 under
 * V2.0; N_p is 28 and 33; t_p is 30 and 35 — so a bare "SDWS 29" is not a citation at all in a
 * document whose whole subject is the comparison of the two. It is also how ERR-016 was found:
 * V2.0's Eq. 1 text cites fNRB as SDWS 24, which is V1.0's number for something else entirely.
 */
export function sdwsRef(basis: Basis, key: string): string {
  const n = SYMBOLS[basis][key]?.sdws;
  return n ? `${RULEBOOK[basis].version} SDWS ${n}` : "";
}

/** A versioned SDWS reference for a parameter this table does not carry a symbol for. */
export function sdwsNum(basis: Basis, n: number): string {
  return `${RULEBOOK[basis].version} SDWS ${n}`;
}
