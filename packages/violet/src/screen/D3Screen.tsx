"use client";

// Violet's D-3 screen: the ex-ante view (sliders, or typed boxes) and the ex-post view (typed boxes).
// It holds what the user has set and hands it to the engine. It computes nothing: every number it shows,
// every note and every source comes from `computeD3`.
//
// ONE CALCULATOR SCREEN (J5, ruling 2026-11-23). Her screen has the same parts as Calvin's, in the same order and
// with the same look: a header card that stays at the top (her hero number in a tile like his, three smaller
// figures and a source line), a sentence under it, then parts that fold: the project facts, the anticipated
// performance, the calculation step by step, and what must be true for the method. Her colour, Orchid, shows on the
// header. On the Paid site every value takes the person's note, and the report lists them. On the Free site there is
// no note box: the report carries her own notes on the values still blank or assumed.
//
// Water only. This screen never shows a carbon figure, and never a total of water and carbon (open item N14).

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReadOnlySeat } from "@waterbots/core/readOnly";
import type { ModuleProject } from "@waterbots/core/project";
import type { Place } from "@waterbots/core/places";
import { withNote, type ProjectRecord, type ValueNotes } from "@waterbots/core/record";
import { notesAt, personNoteLines, RowNote, ValueNotesProvider, type NoteLine } from "@waterbots/core/notes";
import { d3InputFromRecord, violetProjectFromRecord } from "../record.js";
import { violetAgentNoteLines } from "../exportNotes.js";
import { computeD3 } from "../d3/compute.js";
import { AWAITING, D3_STATUS, type D3Input, type D3Option, type D3Result, type D3Slider, type D3Value, type D3ValueKey, type D3View } from "../d3/types.js";
import D3Report from "./D3Report.js";

/** A count the record holds, or nothing. Zero is an empty field written as a number, not a fact (as in Calvin). */
function positive(n: number | undefined): number | undefined {
  return typeof n === "number" && n > 0 ? n : undefined;
}

/**
 * People served, from the project record, the way Calvin takes it (0.5.0): only a count above zero counts, with
 * whether it counts people or households, and people per household when the record has them. Nothing is guessed.
 */
export function recordPopulation(project: ModuleProject | undefined): D3Input["population"] {
  const pop = project?.population;
  if (pop === undefined) return undefined;
  const served = positive(pop.served);
  const householdSize = positive(pop.householdSize);
  const out = {
    ...(pop.mode !== undefined ? { mode: pop.mode } : {}),
    ...(served !== undefined ? { served } : {}),
    ...(householdSize !== undefined ? { householdSize } : {}),
  };
  return Object.keys(out).length > 0 ? out : undefined;
}

/** The record's facts, as the screen's starting input. Facts the record does not hold stay unset: awaited. */
export function seedD3Input(project: ModuleProject | undefined, view: D3View): D3Input {
  const input: D3Input = { view, option: view === "ex-post" ? "metered" : "beneficiaries" };
  const population = recordPopulation(project);
  if (population !== undefined) input.population = population;
  return input;
}

/**
 * The input with people served as the record now gives them (0.5.0). Every other value stays as it is. The record
 * is the one place people served are kept, so a count that leaves the record leaves the input too.
 */
export function followRecord(input: D3Input, project: ModuleProject | undefined): D3Input {
  const next = { ...input };
  const population = recordPopulation(project);
  if (population === undefined) delete next.population;
  else next.population = population;
  return next;
}

/**
 * What the record still lacks for a count by people served, in the words Calvin's record check uses. Empty when
 * nothing is missing.
 */
export function missingPopulationFacts(input: D3Input): string[] {
  const pop = input.population ?? {};
  const out: string[] = [];
  if (pop.served === undefined) out.push("people served");
  else if (pop.mode === undefined) out.push("whether people served were counted as people or households");
  else if (pop.mode === "households" && pop.householdSize === undefined) out.push("people per household");
  return out;
}

const OPTION_LABEL: Record<D3Option, string> = {
  metered: "From meter readings",
  capacity: "From what the system can supply (motor pumps, treatment plants)",
  beneficiaries: "From the people served (handpumps, household systems)",
};

