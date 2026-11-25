"use client";

// Violet's state, lifted out of her screen (J5), as Calvin's `useCalculatorState` is. A site's chat and her screen sit in
// different parts of the page, so the state they share lives here: the site calls this hook, hands it to `D3Screen` as
// `state`, and fills it from an answer with `fill`. It computes nothing: every figure comes from `computeD3`.

import { useEffect, useRef, useState } from "react";
import { hasProjectRecord, type Place } from "@waterbots/core/places";
import type { ModuleProject } from "@waterbots/core/project";
import type { GivenFacts, ProjectRecord } from "@waterbots/core/record";
import { useReadOnlySeat } from "@waterbots/core/readOnly";
import { fillViolet, violetAsks, violetKept, violetPageContext, type VioletAnswer, type VioletFill } from "../agent/chat.js";
import { computeD3 } from "../d3/compute.js";
import type { D3Input, D3Result, D3View } from "../d3/types.js";
import { d3InputFromRecord, violetProjectFromRecord } from "../record.js";
import { PROJECT_RULES } from "@waterbots/core/projectKinds";
import { d3Stop, d3Waits, type D3Stop } from "../supply.js";
import { followRecord, recordPopulation, recordRefusals, seedD3Input } from "./recordInput.js";
import type { Ask, Kept } from "@waterbots/core/chat";

export interface D3StateOptions {
  project?: ModuleProject;
  record?: ProjectRecord;
  view?: D3View;
  lockView?: D3View;
  place?: Place;
  onChange?: (input: D3Input, result: D3Result) => void;
  /** This seat cannot be changed. Left out, the seat's own setting. */
  readOnly?: boolean;
}

export interface D3State {
  project: ModuleProject | undefined;
  input: D3Input;
  result: D3Result;
  /** Why the last change was not taken, or null. */
  error: string | null;
  readOnly: boolean;
  /** Messages for numbers on the record that are outside their range. */
  refusals: string[];
  /** True once the person, or an answer, has said how the water can be counted. */
  chosen: boolean;
  /**
   * Why she works out nothing for this project, or null. It comes from the record: in the Agent Commons, the temporary one
   * a site keeps. With no record, or while the record does not say the kind of project, it is null.
   */
  stop: D3Stop | null;
  update: (next: D3Input) => void;
  choose: (option: D3Input["option"]) => void;
  switchView: (v: D3View) => void;
  /**
   * FILLS THE SCREEN FROM AN ANSWER: her way of counting, days, litres, flow, hours and the rest. A number outside its
   * range is refused, and the result says why. Inert on a read-only seat. Pass the answer's `facts` too: when the source
   * changes, the water before the project was said about the other source, so it is cleared and asked again.
   */
  fill: (answer: VioletAnswer, facts?: GivenFacts) => VioletFill;
  /** What she still asks for, in order. */
  asks: Ask[];
  /** The values she leaves at their default or their assumed start. */
  kept: Kept[];
  /** What she can see of this screen, read when a turn is sent. */
  pageContext: () => string;
}

