/**
 * THE ELIGIBILITY WORKSHEET'S STATE: five row states, two pathways. Carried from the open site
 * (`src/lib/worksheetState.ts` and the "when Phoebe's part is done" part of `src/lib/visit.ts`, commit 0f16957) with its
 * moves unchanged. The words and the colours come from the tool files, through `generated/worksheet.generated.ts`.
 *
 * Rows are keyed by pack and by the row's own id, never by position. A row that is not in `rows` has not been looked at:
 * an absence is never a verdict.
 *
 * On the shared project record the worksheet lives in `eligibility`, one sheet per pack (core's `EligibilitySheet`).
 * `sheetFromRecord` and `withSheet` cross between the two shapes.
 */
import { setEligibilitySheet, type EligibilitySheet, type ProjectRecord } from "@waterbots/core/record";
import {
  HER_PACKS,
  PATHWAY_STATE_LABEL,
  READINESS_LABEL,
  ROW_STATE_COLOUR,
  ROW_STATE_LABEL,
  pathwayStateOf,
  readinessOf,
  section,
  verdictRows,
  type PathwayStateId,
  type ReadinessId,
  type RowContext,
  type RowStateId,
} from "./generated/worksheet.generated.js";

export type { PathwayStateId, ReadinessId, RowContext, RowStateId };

/** One row of the worksheet. `because` is her one sentence; `routes` are route-card ids on a Fixable row. */
export interface RowStatus {
  state: RowStateId;
  because?: string;
  routes?: string[];
}

/** Every row's state, by pack and then by the row's own id. */
export type SheetRows = Record<string, Record<string, RowStatus>>;

/** The worksheet for one screening. `sorts` holds what a pack's own tests settled: the class, the version, or both. */
export interface Sheet {
  rows: SheetRows;
  sorts: Record<string, string[]>;
}

export const EMPTY_SHEET: Sheet = { rows: {}, sorts: {} };

/** How each state is named on screen. Complete words, never a symbol alone. */
export const STATE_LABEL = ROW_STATE_LABEL;
export const PATHWAY_LABEL = PATHWAY_STATE_LABEL;
export const READ_LABEL = READINESS_LABEL;

/** The colour each state carries, as a CSS value: the tool file's token, or a muted ink where it names none. */
export function stateColour(state: RowStateId): string {
  const token = ROW_STATE_COLOUR[state];
  return token ? `var(${token}, var(--fg-3))` : "var(--fg-3)";
}

/** One row's state. A row nobody has looked at is Not yet checked. */
export function stateOf(sheet: Sheet, pack: string, id: string): RowStatus {
  return sheet.rows[pack]?.[id] ?? { state: "unchecked" };
}

/** A pack's rows as plain state ids, which is what the generated reads take. */
export function statesOf(sheet: Sheet, pack: string): Record<string, string> {
  const rows = sheet.rows[pack] ?? {};
  return Object.fromEntries(Object.entries(rows).map(([id, status]) => [id, status.state]));
}

/** What the project is known to be, for sorting which rows it has: her own tests first, then the class the record gives. */
export function contextFor(sheet: Sheet, pack: string, gsClass: string): RowContext {
  const found = section(pack);
  const sorts = sheet.sorts[pack] ?? [];
  const sorted = sorts.find((word) => found?.appliesTo.some((value) => value.id === word));
  const version = sorts.find((word) => found?.versionFlags.some((value) => value.id === word));
  const held = sorted ?? (gsClass ? gsClass.toLowerCase() : "");
  return { ...(held ? { gsClass: held } : {}), ...(version ? { versionFlag: version } : {}) };
}

/** Whether the pathway is in play, from its own test rows. */
export function pathwayState(sheet: Sheet, pack: string, context: RowContext = {}): PathwayStateId {
  return pathwayStateOf(pack, statesOf(sheet, pack), context);
}

