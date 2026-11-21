"use client";

// Violet's D-3 screen: the ex-ante view (sliders) and the ex-post view (typed boxes).
// It holds what the user has set and hands it to the engine. It computes nothing: every number it shows,
// every note and every source comes from `computeD3`.
//
// Water only. This screen never shows a carbon figure, and never a total of water and carbon (open item N14).

import { useEffect, useRef, useState } from "react";
import { useReadOnlySeat } from "@waterbots/core/readOnly";
import type { ModuleProject } from "@waterbots/core/project";
import { computeD3 } from "../d3/compute.js";
import { AWAITING, D3_STATUS, type D3Input, type D3Option, type D3Result, type D3Slider, type D3Value, type D3View } from "../d3/types.js";

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

/** Shows a number the engine returned. Display only. */
function shown(v: number | string | null): string {
  if (v === null) return AWAITING;
  if (typeof v === "string") return v === "full" ? "full access" : v === "limited" ? "limited access" : v;
  return v.toLocaleString("en", { maximumFractionDigits: 2 });
}

function ValueRow({ v }: { v: D3Value }) {
  const capped = v.value !== v.used;
  return (
    <tr data-value={v.key}>
      <th scope="row">{v.label}</th>
      <td>
        {shown(v.value)} {v.value !== null ? v.unit : ""}
        {capped ? <span data-used> (the sum uses {shown(v.used)})</span> : null}
      </td>
      <td data-origin>{v.origin ?? AWAITING}</td>
      <td data-source>{v.source}</td>
      <td data-note>{v.note ?? ""}</td>
    </tr>
  );
}

function SliderRow({ s, disabled, set }: { s: D3Slider; disabled: boolean; set: (n: number) => void }) {
  return (
    <div data-slider={s.key}>
      <label>
        {s.label} <span data-label>{s.startLabel}</span>
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

export interface D3ScreenProps {
  project?: ModuleProject;
  /** Which view to start in. */
  view?: D3View;
  /** Lock the screen to one view (the open site locks to ex-ante). */
  lockView?: D3View;
  /** Called with the input after every change, so a host can save it. */
  onChange?: (input: D3Input, result: D3Result) => void;
}

export default function D3Screen({ project, view = "ex-ante", lockView, onChange }: D3ScreenProps) {
  const readOnly = useReadOnlySeat();
  const [input, setInput] = useState<D3Input>(() => seedD3Input(project, lockView ?? view));
  const [error, setError] = useState<string | null>(null);

  // PEOPLE SERVED FOLLOW THE RECORD (0.5.0), as in Calvin. When the record's count arrives or changes after the
  // screen opens, the screen takes it. The record is the one place it is kept: this screen has no box for it.
  const recordKey = JSON.stringify(recordPopulation(project) ?? null);
  const lastRecordKey = useRef(recordKey);
  useEffect(() => {
    if (lastRecordKey.current === recordKey) return;
    lastRecordKey.current = recordKey;
    update(followRecord(input, project));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordKey]);

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

  const options: D3Option[] = input.view === "ex-post" ? ["metered", "capacity", "beneficiaries"] : ["capacity", "beneficiaries"];

  return (
    <section className="violet-d3" data-view={input.view} aria-label="Water benefit, VWBA 2.0 D-3">
      <h2>Water provided (VWBA 2.0, D-3)</h2>
      <p data-status="">{D3_STATUS}</p>

      {lockView === undefined ? (
        <div role="group" aria-label="View">
          {(["ex-ante", "ex-post"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={input.view === v} disabled={readOnly} onClick={() => switchView(v)}>
              {v === "ex-ante" ? "Before the project runs" : "After the project runs"}
            </button>
          ))}
        </div>
      ) : null}

      <div role="group" aria-label="How the volume is worked out">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={input.option === o} disabled={readOnly} onClick={() => update({ ...input, option: o })}>
            {OPTION_LABEL[o]}
          </button>
        ))}
      </div>

      <fieldset>
        <legend>Project facts</legend>
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
      </fieldset>

      {input.view === "ex-ante" ? (
        <fieldset>
          <legend>Anticipated performance</legend>
          {result.sliders.map((s) => (
            <SliderRow key={s.key} s={s} disabled={readOnly} set={(n) => update(patchNumber(input, s.key, n))} />
          ))}
        </fieldset>
      ) : (
        <fieldset>
          <legend>Monitoring data</legend>
          {input.option === "metered" ? (
            <NumberBox label="Metered water for the year (m³)" value={input.meteredM3PerYear} disabled={readOnly} set={(n) => update(patchNumber(input, "meteredM3PerYear", n))} />
          ) : null}
          {input.option === "capacity" ? (
            <NumberBox label="Hours the system ran in the year" value={input.operatingHoursPerYear} disabled={readOnly} set={(n) => update(patchNumber(input, "operatingHoursPerYear", n))} />
          ) : null}
          {input.option === "beneficiaries" ? (
            <NumberBox label="Days of access in the year" value={input.daysOfAccessPerYear} disabled={readOnly} set={(n) => update(patchNumber(input, "daysOfAccessPerYear", n))} />
          ) : null}
        </fieldset>
      )}

      {error !== null ? <p role="alert">{error}</p> : null}

      <div data-result>
          <table>
            <thead>
              <tr>
                <th scope="col">Value</th>
                <th scope="col">Amount</th>
                <th scope="col">Where it came from</th>
                <th scope="col">Source</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>
              {result.values.map((v) => (
                <ValueRow key={v.key} v={v} />
              ))}
            </tbody>
          </table>

          <ol aria-label="How the benefit is worked out">
            {result.steps.map((s) => (
              <li key={s.label}>
                {s.label}: {s.how} = {shown(s.value)} {s.unit} ({s.source})
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
            Volumetric water benefit: {shown(result.vwbM3PerYear)} {result.vwbM3PerYear !== null ? "m³ a year" : ""}
          </p>

          <ul aria-label="What must be true for this method">
            {result.conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p>This is an estimate, not a checked result. Only an independent auditor checks a claim.</p>
      </div>
    </section>
  );
}
