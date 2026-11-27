"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { describeSaveFailure, type RecordSaveState, type SaveOutcome } from "../../core/saveOutcome";
import {
  computeScenario,
  computeTransitionWaterfall,
  fnrbAvailability,
  transitionAvailability,
  checkSiteTables,
  type FnrbRefusal,
  type FiledFnrbRefusal,
  type SiteTables,
} from "../engine";
import { calculatorPageContext } from "../agent/pageContext";
import { calvinRecordProblems, calvinRecordRefusals } from "../agent/record";
import { calvinAsks, calvinKept, fillCalvin, type CalvinAnswer, type CalvinFill } from "../agent/chat";
import type { Ask, Kept } from "@waterbots/core/chat";
import type { Place } from "@waterbots/core/places";
import { exportNoteLines, labelledNoteLines, notesAt, type NoteLine, type NotesKind } from "@waterbots/core/notes";
import { withNote, type ValueNotes } from "@waterbots/core/record";
import { calvinAgentNoteLines } from "../agent/exportNotes";
import { printReport, type ExportOutcome } from "@waterbots/core/print";
import { reportStamp } from "@waterbots/core/report";
import type { SavedAnalysis } from "./analysis";
import {
  missingProjectFacts,
  followNewSeed,
  activityEmissionsAsk,
  seedCalcState,
  showsTransition,
  toSavedAnalysis,
  transitionPatch,
  toScenarioInput,
  type CalcState,
  type CalvinProject,
  type ProjectFact,
} from "./state";
import { zeroCreditWarning } from "./warnings";
import { exAnteOnlyPatch, exAnteOnlySeed, showSliders, withSliderStarts } from "./exAnte";
import { missingMonitoring, withModeChange, type MonitoringValue } from "./monitoring";
import { outOfRange, type OutOfRange } from "./valueRanges";

/**
 * The GS4GG carbon calculator's state, lifted out of the standalone calculator page
 * that has since been retired (OPEN #72 step 5).
 *
 * WHY A HOOK (OPEN #72, step 1). The calculator was decomposed so the single
 * console could place its zones: its inputs are the console rail's leaf lens, its
 * work surface is a tab at project depth, and its chat is the console's one chat
 * panel hosted by Calvin. Those three zones sit in different parts of the console
 * tree, so the state they share cannot live in any one of them — the same reason
 * `useJourneyState` exists, and the same shape.
 *
 * WHAT THE HOST HANDS IN (the cut, PR C). The project's facts as a plain `ModuleProject`
 * (seam S3), and the plug points as options: `onSave` (S1), `onDirtyChange` (S2), `readOnly`
 * (S5), `onExport`, and the crediting-period length. The hook imports nothing of any host —
 * no server action, no navigation guard, no record type — so the same state runs on the paid
 * site, the free site and the Commons. Each host keeps its own wiring on its own side.
 *
 * WHAT IT DOES NOT DO — deliberately. It computes nothing itself. Every number
 * comes from the deterministic engine (`computeScenario`, `computeTransitionWaterfall`,
 * reached through `../engine`), which is unit-tested against the reference test suite.
 * The hook only holds inputs, memoises engine calls, and hands work to the host to persist.
 * If a value here ever looks like arithmetic on a methodology quantity, it is in the wrong file.
 */