/** The readiness read for one pathway, from the rows and never from prose. */
export function readiness(sheet: Sheet, pack: string, context: RowContext = {}): ReadinessId {
  return readinessOf(pack, statesOf(sheet, pack), context);
}

/** Every Eligibility row that carries a verdict has one, for this pathway. */
export function packDone(sheet: Sheet, pack: string, context: RowContext = {}): boolean {
  const rows = verdictRows(pack, context);
  if (rows.length === 0) return false;
  return rows.every((row) => stateOf(sheet, pack, row.id).state !== "unchecked");
}

/** How many rows on this pack have been looked at at all. */
export function touched(sheet: Sheet, pack: string, context: RowContext = {}): number {
  return verdictRows(pack, context).filter((row) => stateOf(sheet, pack, row.id).state !== "unchecked").length;
}

/** The count of each state on one pack's verdict rows. */
export function counts(sheet: Sheet, pack: string, context: RowContext = {}): Record<RowStateId, number> {
  const tally: Record<RowStateId, number> = { unchecked: 0, met: 0, fixable: 0, unknown: 0, blocked: 0 };
  for (const row of verdictRows(pack, context)) tally[stateOf(sheet, pack, row.id).state] += 1;
  return tally;
}

/** Whether any row on the sheet stands in one of these states. */
export function anyRowIn(sheet: Sheet, states: readonly RowStateId[]): boolean {
  return Object.values(sheet.rows).some((rows) => Object.values(rows).some((row) => states.includes(row.state)));
}

/** One verdict of hers. */
export interface RowUpdate {
  pack: string;
  id: string;
  state: RowStateId;
  because?: string;
  routes?: string[];
}

/** One answer to a pathway test. */
export interface PathwayUpdate {
  pack: string;
  id: string;
  state: PathwayStateId;
  because?: string;
}

export interface Verdicts {
  rows?: RowUpdate[];
  pathways?: PathwayUpdate[];
  sorts?: { pack: string; value: string }[];
}

/** Her verdicts applied to the sheet. Pure: a new sheet, the old one untouched. A pack or row that does not exist is dropped. */
export function applyUpdates(sheet: Sheet, updates: Verdicts): Sheet {
  const rows: SheetRows = { ...sheet.rows };
  const put = (pack: string, id: string, status: RowStatus): void => {
    const found = section(pack);
    if (!found || !found.rows.some((row) => row.id === id)) return;
    rows[pack] = { ...(rows[pack] ?? {}), [id]: status };
  };
  for (const update of updates.rows ?? []) {
    put(update.pack, update.id, { state: update.state, ...(update.because ? { because: update.because } : {}), ...(update.routes && update.routes.length ? { routes: update.routes } : {}) });
  }
  for (const update of updates.pathways ?? []) {
    put(update.pack, update.id, { state: update.state as unknown as RowStateId, ...(update.because ? { because: update.because } : {}) });
  }
  const sorts = { ...sheet.sorts };
  for (const { pack, value } of updates.sorts ?? []) {
    const found = section(pack);
    if (!found) continue;
    const known = found.appliesTo.some((word) => word.id === value && word.id !== "all") || found.versionFlags.some((word) => word.id === value);
    if (!known) continue;
    // One word per list: a later answer replaces an earlier one.
    const list = found.appliesTo.some((word) => word.id === value) ? found.appliesTo : found.versionFlags;
    sorts[pack] = [...(sorts[pack] ?? []).filter((word) => !list.some((entry) => entry.id === word)), value];
  }
  return { rows, sorts };
}

/** One pathway's line of the tally: its name, and each state it holds with its count, its word and its colour. */
export interface TallyLine {
  pack: string;
  /** The pathway's name, as her tool file names its section. */
  name: string;
  /** The states with at least one row, in the worksheet's order. */
  states: { state: RowStateId; count: number; label: string; colour: string }[];
  /** How many of the pathway's rows she has looked at, and how many there are. */
  looked: number;
  rows: number;
}