export function useD3State({ project: given, record, view = "ex-ante", lockView, place, onChange, readOnly: locked }: D3StateOptions = {}): D3State {
  const seat = useReadOnlySeat();
  const readOnly = locked ?? seat;
  const project = record !== undefined ? violetProjectFromRecord(record) : given;
  // The source and the treatment are asked for where there is no record too, and no figure shows until they are given.
  const facts = record?.facts ?? (place !== undefined && !hasProjectRecord(place) ? { rules: PROJECT_RULES } : undefined);
  const stop = facts === undefined ? null : d3Stop(facts);
  const [input, setInput] = useState<D3Input>(() => (record !== undefined ? d3InputFromRecord(record, lockView ?? view) : seedD3Input(project, lockView ?? view)));
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState(false);
  // Two answers in one turn build on each other, so the latest input is kept here too.
  const latest = useRef(input);

  function update(next: D3Input): void {
    try {
      const r = computeD3(next);
      setError(null);
      latest.current = next;
      setInput(next);
      // Nothing is handed on while one blank fact decides whether it is counted.
      if (stop === null) onChange?.(next, r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // PEOPLE SERVED FOLLOW THE RECORD (0.5.0), as in Calvin. When the record's count arrives or changes after the
  // screen opens, the screen takes it. The record is the one place it is kept: this screen has no box for it.
  // With the shared record (J3), the access level and the water before the project follow it too, when it holds them.
  const fromRecord = record !== undefined ? d3InputFromRecord(record, input.view) : undefined;
  const recordKey = JSON.stringify([recordPopulation(project) ?? null, fromRecord?.accessLevel ?? null, fromRecord?.withoutProjectM3PerYear ?? null, record?.facts.waterSource?.value ?? null]);
  const lastRecordKey = useRef(recordKey);
  useEffect(() => {
    if (lastRecordKey.current === recordKey) return;
    const [, , , source] = JSON.parse(lastRecordKey.current) as (string | null)[];
    lastRecordKey.current = recordKey;
    const next = followRecord(input, project);
    if (fromRecord?.accessLevel !== undefined) next.accessLevel = fromRecord.accessLevel;
    if (fromRecord?.withoutProjectM3PerYear !== undefined) next.withoutProjectM3PerYear = fromRecord.withoutProjectM3PerYear;
    // The source changed, so the water it gave before the project is asked again.
    else if (source !== null && source !== record?.facts.waterSource?.value) delete next.withoutProjectM3PerYear;
    update(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordKey]);

  // Once nothing stops her, what was filled in meanwhile is handed on.
  const stopped = useRef(stop !== null);
  useEffect(() => {
    if (stopped.current && stop === null) onChange?.(latest.current, computeD3(latest.current));
    stopped.current = stop !== null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop?.because ?? null]);

  /** Switching view keeps the project facts and clears what belongs to one view: sliders or monitoring data. */
  function switchView(v: D3View): void {
    const facts = { ...input };
    delete facts.meteredM3PerYear;
    delete facts.operatingHoursPerYear;
    delete facts.daysOfAccessPerYear;
    delete facts.litresPerPersonPerDay;
    update({ ...facts, view: v, option: v === "ex-ante" && input.option === "metered" ? "beneficiaries" : input.option });
  }

  function choose(option: D3Input["option"]): void {
    setChosen(true);
    update({ ...input, option });
  }

  function fill(answer: VioletAnswer, given?: GivenFacts): VioletFill {
    if (readOnly) return { input: latest.current, filled: [], refused: [] };
    const start = { ...latest.current };
    const was = facts?.waterSource?.value;
    const moved = was !== undefined && given?.waterSource !== undefined && given.waterSource !== was;
    if (moved) delete start.withoutProjectM3PerYear;
    // A fact that changes in this same answer may be what opens her screen again, so its numbers are kept.
    if (stop !== null && !d3Waits(stop) && !moved && given?.treatment === undefined) return { input: latest.current, filled: [], refused: [] };
    const f = fillViolet(start, answer);
    if (f.filled.includes("option")) setChosen(true);
    if (f.filled.length > 0 || moved) update(f.input);
    return f;
  }

  // `update` only keeps an input the engine accepts, so this always succeeds.
  const result = computeD3(input);
  const refusals = recordRefusals(project, record);
  return {
    project,
    input,
    result,
    error,
    readOnly,
    refusals,
    chosen,
    stop,
    update,
    choose,
    switchView,
    fill,
    asks: violetAsks(input, chosen, facts),
    kept: stop !== null ? [] : violetKept(result),
    pageContext: () => violetPageContext({ projectName: project?.name ?? "", input, result, refusals, ...(place !== undefined ? { place } : {}), ...(facts !== undefined ? { facts } : {}) }),
  };
}