export interface CalculatorOptions {
  /**
   * THIS SEAT CANNOT BE CHANGED BY THIS CALLER ([#97], ruling 2026-08-12). Defaults to `false`.
   *
   * **The ruling is stronger than "the save will fail": *"a Contributor must not be able to
   * modify calculator inputs at all — not even on-screen."*** So when this is true, `patch` is
   * **inert** and `save` **never calls `onSave`**. With the mutators dead, `dirty` can never become
   * true, so *"modified · unsaved"* cannot appear and there is nothing left to fail at save time.
   */
  readOnly?: boolean;
  /**
   * HOW THE HOST KEEPS THE ANALYSIS (seam S1). Called with the analysis to store; answers whether
   * it was stored. **No `onSave` means no Save button** — a surface never offers a save that has
   * nowhere to go.
   */
  onSave?: (analysis: SavedAnalysis) => Promise<SaveOutcome>;
  /** Told whenever the working inputs start or stop differing from the last save (seam S2). */
  onDirtyChange?: (dirty: boolean) => void;
  /** Replaces the default export (core's `printReport`) when the user exports the report. The time stamp is set first. */
  onExport?: () => void;
  /**
   * The first crediting period's length in years, from the host's cited crediting rules. Absent
   * means the screens show no crediting-period total rather than one built on a length the module
   * does not hold (the paid site's crediting rules stay paid; plan §1.3).
   */
  creditingPeriodYears?: number;
  /**
   * EX-ANTE SLIDERS (ruling 2026-10-30). A site turns this on to show sliders, on an ex-ante run, for
   * the four values a project can only anticipate (`exAnte.ts`). Off, or on an ex-post run, the seat
   * keeps its typed boxes. The paid site leaves it off.
   */
  exAnteSliders?: boolean;
  /**
   * EX-ANTE ONLY (ruling 2026-11-05). A site turns this on to show the ex-ante view and nothing else: the
   * run is always ex-ante, a saved ex-post analysis opens as ex-ante, a change to ex-post is ignored,
   * and the sliders are on. The open site's screening uses it. The paid site leaves it off and shows both.
   */
  exAnteOnly?: boolean;
  /**
   * THE SITE'S OWN COUNTRY TABLES (V13, rulings 2026-11-14). A site passes its own DAF, fNRB, household
   * size, age shares, UN regions and baseline mix here, and the hook passes them to every engine call.
   * The engine reads them row by row: the site's row first, then the package's, then today's fallback.
   * Each value taken from them is labelled with the table's source, and listed in the result's
   * `siteTableValues`. A table that fails the engine's check is refused loudly: the hook throws
   * `SiteTableError` rather than use part of it. Absent, the package's own tables are used, as before.
   */
  tables?: SiteTables;
  /**
   * UNPIN THE FIGURE BLOCK (the maintainer's walk of the open site, 2026-11-16). The block above the equations shows
   * the headline figures and stays pinned at the top while the reader scrolls. A site turns this on to let it scroll
   * away with the page. Off by default: the block stays pinned. Either way it shows.
   */
  unpinFigureBlock?: boolean;
  /**
   * HIDE CALVIN'S EXPORT BUTTONS (the maintainer's walk of the open site, 2026-11-16): "Export report (PDF)" in the
   * controls panel and "Export (PDF)" on the report tab. A site that offers its own export, or none, turns them off
   * here. Off by default: the buttons show. The report itself still shows on the report tab.
   */
  hideExportButton?: boolean;
  /**
   * WHERE CALVIN IS WORKING (J2; agent rule 21): the Free site, the Paid site, the Agent Commons or MCP. The host
   * names it, and Calvin works with what that place gives him. Left out, a site with a project record, as before.
   */
  place?: Place;
  /**
   * THE PERSON'S NOTES ON CALVIN'S VALUES (J5, ruling 2026-11-23), as the project record keeps them
   * (`agents.calvin.notes`). On the Paid site (`place: "paid-site"`) every value row gets a note box, and the report
   * lists the notes. A read-only seat sees them and cannot write. The report there, on the Free site and in the Agent
   * Commons also carries Calvin's own notes on the values still blank or assumed, under their own label. Those two
   * have no note box. Elsewhere, no notes.
   */
  notes?: ValueNotes;
  /** Told the notes after each change, so the host keeps them on the record and saves them when the person saves. */
  onNotesChange?: (notes: ValueNotes) => void;
}