/**
 * HER TALLY, AS DATA FOR THE LEFT RAIL (F4.1; shared console page, family 4, rule 2). Progress sits in the left rail,
 * not in the chat, so the tally is never a line under her turn: a site draws these lines in its rail. They are drawn
 * from her verdicts, never her prose. A pathway with no row looked at yet is left out.
 */
export function worksheetTally(sheet: Sheet, packs: { pack: string; context?: RowContext }[]): TallyLine[] {
  const lines: TallyLine[] = [];
  for (const { pack, context } of packs) {
    const tally = counts(sheet, pack, context ?? {});
    const states = (["met", "fixable", "unknown", "blocked"] as RowStateId[])
      .filter((state) => tally[state] > 0)
      .map((state) => ({ state, count: tally[state], label: STATE_LABEL[state] ?? state, colour: stateColour(state) }));
    if (states.length === 0) continue;
    const rows = verdictRows(pack, context ?? {}).length;
    lines.push({ pack, name: section(pack)?.sectionName ?? pack, states, looked: rows - tally.unchecked, rows });
  }
  return lines;
}

// ── When her part is done ───────────────────────────────────────────────────────────────────────────────────────────

const packsHere = (): string[] => HER_PACKS.filter((pack) => section(pack) !== undefined);

/** One path she reads is done or closed. A pathway whose own test says it does not apply is done too. */
export function onePathDone(sheet: Sheet, gsClass: string): boolean {
  const packs = packsHere();
  if (packs.length === 0) return false;
  return packs.some((pack) => {
    const context = contextFor(sheet, pack, gsClass);
    return pathwayState(sheet, pack, context) === "does-not-apply" || packDone(sheet, pack, context);
  });
}

/** Her part is done, as the agent map reads it: one path done or closed, and every pathway she reads looked at. */
export function phoebeDone(sheet: Sheet, gsClass: string): boolean {
  return onePathDone(sheet, gsClass) && packsHere().every((pack) => Object.keys(sheet.rows[pack] ?? {}).length > 0);
}

/** Nothing is left for her to ask, on every pathway still open. Then Wellington comes whether or not her answer handed back. */
export function nothingLeftToAsk(sheet: Sheet, gsClass: string): boolean {
  const packs = packsHere();
  return (
    packs.length > 0 &&
    packs.every((pack) => {
      const context = contextFor(sheet, pack, gsClass);
      return pathwayState(sheet, pack, context) === "does-not-apply" || readiness(sheet, pack, context) === "likely-not" || packDone(sheet, pack, context);
    })
  );
}

// ── The sheet on the shared record ──────────────────────────────────────────────────────────────────────────────────

/** The worksheet the record holds. A row whose state is not one of hers is left out. */
export function sheetFromRecord(record: Pick<ProjectRecord, "eligibility">): Sheet {
  const rows: SheetRows = {};
  const sorts: Record<string, string[]> = {};
  for (const [pack, sheet] of Object.entries(record.eligibility ?? {})) {
    if (!section(pack)) continue;
    const held: Record<string, RowStatus> = {};
    for (const [id, row] of Object.entries(sheet.rows)) {
      held[id] = { state: row.state as RowStateId, ...(row.because ? { because: row.because } : {}), ...(row.routes?.length ? { routes: [...row.routes] } : {}) };
    }
    rows[pack] = held;
    if (sheet.sorts?.length) sorts[pack] = [...sheet.sorts];
  }
  return { rows, sorts };
}

/** The record with the worksheet written in, one sheet per pack she reads. Returns a new record. */
export function withSheet(record: ProjectRecord, sheet: Sheet): ProjectRecord {
  let out = record;
  for (const pack of packsHere()) {
    const value: EligibilitySheet = { rows: sheet.rows[pack] ?? {}, sorts: sheet.sorts[pack] ?? [] };
    out = setEligibilitySheet(out, pack, value);
  }
  return out;
}
