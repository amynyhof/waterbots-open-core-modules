"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { describeSaveFailure, type RecordSaveState, type SaveOutcome } from "../../core/saveOutcome";
import {
  computeScenario,
  computeTransitionWaterfall,
  fnrbAvailability,
  transitionAvailability,
  type FnrbRefusal,
  type FiledFnrbRefusal,
} from "../engine";
import { calculatorPageContext } from "../agent/pageContext";
import type { SavedAnalysis } from "./analysis";
import {
  missingProjectFacts,
  recordOwnedFacts,
  seedCalcState,
  toSavedAnalysis,
  toScenarioInput,
  type CalcState,
  type CalvinProject,
  type ProjectFact,
} from "./state";
import { zeroCreditWarning } from "./warnings";
import { showSliders } from "./exAnte";

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
   * THIS SEAT CANNOT BE CHANGED BY THIS CALLER ([#97], Amy 2026-08-12). Defaults to `false`.
   *
   * **Amy's ruling is stronger than "the save will fail": *"a Contributor must not be able to
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
  /** Replaces the default `window.print()` when the user exports the report. */
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
}

export interface CalculatorState {
  /* ── Permission ─────────────────────────────────────────────────────────── */
  /** See `CalculatorOptions.readOnly`. */
  readOnly: boolean;
  /** True when this seat shows the ex-ante sliders: the site turned them on and the run is ex-ante. */
  sliders: boolean;

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
  save: () => Promise<void>;

  /* ── Engine results (computed by the engine, never here) ─────────────────── */
  /**
   * THE PROJECT FACTS NOBODY HAS PROVIDED (CALCULATOR_SPEC §0.2, Amy 2026-10-23): technology,
   * country, people served, and whether they were counted as people or households. While any is
   * missing nothing below is computed, and the seat shows one plain prompt naming them instead.
   */
  missingFacts: ProjectFact[];
  /**
   * THE ENGINE HAS NO fNRB IT WILL STAND BEHIND FOR THIS COUNTRY (Amy's ruling (3)(b), 2026-09-21).
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
  /** Stamped when an export is requested; drives the print-once effect. */
  printAt: string | null;
  exportReport: () => void;

  /* ── Chat host ──────────────────────────────────────────────────────────── */
  /**
   * What the hosting agent can SEE of this seat (`../agent/pageContext.ts`). A function, not a
   * memoised string: it is read at send-time, so the context reflects the state at the moment the
   * question was asked. Part of the seat's contract (CALCULATOR_SPEC §9).
   */
  pageContext: () => string;
}

export function useCalculatorState(project: CalvinProject, options: CalculatorOptions = {}): CalculatorState {
  const { readOnly = false, onSave, onDirtyChange, onExport, creditingPeriodYears, exAnteSliders } = options;
  const seed = useMemo(() => seedCalcState(project), [project]);
  const [state, setState] = useState<CalcState>(seed);
  // INERT WHEN READ-ONLY, and this is the layer that actually guarantees it. The surface
  // disables its controls too, but a disabled control is a courtesy — this is the lock.
  const patch = (p: Partial<CalcState>) => {
    if (readOnly) return;
    setState((s) => ({ ...s, ...p }));
  };

  // "modified · unsaved" landmark: working state differs from the last SAVED analysis.
  const [savedState, setSavedState] = useState<CalcState>(seed);

  /*
   * THE SEAT FOLLOWS THE RECORD (found on Amy's eyeball, 2026-09-22; fixed in the ruling (3) PR).
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
  const factsKey = JSON.stringify(recordOwnedFacts(project));
  const lastFactsKey = useRef(factsKey);
  useEffect(() => {
    if (lastFactsKey.current === factsKey) return; // mount, or the record did not move
    lastFactsKey.current = factsKey;
    const facts = JSON.parse(factsKey) as ReturnType<typeof recordOwnedFacts>;
    setState((s) => ({ ...s, ...facts }));
    setSavedState((s) => ({ ...s, ...facts }));
  }, [factsKey]);
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

  // Export: stamp the report's generated-at, then print once the DOM has it.
  const [printAt, setPrintAt] = useState<string | null>(null);
  function exportReport() {
    setPrintAt(new Date().toLocaleString());
  }
  const exportListener = useRef(onExport);
  exportListener.current = onExport;
  useEffect(() => {
    if (printAt) {
      const id = requestAnimationFrame(() => (exportListener.current ? exportListener.current() : window.print()));
      return () => cancelAnimationFrame(id);
    }
  }, [printAt]);

  // A MISSING PROJECT FACT, NO FIGURES (CALCULATOR_SPEC §0.2). Every figure depends on the
  // technology, the country and the count, and a fact nobody provided is not this project's. So
  // nothing is computed and the seat asks for what is missing.
  const missingFacts = useMemo(() => missingProjectFacts(state), [state]);
  // Both versions computed every render — each tab shows its own version-correct total.
  const inputBase = useMemo(() => (missingFacts.length > 0 ? null : toScenarioInput(state)), [state, missingFacts]);
  // ASK BEFORE COMPUTING. `computeScenario` REFUSES (it throws) for a country with no official
  // fNRB and no filed value; the seat must show that refusal, not crash on it, so it checks first.
  const availability = useMemo(
    () => (inputBase ? fnrbAvailability(inputBase.countryIso, inputBase.fnrbVintage, inputBase.fnrbOverride) : null),
    [inputBase],
  );
  const fnrbRefusal = availability && !availability.ok ? availability.refusal : null;
  // THE TRANSITION ASKS FOR THE FILED VALUE BEFORE IT COMPUTES (R1 amended, 2026-09-24 part 1).
  // The legacy side and the waterfall are the parts that need the project's own V1.0 filing, so
  // they are the parts withheld; the PAA side is unaffected and still runs.
  const transitionOk = useMemo(() => (inputBase ? transitionAvailability(inputBase.fnrbFiledV1) : null), [inputBase]);
  const filedFnrbRefusal = transitionOk && !transitionOk.ok ? transitionOk.refusal : null;
  const canRun = Boolean(inputBase && availability?.ok);
  const canRunLegacy = canRun && Boolean(transitionOk?.ok);
  const legacyResult = useMemo(
    () => (canRunLegacy && inputBase ? computeScenario({ ...inputBase, version: "legacy" }) : null),
    [inputBase, canRunLegacy],
  );
  const paaResult = useMemo(
    () => (canRun && inputBase ? computeScenario({ ...inputBase, version: "paa" }) : null),
    [inputBase, canRun],
  );
  const waterfall = useMemo(
    () => (canRunLegacy && inputBase ? computeTransitionWaterfall(inputBase) : null),
    [inputBase, canRunLegacy],
  );
  const result = state.version === "paa" ? paaResult : legacyResult;

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

  const pageContext = () =>
    calculatorPageContext({ projectName: project.name, state, missingFacts, fnrbRefusal, result, legacyResult, paaResult, waterfall });

  return {
    readOnly,
    sliders: showSliders(exAnteSliders, state),
    state,
    patch,
    seed,
    dirty,
    saving,
    /** The full outcome for the notice; `saving` above is the button's half (#98 2b). */
    saveState,
    canSave: Boolean(onSave),
    save,
    missingFacts,
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
    pageContext,
  };
}