export interface CalculatorState {
  /* ── Permission ─────────────────────────────────────────────────────────── */
  /** See `CalculatorOptions.readOnly`. */
  readOnly: boolean;
  /** True when this seat shows the ex-ante sliders: the site turned them on and the run is ex-ante. */
  sliders: boolean;
  /** See `CalculatorOptions.exAnteOnly`. A site that offers an ex-ante / ex-post switch hides it when this is true. */
  exAnteOnly: boolean;
  /**
   * TRUE ONLY FOR A PROJECT CREDITED UNDER V1.0 (`CalvinProject.creditedUnderV1`, ruling 2026-09-21), while the 2021 version
   * counts it (`CalvinProject.answerV1`). Then the seat shows both versions and the transition. False: the V2.0-only view. The version stays V2.0, and nothing for
   * V1.0 is worked out or asked for: `legacyResult`, `waterfall` and `filedFnrbRefusal` stay null.
   */
  transition: boolean;
  /** See `CalculatorOptions.unpinFigureBlock`. True when the figure block stays pinned while the page scrolls. */
  figureBlockPinned: boolean;
  /** See `CalculatorOptions.hideExportButton`. True when the screens show Calvin's export buttons. */
  exportButton: boolean;
  /** Whose notes this place shows (`CalculatorOptions.notes`): the person's, Calvin's in the export, or none. */
  notesKind: NotesKind;
  /** The person's notes on Calvin's values. */
  valueNotes: ValueNotes;
  /** Writes the person's note on a value; an empty text removes it. **Inert when `readOnly`.** */
  setValueNote: (key: string, text: string, label: string) => void;
  /**
   * The lines of the report's "Notes on values": the person's notes and Calvin's (`by`), as the place gives. A site
   * with its own export puts these in it, under each kind's label.
   */
  noteLines: NoteLine[];


  /* ── Working inputs ─────────────────────────────────────────────────────── */
  /** The live input state. */
  state: CalcState;
  /** Merge a partial input change. **Inert when `readOnly`.** */
  patch: (p: Partial<CalcState>) => void;
  /** The state seeded from the project's facts and saved analysis — the "record:" side of provenance. */
  seed: CalcState;
  /** Working state differs from the last SAVED analysis ("modified · unsaved"). */
  dirty: boolean;
  saving: boolean;
  /** What the last save actually DID — the notice's input (#98 2b). `saving` is its subset. */
  saveState: RecordSaveState;
  /** True when the host passed `onSave`. False means no Save button is offered at all. */
  canSave: boolean;
  /** The site's own country tables, checked (`CalculatorOptions.tables`). The panels pass them on; they read no data file. */
  tables?: SiteTables;
  save: () => Promise<void>;

  /* ── Engine results (computed by the engine, never here) ─────────────────── */
  /**
   * THE PROJECT FACTS NOBODY HAS PROVIDED (ruling 2026-10-23): technology,
   * country, people served, and whether they were counted as people or households. While any is
   * missing nothing below is computed, and the seat shows one plain prompt naming them instead.
   */
  missingFacts: ProjectFact[];
  /**
   * NUMBERS THE SEAT HOLDS THAT ARE OUTSIDE THEIR RANGE (value ranges, ruled 2026-11-23): from the record, an older save
   * or the site. A number typed here is refused where it is typed and never gets this far. Nothing is computed while
   * there is one; the work surface shows each number with its message. Empty on every ordinary run.
   */
  outOfRange: OutOfRange[];
  /** The messages for the record's own people served, when the fact check refuses them. */
  recordRefusals: string[];
  /**
   * THE PUMP RUNS ON DIESEL OR GRID POWER AND ITS EMISSIONS ARE NOT ENTERED (item 15). Nothing is computed; the work
   * surface asks for the yearly figure. Null on every other run.
   */
  activityAsk: { power: "diesel" | "grid" } | null;
  /**
   * AN EX-POST RUN WITH A MONITORING VALUE NOT ENTERED (ruling 2026-11-21; `monitoring.ts`). Nothing is computed;
   * the work surface shows each value with a blank box until it is entered. Empty on an ex-ante run.
   */
  missingMonitoring: MonitoringValue[];
  /**
   * THE ENGINE HAS NO fNRB IT WILL STAND BEHIND FOR THIS COUNTRY (ruling (3)(b), 2026-09-21).
   * A6.4-AMT-009 publishes national values for 90 countries and multi-national values for three
   * regions; a project in neither list gets no number, so nothing below is computed and the seat
   * shows the refusal instead. Entering a filed fNRB clears it. Null on every ordinary run.
   */
  fnrbRefusal: FnrbRefusal | null;
  /**
   * Set when the TRANSITION cannot run because this project's filed V1.0 fNRB is not on the
   * record (R1 as amended, 2026-09-24). The PAA side still computes — only the legacy comparison
   * and the waterfall are withheld, because they are the parts that need the filing.
   */
  filedFnrbRefusal: FiledFnrbRefusal | null;
  /** The version the user is viewing. Null while `fnrbRefusal` is set — there is nothing to compute. */
  result: ReturnType<typeof computeScenario> | null;
  /** Both versions are computed every render so each tab shows its own total. */
  legacyResult: ReturnType<typeof computeScenario> | null;
  paaResult: ReturnType<typeof computeScenario> | null;
  /** Engine-computed Legacy → PAA decomposition. */
  waterfall: ReturnType<typeof computeTransitionWaterfall> | null;