const VIEW_LABEL: Record<D3View, string> = { "ex-ante": "Before the project runs", "ex-post": "After the project runs" };

/** The new words on her screen (J5). Every other line was already on it, or is the engine's own. */
export const SCREEN_WORDS = {
  /** The sentence under the header card. */
  under: "The water benefit is the water the project provides, less the water this supply gave before it.",
  /** Beside the headline figure, on the part that folds. */
  headline: "Water benefit a year",
  /** Over the sliders. */
  sliders: "For a planned project, move the slider to match how it is expected to run, or type an exact number.",
  /** Over the typed boxes, where a site shows no sliders (the Paid site). */
  boxes: "For a planned project, type the figure you expect. Until you do, the assumed value is used.",
  calculation: "The calculation, step by step",
  export: "Export (PDF)",
} as const;

/** Shows a number the engine returned. Display only. A missing value is blank, with no label (0.5.1). */
function shown(v: number | string | null): string {
  if (v === null) return "";
  if (typeof v === "string") return v === "full" ? "full access" : v === "limited" ? "limited access" : v;
  return v.toLocaleString("en", { maximumFractionDigits: 2 });
}

/** A value's amount as the table shows it, for the export's notes. Display only. */
function amountOf(v: D3Value): string {
  return v.value === null ? "" : `${shown(v.value)} ${v.unit}`.trim();
}

/**
 * One value in the table. The engine's own note on the value (such as "the sum uses the cap") sits under its source
 * (J5). On the Paid site the last cell holds the person's note.
 */
function ValueRow({ v, notes }: { v: D3Value; notes: boolean }) {
  const capped = v.value !== v.used;
  return (
    <tr data-value={v.key}>
      <th scope="row">{v.label}</th>
      <td>
        {shown(v.value)} {v.value !== null ? v.unit : ""}
        {capped ? <span data-used> (the sum uses {shown(v.used)})</span> : null}
      </td>
      <td data-origin>{v.origin ?? ""}</td>
      <td data-source>
        {v.source}
        {v.value !== null && v.note ? <small data-engine-note="">{v.note}</small> : null}
      </td>
      {notes ? (
        <td data-your-note="">
          <RowNote noteKey={v.key} label={v.label} />
        </td>
      ) : null}
    </tr>
  );
}

function SliderRow({ s, disabled, set }: { s: D3Slider; disabled: boolean; set: (n: number) => void }) {
  return (
    <div data-slider={s.key}>
      <label>
        {s.label} <span data-label>{s.startLabel === AWAITING ? "" : s.startLabel}</span>
        <input
          type="range"
          aria-label={s.label}
          min={s.floor}
          max={s.ceiling}
          step={1}
          value={s.start ?? s.floor}
          disabled={disabled}
          onChange={(e) => set(Number(e.target.value))}
        />
      </label>
      <input
        type="number"
        aria-label={`${s.label}, exact value`}
        title={`Type an exact value, from ${s.floor} to ${s.ceiling}.`}
        min={s.floor}
        max={s.ceiling}
        value={s.start ?? ""}
        disabled={disabled}
        onChange={(e) => e.target.value !== "" && set(Number(e.target.value))}
      />
      <small>
        From {s.floor} ({s.floorSource}) to {s.ceiling} ({s.ceilingSource}). Starts at: {s.startSource}.
      </small>
    </div>
  );
}

/**
 * THE SAME VALUE AS A TYPED BOX (J5). Where a site shows no sliders (the Paid site, as on Calvin's paid screen), each
 * anticipated value is a typed box with its tag. Before anything is typed it shows the assumed value the engine
 * uses, tagged "assumed"; typing sets it.
 */
function SliderAsBox({ s, entered, disabled, set }: { s: D3Slider; entered: boolean; disabled: boolean; set: (n: number | undefined) => void }) {
  return (
    <div data-slider-box={s.key}>
      <label>
        {s.label} <span data-label>{entered ? "entered" : s.startLabel === AWAITING ? "" : s.startLabel}</span>
        <input
          type="number"
          aria-label={`${s.label}, exact value`}
          min={s.floor}
          max={s.ceiling}
          value={s.start ?? ""}
          disabled={disabled}
          onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
        />
        <span data-unit="">{s.unit}</span>
      </label>
      <small>
        From {s.floor} ({s.floorSource}) to {s.ceiling} ({s.ceilingSource}). Starts at: {s.startSource}.
      </small>
    </div>
  );
}

function NumberBox({ label, value, disabled, set }: { label: string; value: number | undefined; disabled: boolean; set: (n: number | undefined) => void }) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={0}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    </label>
  );
}

/**
 * People served, as the record gives them. Missing: the screen names what is missing and where it is filled in,
 * in Calvin's words, since the record is the one place it is kept.
 */
function PeopleFromRecord({ input }: { input: D3Input }) {
  const missing = missingPopulationFacts(input);
  if (missing.length > 0) {
    return (
      <p role="status" data-record-ask="">
        The water can&rsquo;t be worked out from the people served yet: this project&rsquo;s record is missing {missing.join(" and ")}.
        Fill it in on the project record and the figures follow.
      </p>
    );
  }
  const pop = input.population!;
  const n = pop.served!.toLocaleString("en");
  return (
    <p data-record-people="">
      People served: {n} {pop.mode === "households" ? `households of ${pop.householdSize!.toLocaleString("en")} people` : "people"}, from the project record.
    </p>
  );
}

/** Drops a key when its value is cleared, so the engine sees it as awaited. */
function patchNumber<K extends keyof D3Input>(input: D3Input, key: K, n: number | undefined): D3Input {
  const next = { ...input };
  if (n === undefined) delete next[key];
  else (next as Record<string, unknown>)[key] = n;
  return next;
}

/** A part that folds, with its title as the toggle, like Calvin's. */
function Fold({ name, title, headline, open = true, children }: { name: string; title: string; headline?: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} data-fold={name}>
      <summary>
        <span data-eyebrow="">{title}</span>
        {headline}
      </summary>
      {children}
    </details>
  );
}

/** One of the smaller figures under the hero tile: the engine's value with its tag. */
function Figure({ v }: { v: D3Value | undefined }) {
  if (v === undefined) return null;
  return (
    <div data-figure={v.key}>
      <span data-figure-number="">{shown(v.value)}</span>
      {v.origin !== null ? <span data-tag="">{v.origin}</span> : null}
      <span data-figure-label="">{v.label}</span>
      <span data-figure-unit="">{v.unit}</span>
    </div>
  );
}

/** The third smaller figure, by how the volume is worked out. Metered water is already the water with the project. */
const THIRD_FIGURE: Record<D3Option, D3ValueKey | null> = {
  beneficiaries: "peopleServed",
  capacity: "supplyCapacityM3PerYear",
  metered: null,
};

export interface D3ScreenProps {
  project?: ModuleProject;
  /**
   * THE SHARED PROJECT RECORD (J3). When a site passes it, it takes the place of `project`: the screen opens on people
   * served as entered, the access level and the water the supply gave before the project, and follows them when the
   * record changes. Facts the record does not hold stay awaited. Its `agents.violet.notes` are the person's notes.
   */
  record?: ProjectRecord;
  /** Which view to start in. */
  view?: D3View;
  /** Lock the screen to one view (the open site locks to ex-ante). */
  lockView?: D3View;
  /** Called with the input after every change, so a host can save it. */
  onChange?: (input: D3Input, result: D3Result) => void;
  /**
   * WHERE VIOLET IS WORKING (J2; agent rule 21). On the Paid site the values take the person's notes, and before the
   * project runs the anticipated values are typed boxes, as on Calvin's paid screen. On the Free site there is no note
   * box, the values are sliders, and the report carries her own notes. Left out: sliders and no notes, as before.
   */
  place?: Place;
  /**
   * SLIDERS BEFORE THE PROJECT RUNS (J5), as Calvin's `exAnteSliders`. Left out: on, except on the Paid site, where
   * the anticipated values are typed boxes, as on Calvin's paid screen.
   */
  exAnteSliders?: boolean;
  /** The person's notes on her values (J5), when the site does not pass the record. On the Paid site only. */
  notes?: ValueNotes;
  /** Told the notes after each change, so the host keeps them on the record and saves them when the person saves. */
  onNotesChange?: (notes: ValueNotes) => void;
  /** Hides her Export (PDF) button, as Calvin's `hideExportButton`. The report is still on the page for a print. */
  hideExportButton?: boolean;
  /** Replaces the default print when the person exports the report. */
  onExport?: () => void;
  /** Lets the smaller figures scroll away with the page, as Calvin's `unpinFigureBlock`. The hero tile stays. */
  unpinFigureBlock?: boolean;
}