  /* ── Derived display values (counts and ratios, not methodology) ────────── */
  warning: ReturnType<typeof zeroCreditWarning>;
  defaultCount: number;
  fallbackCount: number;
  erPerPerson: number;
  /** The first crediting period's length, when the host supplied it (`CalculatorOptions`). */
  creditingPeriodYears?: number;

  /* ── Export ─────────────────────────────────────────────────────────────── */
  /** Stamped when an export is requested, in core's one time stamp (`reportStamp`). */
  printAt: string | null;
  exportReport: () => void;
  /** The report's element id: Export hands that element to core's print part (family 4). */
  reportId: string;
  /**
   * What the last export did (`printReport`): the print window opened, the report opened in its own tab because no
   * print window opened, or neither. Null before an export, and when the site runs its own (`onExport`).
   */
  exportOutcome: ExportOutcome | null;

  /* ── Chat host ──────────────────────────────────────────────────────────── */
  /**
   * FILLS THE SEAT FROM AN ANSWER (J5): the values in it, each checked against its range. A refused number is left out, and
   * the result says why. Project facts go to the record, and the seat follows it. **Inert when `readOnly`.**
   */
  fill: (answer: CalvinAnswer) => CalvinFill;
  /** What he still asks for, in order. The first one is his one question. */
  asks: Ask[];
  /** The values he leaves at their default or their assumed start. */
  kept: Kept[];
  /**
   * What the hosting agent can SEE of this seat (`../agent/pageContext.ts`). A function, not a
   * memoised string: it is read at send-time, so the context reflects the state at the moment the
   * question was asked. Part of the seat's contract.
   */
  pageContext: () => string;
}