export default function D3Screen({
  project: given,
  record,
  view = "ex-ante",
  lockView,
  onChange,
  place,
  exAnteSliders,
  notes: givenNotes,
  onNotesChange,
  hideExportButton = false,
  onExport,
  unpinFigureBlock = false,
}: D3ScreenProps) {
  const readOnly = useReadOnlySeat();
  const project = record !== undefined ? violetProjectFromRecord(record) : given;
  const [input, setInput] = useState<D3Input>(() => (record !== undefined ? d3InputFromRecord(record, lockView ?? view) : seedD3Input(project, lockView ?? view)));
  const [error, setError] = useState<string | null>(null);
  const notesKind = notesAt(place);
  const [notes, setNotes] = useState<ValueNotes>(() => givenNotes ?? record?.agents.violet?.notes ?? {});
  const [printAt, setPrintAt] = useState<string | null>(null);
  const sliders = exAnteSliders ?? place !== "paid-site";

  // PEOPLE SERVED FOLLOW THE RECORD (0.5.0), as in Calvin. When the record's count arrives or changes after the
  // screen opens, the screen takes it. The record is the one place it is kept: this screen has no box for it.
  // With the shared record (J3), the access level and the water before the project follow it too, when it holds them.
  const fromRecord = record !== undefined ? d3InputFromRecord(record, input.view) : undefined;
  const recordKey = JSON.stringify([recordPopulation(project) ?? null, fromRecord?.accessLevel ?? null, fromRecord?.withoutProjectM3PerYear ?? null]);
  const lastRecordKey = useRef(recordKey);
  useEffect(() => {
    if (lastRecordKey.current === recordKey) return;
    lastRecordKey.current = recordKey;
    const next = followRecord(input, project);
    if (fromRecord?.accessLevel !== undefined) next.accessLevel = fromRecord.accessLevel;
    if (fromRecord?.withoutProjectM3PerYear !== undefined) next.withoutProjectM3PerYear = fromRecord.withoutProjectM3PerYear;
    update(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordKey]);

  // THE EXPORT PRINTS HER REPORT ALONE (J5). The page is marked while it prints, so her stylesheet shows only her
  // report, and the mark is taken off after.
  useEffect(() => {
    if (printAt === null || typeof window === "undefined") return;
    const root = document.documentElement;
    root.dataset.wbPrint = "violet";
    const done = () => {
      delete root.dataset.wbPrint;
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
  }, [printAt]);

  // `update` only keeps an input the engine accepts, so this always succeeds.
  const result: D3Result = computeD3(input);

  /** Switching view keeps the project facts and clears what belongs to one view: sliders or monitoring data. */
  function switchView(v: D3View) {
    const facts = { ...input };
    delete facts.meteredM3PerYear;
    delete facts.operatingHoursPerYear;
    delete facts.daysOfAccessPerYear;
    delete facts.litresPerPersonPerDay;
    update({ ...facts, view: v, option: v === "ex-ante" && input.option === "metered" ? "beneficiaries" : input.option });
  }

  function update(next: D3Input) {
    try {
      const r = computeD3(next);
      setError(null);
      setInput(next);
      onChange?.(next, r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function setNote(key: string, text: string, label: string) {
    if (readOnly || notesKind !== "person") return;
    const next = withNote(notes, key, text, new Date().toISOString(), label);
    setNotes(next);
    onNotesChange?.(next);
  }

  function exportReport() {
    if (onExport) onExport();
    else setPrintAt(new Date().toISOString());
  }

  const options: D3Option[] = input.view === "ex-post" ? ["metered", "capacity", "beneficiaries"] : ["capacity", "beneficiaries"];
  const value = (key: D3ValueKey) => result.values.find((v) => v.key === key);
  const vwb = result.vwbM3PerYear;
  const third = THIRD_FIGURE[input.option];
  const defaults = result.values.filter((v) => v.origin === "default").length;
  const assumed = result.values.filter((v) => v.origin === "assumed").length;
  const showsPersonNotes = notesKind === "person";
  const noteLines: NoteLine[] = showsPersonNotes
    ? personNoteLines(notes, result.values.map((v) => ({ key: v.key, label: v.label, amount: amountOf(v) })))
    : notesKind === "agent"
      ? violetAgentNoteLines(result)
      : [];
  const headline = (
    <span data-headline="">
      {SCREEN_WORDS.headline} <b>{shown(vwb)}</b> {vwb !== null ? "m³" : ""}
    </span>
  );

  /** The hero tile: her figure, in the same format and height as Calvin's. Her draft label sits on it. */
  const tile = (
    <div data-pinned-main="">
      <div data-tiles="">
        <div data-tile="" aria-label="Water benefit, VWBA 2.0 D-3">
          <div data-pills="">
            <span data-pill="">Water</span>
            <p data-status="">{D3_STATUS}</p>
          </div>
          <span data-tile-name="">VWBA 2.0 D-3</span>
          <span data-tile-total="">{vwb !== null ? `${shown(vwb)} m³/yr` : ""}</span>
        </div>
      </div>
    </div>
  );
  /** The smaller figures and the source line, right under the tile. */
  const figureBlock = (
    <section data-figure-numbers="">
      <div data-figure-tiles="">
        <Figure v={value("withProjectM3PerYear")} />
        <Figure v={value("withoutProjectM3PerYear")} />
        {third !== null ? <Figure v={value(third)} /> : null}
      </div>
      <p data-provenance="">
        {result.method} · {defaults} default{defaults === 1 ? "" : "s"} · {assumed} assumed
      </p>
    </section>
  );

  const screen = (
    <section className="violet-d3" data-view={input.view} data-place={place} aria-label="Water benefit, VWBA 2.0 D-3">
      <h2>Water provided (VWBA 2.0, D-3)</h2>

      {/* THE HEADER CARD (J5). It stays at the top while the reader scrolls. On a phone only the tile stays. */}
      <div data-pinned-header="" data-figure-block={unpinFigureBlock ? "scrolls" : "pinned"}>
        {tile}
        {unpinFigureBlock ? null : figureBlock}
      </div>
      <p data-under="">{SCREEN_WORDS.under}</p>
      {unpinFigureBlock ? figureBlock : null}

      {lockView === undefined ? (
        <div role="group" aria-label="View">
          {(["ex-ante", "ex-post"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={input.view === v} disabled={readOnly} onClick={() => switchView(v)}>
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
      ) : null}

      <Fold name="facts" title="Project facts">
        <div role="group" aria-label="How the volume is worked out">
          {options.map((o) => (
            <button key={o} type="button" aria-pressed={input.option === o} disabled={readOnly} onClick={() => update({ ...input, option: o })}>
              {OPTION_LABEL[o]}
            </button>
          ))}
        </div>
        <NumberBox label="Water this supply gave before the project (m³ a year)" value={input.withoutProjectM3PerYear} disabled={readOnly} set={(n) => update(patchNumber(input, "withoutProjectM3PerYear", n))} />
        {input.option === "capacity" ? (
          <NumberBox label="Flow of the system (m³ an hour)" value={input.flowM3PerHour} disabled={readOnly} set={(n) => update(patchNumber(input, "flowM3PerHour", n))} />
        ) : null}
        {input.option === "beneficiaries" ? (
          <div role="group" aria-label="Full or limited access">
            {(["full", "limited"] as const).map((a) => (
              <button key={a} type="button" aria-pressed={input.accessLevel === a} disabled={readOnly} onClick={() => update({ ...input, accessLevel: a })}>
                {a === "full" ? "Full access" : "Limited access"}
              </button>
            ))}
          </div>
        ) : null}
        {input.option === "beneficiaries" ? <PeopleFromRecord input={input} /> : null}
      </Fold>

      {input.view === "ex-ante" ? (
        result.sliders.length > 0 ? (
          <Fold name="sliders" title="Anticipated performance" headline={headline}>
            <p data-caption="">{sliders ? SCREEN_WORDS.sliders : SCREEN_WORDS.boxes}</p>
            {result.sliders.map((s) =>
              sliders ? (
                <SliderRow key={s.key} s={s} disabled={readOnly} set={(n) => update(patchNumber(input, s.key, n))} />
              ) : (
                <SliderAsBox key={s.key} s={s} entered={input[s.key] !== undefined} disabled={readOnly} set={(n) => update(patchNumber(input, s.key, n))} />
              ),
            )}
          </Fold>
        ) : null
      ) : (
        <Fold name="monitoring" title="Monitoring data" headline={headline}>
          {input.option === "metered" ? (
            <NumberBox label="Metered water for the year (m³)" value={input.meteredM3PerYear} disabled={readOnly} set={(n) => update(patchNumber(input, "meteredM3PerYear", n))} />
          ) : null}
          {input.option === "capacity" ? (
            <NumberBox label="Hours the system ran in the year" value={input.operatingHoursPerYear} disabled={readOnly} set={(n) => update(patchNumber(input, "operatingHoursPerYear", n))} />
          ) : null}
          {input.option === "beneficiaries" ? (
            <NumberBox label="Days of access in the year" value={input.daysOfAccessPerYear} disabled={readOnly} set={(n) => update(patchNumber(input, "daysOfAccessPerYear", n))} />
          ) : null}
        </Fold>
      )}

      {error !== null ? <p role="alert">{error}</p> : null}

      <Fold name="calculation" title={SCREEN_WORDS.calculation}>
        <div data-result>
          <table>
            <thead>
              <tr>
                <th scope="col">Value</th>
                <th scope="col">Amount</th>
                <th scope="col">Where it came from</th>
                <th scope="col">Source</th>
                {showsPersonNotes ? <th scope="col">Your note</th> : null}
              </tr>
            </thead>
            <tbody>
              {result.values.map((v) => (
                <ValueRow key={v.key} v={v} notes={showsPersonNotes} />
              ))}
            </tbody>
          </table>

          {/* EACH SUM FOLDS OPEN TO SHOW ITS FORMULA (J5), as Calvin's equation rows do. */}
          <ol aria-label="How the benefit is worked out">
            {result.steps.map((s) => (
              <li key={s.label}>
                <details>
                  <summary>
                    {s.label}: {shown(s.value)} {s.value !== null ? s.unit : ""}
                  </summary>
                  {s.how} = {shown(s.value)} {s.unit} ({s.source})
                </details>
              </li>
            ))}
          </ol>

          {result.notes.length > 0 ? (
            <ul aria-label="Notes">
              {result.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}

          <p data-vwb>
            Volumetric water benefit: {shown(vwb)} {vwb !== null ? "m³ a year" : ""}
          </p>
        </div>
      </Fold>

      <Fold name="conditions" title="What must be true for this method" open={false}>
        <ul aria-label="What must be true for this method">
          {result.conditions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Fold>

      <div data-foot="">
        <p>This is an estimate, not a checked result. Only an independent auditor checks a claim.</p>
        {hideExportButton ? null : (
          <button type="button" data-export="" onClick={exportReport}>
            {SCREEN_WORDS.export}
          </button>
        )}
      </div>

      <D3Report
        projectName={project?.name ?? ""}
        input={input}
        result={result}
        optionLabel={OPTION_LABEL[input.option]}
        viewLabel={VIEW_LABEL[input.view]}
        noteLines={noteLines}
        generatedAt={printAt ?? ""}
        shown={shown}
      />
    </section>
  );

  return showsPersonNotes ? (
    <ValueNotesProvider notes={notes} {...(readOnly ? {} : { onChange: setNote })}>
      {screen}
    </ValueNotesProvider>
  ) : (
    screen
  );
}