export function useCalculatorState(project: CalvinProject, options: CalculatorOptions = {}): CalculatorState {
  const { readOnly = false, onSave, onDirtyChange, onExport, creditingPeriodYears, exAnteOnly = false } = options;
  // Checked once per tables object, before any of it is used. A bad table throws here, loudly.
  const tables = useMemo(() => checkSiteTables(options.tables), [options.tables]);
  const exAnteSliders = options.exAnteSliders || exAnteOnly;
  const transition = showsTransition(project);
  const seed = useMemo(
    () => withSliderStarts(exAnteOnlySeed(seedCalcState(project), exAnteOnly), project.analysis, exAnteSliders),
    [project, exAnteSliders, exAnteOnly],
  );
  const [state, setState] = useState<CalcState>(seed);
  // INERT WHEN READ-ONLY, and this is the layer that actually guarantees it. The surface
  // disables its controls too, but a disabled control is a courtesy — this is the lock.
  // An ex-ante-only seat keeps its mode the same way: a change to it is dropped here. And a seat with no
  // transition keeps V2.0: a change of version is dropped too.
  const patch = (p: Partial<CalcState>) => {
    if (readOnly) return;
    // A change into ex-post clears the monitoring flags, so a planned figure never reads as monitored (`withModeChange`).
    setState((s) => ({ ...s, ...withModeChange(s, exAnteOnlyPatch(transitionPatch(p, transition), exAnteOnly)) }));
  };

  // "modified · unsaved" landmark: working state differs from the last SAVED analysis.
  const [savedState, setSavedState] = useState<CalcState>(seed);

  /*
   * THE SEAT FOLLOWS THE RECORD (found on eyeball, 2026-09-22; fixed in the ruling (3) PR).
   *
   * `state` is seeded ONCE, at mount. So a project record saved while the seat was open left the
   * calculator computing on the PREVIOUS country: change the country on Project context, save,
   * open the Tool tab — and it still showed the country before it. The server side was never at
   * fault (`saveProjectFacts` revalidates the route and a fresh record does arrive); the seat
   * simply never read it again.
   *
   * WHY IT SURFACED NOW AND NOT EARLIER: with one national fNRB for every country the stale value
   * was another plausible number, and nothing on screen contradicted it. Ruling (3) made the
   * difference between countries visible — a national value, a regional value with a note, or a
   * refusal — so being one country behind became impossible to miss. The defect is older than
   * this PR; the ruling is what made it legible.
   *
   * ONLY THE FIELDS THE RECORD OWNS ARE RE-READ (`recordOwnedFacts`). The user's own calculator
   * work — overrides, volumes — is untouched, which is why this is not a re-seed of everything:
   * a record save next door must never discard an analysis in progress.
   *
   * `savedState` MOVES WITH IT, and that is not an afterthought: `dirty` is state-vs-savedState,
   * so updating one without the other would light "modified · unsaved" for a change the user did
   * not make. The record's new facts are by definition saved. Applying the same delta to both
   * preserves whatever genuine unsaved difference the user already had.
   */
  /*
   * AND THE STARTING VALUES MOVE WITH THE DETAILS (the maintainer's walk of the open site, 2026-11-16). When the
   * water system type or the people served arrive after the seat opened, every value the person has not changed
   * takes its new starting value (`followNewSeed`), so days of operation and people served are not left on the
   * seed from before the details came. Values the person changed stay.
   */
  const seedKey = JSON.stringify(seed);
  const lastSeed = useRef(seed);
  useEffect(() => {
    const old = lastSeed.current;
    if (JSON.stringify(old) === seedKey) return; // mount, or nothing the seed reads moved
    lastSeed.current = seed;
    setState((s) => followNewSeed(s, old, seed, project));
    setSavedState((s) => followNewSeed(s, old, seed, project));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);
  /*
   * A PROJECT THAT STOPS BEING A TRANSITION WHILE THE SEAT IS OPEN goes back to V2.0. The record decides
   * `creditedUnderV1`, so, as with the facts above, the saved side moves with it and no unsaved change appears.
   */
  useEffect(() => {
    if (transition) return;
    const toV2 = (s: CalcState) => (s.version === "paa" ? s : { ...s, version: "paa" as const });
    setState(toV2);
    setSavedState(toV2);
  }, [transition]);
  const dirty = useMemo(() => JSON.stringify(state) !== JSON.stringify(savedState), [state, savedState]);
  const [saveState, setSaveState] = useState<RecordSaveState>({ kind: "idle" });
  const saving = saveState.kind === "saving";

  // THE HOST IS TOLD WHEN THE WORK STARTS OR STOPS BEING UNSAVED (seam S2), so it can guard its own
  // navigation. Read through a ref, so a host that passes a new function every render does not
  // re-fire this for nothing.
  const dirtyListener = useRef(onDirtyChange);
  dirtyListener.current = onDirtyChange;
  useEffect(() => {
    dirtyListener.current?.(dirty);
  }, [dirty]);

  /**
   * THE CATCH THAT DID NOT EXIST (#98 sub-bite 2b). This was `try { … } finally { … }` with no
   * `catch` — the shape #85 fixed in the record editor. Once a save can REFUSE (a zero-row update
   * is no longer read as success), a missing catch would turn a silent success into a silent
   * failure, which is no better. `setSavedState` is now reached only on success.
   *
   * THE CALCULATOR IS THE SHARPEST CASE IN THE PRODUCT: its inputs drive the ER numbers a
   * filing is built on, so a save that appears to land and did not means the screen and the
   * record disagree about the figures — and the screen is the one the user believes.
   *
   * A READ-ONLY SEAT NEVER CALLS `onSave` ([#97]), and neither does a seat with no `onSave`. It
   * returns before the request rather than letting the host refuse it — the surface offers no Save
   * button, so reaching here at all would mean something bypassed the affordance.
   */
  async function save() {
    if (readOnly || !onSave) return;
    setSaveState({ kind: "saving" });
    try {
      // [#144] — CHECK THE RESULT **AND** KEEP THE CATCH. The result carries the outcomes the host
      // named; the catch still covers everything it did not, which is why it stays.
      const outcome = await onSave(toSavedAnalysis(state));
      if (!outcome.ok) {
        setSaveState({ kind: "error", message: outcome.reason });
        return;
      }
      setSavedState(state);
      setSaveState({ kind: "saved" });
    } catch (err) {
      setSaveState({ kind: "error", message: describeSaveFailure(err) });
    }
  }

  // Export: stamp the report's generated-at, then print once the DOM has it, through core's print part (family 4): it
  // prints the report from its own area under <body>, so no console's layout can clip it. A site's own export
  // (`onExport`) runs in its place, after the stamp.
  const reportId = `calvin-report-${useId()}`;
  const [printAt, setPrintAt] = useState<string | null>(null);
  const [printRun, setPrintRun] = useState(0);
  const [exportOutcome, setExportOutcome] = useState<ExportOutcome | null>(null);
  function exportReport() {
    setPrintAt(reportStamp());
    setExportOutcome(null);
    setPrintRun((n) => n + 1);
  }
  const exportListener = useRef(onExport);
  exportListener.current = onExport;
  useEffect(() => {
    if (printRun === 0) return;
    const id = requestAnimationFrame(() => {
      if (exportListener.current) return exportListener.current();
      const report = document.getElementById(reportId);
      if (report) void printReport(report).then(setExportOutcome);
      else setExportOutcome("failed");
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printRun]);

  // A MISSING PROJECT FACT, NO FIGURES. Every figure depends on the
  // technology, the country and the count, and a fact nobody provided is not this project's. So
  // nothing is computed and the seat asks for what is missing.
  const missingFacts = useMemo(() => missingProjectFacts(state, tables), [state, tables]);
  // Both versions computed every render — each tab shows its own version-correct total.
  // A PUMP ON DIESEL OR GRID POWER WITH NOTHING ENTERED: no figures, and the seat asks (item 15).
  const activityAsk = useMemo(() => activityEmissionsAsk(state), [state]);
  // AN EX-POST MONITORING VALUE NOT ENTERED: no figures, and the seat asks (ruling 2026-11-21). Never a fallback.
  const monitoringAsk = useMemo(() => missingMonitoring(state), [state]);
  // A NUMBER OUTSIDE ITS RANGE: no figures, and the seat says which number and what its range is. Never used in a sum.
  const refusedValues = useMemo(() => outOfRange(state), [state]);
  const inputBase = useMemo(
    () => (missingFacts.length > 0 || refusedValues.length > 0 || activityAsk || monitoringAsk.length > 0 ? null : toScenarioInput(state, tables)),
    [state, missingFacts, refusedValues, activityAsk, monitoringAsk, tables],
  );
  // ASK BEFORE COMPUTING. `computeScenario` REFUSES (it throws) for a country with no official
  // fNRB and no filed value; the seat must show that refusal, not crash on it, so it checks first.
  const availability = useMemo(
    () => (inputBase ? fnrbAvailability(inputBase.countryIso, inputBase.fnrbVintage, inputBase.fnrbOverride, tables) : null),
    [inputBase, tables],
  );
  const fnrbRefusal = availability && !availability.ok ? availability.refusal : null;
  // THE TRANSITION ASKS FOR THE FILED VALUE BEFORE IT COMPUTES (R1 amended, 2026-09-24 part 1).
  // The legacy side and the waterfall are the parts that need the project's own V1.0 filing, so
  // they are the parts withheld; the PAA side is unaffected and still runs.
  // A NEW PROJECT IS NEVER ASKED (ruling 2026-09-21): it has no V1.0 filing, and it has no V1.0 side to
  // work out. Its seat runs V2.0 alone.
  const transitionOk = useMemo(
    () => (transition && inputBase ? transitionAvailability(inputBase.fnrbFiledV1) : null),
    [inputBase, transition],
  );
  const filedFnrbRefusal = transitionOk && !transitionOk.ok ? transitionOk.refusal : null;
  const canRun = Boolean(inputBase && availability?.ok);
  const canRunLegacy = canRun && transition && Boolean(transitionOk?.ok);
  const legacyResult = useMemo(
    () => (canRunLegacy && inputBase ? computeScenario({ ...inputBase, version: "legacy" }, tables) : null),
    [inputBase, canRunLegacy, tables],
  );
  const paaResult = useMemo(
    () => (canRun && inputBase ? computeScenario({ ...inputBase, version: "paa" }, tables) : null),
    [inputBase, canRun, tables],
  );
  const waterfall = useMemo(
    () => (canRunLegacy && inputBase ? computeTransitionWaterfall(inputBase, tables) : null),
    [inputBase, canRunLegacy, tables],
  );
  const result = transition && state.version === "legacy" ? legacyResult : paaResult;

  // Everything below reads the engine's output. With no fNRB there IS no output, so each one
  // reports nothing rather than a zero — a zero is a number, and we do not have one.
  const warning = result
    ? zeroCreditWarning({
        version: state.version,
        method: result.method,
        M_qy: state.waterQualityFactor,
        C_b: state.cBaseline,
        X_cleanboil: state.xCleanboil,
        U_p: state.method === 2 ? state.usageRate : 1,
        people: result.people,
        lpcd: state.litresPerPersonPerDay,
        days: state.operationalDays,
      })
    : null;

  const defaultCount = result
    ? result.provenance.filter((p) => p.source === "global-default" || p.source === "preset").length
    : 0;
  const fallbackCount = result ? result.fallbacks.length : 0;
  const erPerPerson = result && result.people > 0 ? result.result.ER / result.people : 0;

  // NOTES ON VALUES (J5). The person's notes are held here and handed to the host on each change; the host keeps them
  // on the record and saves them when the person saves. Calvin's own notes are worked out from the run's facts.
  const notesKind = notesAt(options.place);
  const [valueNotes, setValueNotes] = useState<ValueNotes>(() => options.notes ?? {});
  const setValueNote = (key: string, text: string, label: string) => {
    if (readOnly || notesKind !== "person") return;
    const next = withNote(valueNotes, key, text, new Date().toISOString(), label);
    setValueNotes(next);
    options.onNotesChange?.(next);
  };
  const noteLines = exportNoteLines(
    notesKind,
    labelledNoteLines(valueNotes),
    calvinAgentNoteLines(state, { sliders: showSliders(exAnteSliders, state), result }),
  );

  const fill = (answer: CalvinAnswer): CalvinFill => {
    if (readOnly) return { patch: {}, filled: [], refused: [] };
    const f = fillCalvin(state, answer);
    if (f.filled.length > 0) patch(f.patch);
    return f;
  };

  const pageContext = () =>
    calculatorPageContext({ projectName: project.name, state, missingFacts, activityAsk, missingMonitoring: monitoringAsk, outOfRange: refusedValues.map((r) => r.message), fnrbRefusal, filedFnrbRefusal, transition, result, legacyResult, paaResult, waterfall, recordProblems: calvinRecordProblems(project), ...(project.notCoveredYet !== undefined ? { notCoveredYet: project.notCoveredYet } : {}), ...(project.answer !== undefined ? { answer: project.answer } : {}), ...(project.creditedUnderV1 === true && project.answerV1 !== undefined ? { answerV1: project.answerV1 } : {}), ...(options.place !== undefined ? { place: options.place } : {}) });

  return {
    readOnly,
    sliders: showSliders(exAnteSliders, state),
    exAnteOnly,
    transition,
    figureBlockPinned: !options.unpinFigureBlock,
    exportButton: !options.hideExportButton,
    notesKind,
    valueNotes,
    setValueNote,
    noteLines,
    state,
    patch,
    seed,
    dirty,
    saving,
    /** The full outcome for the notice; `saving` above is the button's half (#98 2b). */
    saveState,
    canSave: Boolean(onSave),
    tables,
    save,
    missingFacts,
    outOfRange: refusedValues,
    recordRefusals: calvinRecordRefusals(project),
    activityAsk,
    missingMonitoring: monitoringAsk,
    fnrbRefusal,
    filedFnrbRefusal,
    result,
    legacyResult,
    paaResult,
    waterfall,
    warning,
    defaultCount,
    fallbackCount,
    erPerPerson,
    creditingPeriodYears,
    printAt,
    exportReport,
    reportId,
    exportOutcome,
    fill,
    asks: calvinAsks(state, { tables, transition, notCoveredYet: project.notCoveredYet, answer: project.answer, ...(project.creditedUnderV1 === true ? { answerV1: project.answerV1 } : {}) }),
    kept: calvinKept(state, { sliders: showSliders(exAnteSliders, state), result: paaResult }),
    pageContext,
  };
}
