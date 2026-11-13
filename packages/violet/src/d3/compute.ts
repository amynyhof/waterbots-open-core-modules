// The D-3 engine: VWBA 2.0's Volume Provided method, for household or community water supply.
//
// It does every sum. A screen or an agent only shows what it returns.
// The benefit is the water provided with the project, less the water provided without it
// (VWBA 2.0, Appendix D, D-3, p.45). The volume with the project comes from one of three ways, in the
// guidebook's order of preference: meters, the system's capacity, or the people it serves (p.45 to 46).
//
// Out of scope here: irrigation supply, and rainwater harvesting, which the guidebook works out with D-4.
//
// Caps (ruling 2026-11-12): in ex-post, a typed value above a method cap is kept as typed, the sum uses the cap,
// and a plain note says so. In ex-ante, a slider value is held between its floor and its ceiling, as Calvin's are.

import {
  D3_ENGINE_VERSION,
  DAYS_CAP,
  DAYS_CAP_SOURCE,
  DAYS_DEFAULT_FULL_ACCESS,
  DAYS_DEFAULT_SOURCE,
  HOURS_CAP,
  HOURS_CAP_SOURCE,
  PER_CAPITA_DEFAULT_L,
  PER_CAPITA_DEFAULT_SOURCE,
  SLIDER_FLOOR,
  SLIDER_FLOOR_SOURCE,
} from "./defaults.js";
import { D3_CITES, formatCitation } from "./sources.js";
import {
  AWAITING,
  type D3Input,
  type D3Result,
  type D3Slider,
  type D3Step,
  type D3Value,
} from "./types.js";

const RECORD = "the project record";
const LITRES_PER_M3 = 1000;

/** Throws when a number the user gave cannot be used. The message says what to fix. */
function checkNumber(name: string, v: number | undefined): number | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${name} must be a number.`);
  if (v < 0) throw new Error(`${name} cannot be below zero.`);
  return v;
}

/** Checks an input before the sums run. Throws with plain words when something cannot be used. */
export function checkD3Input(input: D3Input): void {
  if (input.view !== "ex-ante" && input.view !== "ex-post") throw new Error('view must be "ex-ante" or "ex-post".');
  if (input.option !== "metered" && input.option !== "capacity" && input.option !== "beneficiaries") {
    throw new Error('option must be "metered", "capacity" or "beneficiaries".');
  }
  if (input.option === "metered" && input.view === "ex-ante") {
    throw new Error("Meter readings come after the project runs. Use the ex-post view, or work out the volume from capacity or from the people served.");
  }
  if (input.accessLevel !== undefined && input.accessLevel !== "full" && input.accessLevel !== "limited") {
    throw new Error('accessLevel must be "full" or "limited".');
  }
  checkNumber("The water before the project", input.withoutProjectM3PerYear);
  checkNumber("The metered volume", input.meteredM3PerYear);
  checkNumber("The flow", input.flowM3PerHour);
  checkNumber("The operating hours", input.operatingHoursPerYear);
  checkNumber("The days of access", input.daysOfAccessPerYear);
  checkNumber("The number served", input.population?.served);
  checkNumber("The people per household", input.population?.householdSize);
  const local = input.litresPerPersonPerDay;
  if (local !== undefined) {
    checkNumber("The litres per person per day", local.value);
    if (typeof local.source !== "string" || local.source.trim() === "") {
      throw new Error("A litres-per-person figure that replaces the default needs its source: local data, a national guideline, or monitoring.");
    }
  }
}

/** Holds a value between floor and ceiling (ex-ante), or keeps it and uses the cap (ex-post). */
function bound(
  view: D3Input["view"],
  typed: number,
  ceiling: number,
  what: string,
  notes: string[],
): { used: number; note?: string } {
  if (typed <= ceiling) return { used: typed };
  const note =
    view === "ex-post"
      ? `You entered ${typed} ${what}. That is more than the cap of ${ceiling}. The sum uses the cap.`
      : `The slider is held at its ceiling of ${ceiling} ${what}.`;
  notes.push(note);
  return { used: ceiling, note };
}

/** Works out D-3's volumetric water benefit. Pure: the same input always gives the same result. */
export function computeD3(input: D3Input): D3Result {
  checkD3Input(input);
  const { view, option } = input;
  const values: D3Value[] = [];
  const steps: D3Step[] = [];
  const sliders: D3Slider[] = [];
  const notes: string[] = [];
  const awaiting: string[] = [];

  const awaited = (v: D3Value): D3Value => {
    awaiting.push(v.label);
    return v;
  };

  // The capacity path: flow × hours. Used by "capacity", and as the cap on "beneficiaries" when both are known.
  const needsCapacity = option === "capacity" || option === "beneficiaries";
  let capacityM3: number | null = null;
  if (needsCapacity) {
    const flow = input.flowM3PerHour;
    if (flow === undefined) {
      const v: D3Value = {
        key: "flowM3PerHour",
        label: "Flow of the system",
        unit: "m³ per hour",
        kind: "project fact",
        value: null,
        used: null,
        origin: null,
        source: RECORD,
        note:
          option === "capacity"
            ? AWAITING
            : "Not given. When it is known, the volume is held to what the system can supply.",
      };
      values.push(option === "capacity" ? awaited(v) : v);
    } else {
      values.push({
        key: "flowM3PerHour",
        label: "Flow of the system",
        unit: "m³ per hour",
        kind: "project fact",
        value: flow,
        used: flow,
        origin: "entered",
        source: RECORD,
      });
    }

    const hoursTyped = input.operatingHoursPerYear;
    let hoursUsed: number | null = null;
    if (hoursTyped === undefined) {
      const v: D3Value = {
        key: "operatingHoursPerYear",
        label: "Hours the system runs in a year",
        unit: "hours",
        kind: "anticipated performance",
        value: null,
        used: null,
        origin: null,
        source: view === "ex-ante" ? "no cited starting value: set it to the planned project" : "operating logs",
        note: option === "capacity" ? AWAITING : "Not given. Needed, with the flow, to hold the volume to what the system can supply.",
      };
      values.push(option === "capacity" ? awaited(v) : v);
    } else {
      const b = bound(view, hoursTyped, HOURS_CAP, "hours", notes);
      hoursUsed = b.used;
      values.push({
        key: "operatingHoursPerYear",
        label: "Hours the system runs in a year",
        unit: "hours",
        kind: "anticipated performance",
        value: hoursTyped,
        used: hoursUsed,
        origin: view === "ex-ante" ? "assumed" : "entered",
        source: view === "ex-ante" ? "assumed: set it to the planned project" : "operating logs",
        ...(b.note !== undefined ? { note: b.note } : {}),
      });
    }
    if (view === "ex-ante" && (option === "capacity" || flow !== undefined)) {
      sliders.push({
        key: "operatingHoursPerYear",
        label: "Hours the system runs in a year",
        unit: "hours",
        floor: SLIDER_FLOOR,
        floorSource: SLIDER_FLOOR_SOURCE,
        ceiling: HOURS_CAP,
        ceilingSource: HOURS_CAP_SOURCE,
        start: hoursUsed,
        startLabel: hoursUsed === null ? AWAITING : "assumed",
        startSource: hoursUsed === null ? "no cited starting value" : "set by the user",
      });
    }

    if (flow !== undefined && hoursUsed !== null) {
      capacityM3 = flow * hoursUsed;
      values.push({
        key: "supplyCapacityM3PerYear",
        label: "What the system can supply in a year",
        unit: "m³ per year",
        kind: "result",
        value: capacityM3,
        used: capacityM3,
        origin: "derived",
        source: formatCitation(D3_CITES.capacity),
      });
      steps.push({
        label: "What the system can supply in a year",
        how: "flow × hours a year",
        value: capacityM3,
        unit: "m³ per year",
        source: formatCitation(D3_CITES.capacity),
      });
    }
  }

  let withProject: number | null = null;

  if (option === "metered") {
    const m = input.meteredM3PerYear;
    if (m === undefined) {
      values.push(
        awaited({
          key: "meteredM3PerYear",
          label: "Metered water for the year",
          unit: "m³ per year",
          kind: "project fact",
          value: null,
          used: null,
          origin: null,
          source: "meter readings",
          note: AWAITING,
        }),
      );
    } else {
      withProject = m;
      values.push({
        key: "meteredM3PerYear",
        label: "Metered water for the year",
        unit: "m³ per year",
        kind: "project fact",
        value: m,
        used: m,
        origin: "entered",
        source: "meter readings",
      });
      steps.push({
        label: "Water provided with the project",
        how: "metered volume for the year",
        value: m,
        unit: "m³ per year",
        source: formatCitation(D3_CITES.options),
      });
    }
  }

  if (option === "capacity" && capacityM3 !== null) {
    withProject = capacityM3;
    steps.push({
      label: "Water provided with the project",
      how: "what the system can supply in a year",
      value: capacityM3,
      unit: "m³ per year",
      source: formatCitation(D3_CITES.capacity),
    });
  }

  if (option === "beneficiaries") {
    // People served: a project fact. Never assumed to be people when the record does not say so.
    const pop = input.population ?? {};
    let people: number | null = null;
    let peopleSource = RECORD;
    if (pop.served === undefined || pop.mode === undefined) {
      values.push(
        awaited({
          key: "peopleServed",
          label: "People with access",
          unit: "people",
          kind: "project fact",
          value: null,
          used: null,
          origin: null,
          source: RECORD,
          note: pop.served !== undefined ? `${AWAITING}: people or households?` : AWAITING,
        }),
      );
    } else if (pop.mode === "people") {
      people = pop.served;
    } else if (pop.householdSize === undefined) {
      values.push(
        awaited({
          key: "peopleServed",
          label: "People with access",
          unit: "people",
          kind: "project fact",
          value: null,
          used: null,
          origin: null,
          source: RECORD,
          note: `${AWAITING}: people per household`,
        }),
      );
    } else {
      people = pop.served * pop.householdSize;
      peopleSource = "the project record: households × people per household";
    }
    if (people !== null) {
      values.push({
        key: "peopleServed",
        label: "People with access",
        unit: "people",
        kind: "project fact",
        value: people,
        used: people,
        origin: pop.mode === "households" ? "derived" : "entered",
        source: peopleSource,
      });
    }

    // Access level: a project fact. It picks the per-person default.
    const access = input.accessLevel;
    if (access === undefined) {
      values.push(
        awaited({
          key: "accessLevel",
          label: "Full or limited access",
          unit: "",
          kind: "project fact",
          value: null,
          used: null,
          origin: null,
          source: RECORD,
          note: AWAITING,
        }),
      );
    } else {
      values.push({
        key: "accessLevel",
        label: "Full or limited access",
        unit: "",
        kind: "project fact",
        value: access,
        used: access,
        origin: "entered",
        source: RECORD,
      });
    }

    // Litres per person per day: the default, kept apart, and the figure the sum uses.
    const def = access === undefined ? null : PER_CAPITA_DEFAULT_L[access];
    values.push({
      key: "litresPerPersonPerDayDefault",
      label: "Default litres per person per day",
      unit: "litres per person per day",
      kind: "method default",
      value: def,
      used: def,
      origin: def === null ? null : "default",
      source: PER_CAPITA_DEFAULT_SOURCE,
      ...(def === null ? { note: "Chosen by full or limited access." } : {}),
    });
    const local = input.litresPerPersonPerDay;
    const perCapita = local !== undefined ? local.value : def;
    if (local !== undefined) {
      values.push({
        key: "litresPerPersonPerDay",
        label: "Litres per person per day used",
        unit: "litres per person per day",
        kind: view === "ex-post" ? "project fact" : "method default",
        value: local.value,
        used: local.value,
        origin: "entered",
        source: `${local.source} (allowed by ${formatCitation(view === "ex-post" ? D3_CITES.perCapitaMonitored : D3_CITES.perCapitaLocal)})`,
      });
    } else {
      values.push({
        key: "litresPerPersonPerDay",
        label: "Litres per person per day used",
        unit: "litres per person per day",
        kind: "method default",
        value: def,
        used: def,
        origin: def === null ? null : "default",
        source: PER_CAPITA_DEFAULT_SOURCE,
      });
    }

    // Days of access: anticipated performance. Full access starts at the whole year; limited access has no default.
    const daysTyped = input.daysOfAccessPerYear;
    let daysUsed: number | null = null;
    if (daysTyped !== undefined) {
      const b = bound(view, daysTyped, DAYS_CAP, "days", notes);
      daysUsed = b.used;
      values.push({
        key: "daysOfAccessPerYear",
        label: "Days of access in a year",
        unit: "days",
        kind: "anticipated performance",
        value: daysTyped,
        used: daysUsed,
        origin: view === "ex-ante" ? "assumed" : "entered",
        source: view === "ex-ante" ? "assumed: set it to the planned project" : "monitoring",
        ...(b.note !== undefined ? { note: b.note } : {}),
      });
    } else if (view === "ex-ante" && access === "full") {
      daysUsed = DAYS_DEFAULT_FULL_ACCESS;
      values.push({
        key: "daysOfAccessPerYear",
        label: "Days of access in a year",
        unit: "days",
        kind: "anticipated performance",
        value: daysUsed,
        used: daysUsed,
        origin: "assumed",
        source: `assumed, starting at ${DAYS_DEFAULT_SOURCE}`,
      });
    } else {
      values.push(
        awaited({
          key: "daysOfAccessPerYear",
          label: "Days of access in a year",
          unit: "days",
          kind: "anticipated performance",
          value: null,
          used: null,
          origin: null,
          source: view === "ex-post" ? "monitoring" : "no cited default for limited access",
          note: AWAITING,
        }),
      );
    }
    if (view === "ex-ante") {
      sliders.push({
        key: "daysOfAccessPerYear",
        label: "Days of access in a year",
        unit: "days",
        floor: SLIDER_FLOOR,
        floorSource: SLIDER_FLOOR_SOURCE,
        ceiling: DAYS_CAP,
        ceilingSource: DAYS_CAP_SOURCE,
        start: daysUsed,
        startLabel: daysUsed === null ? AWAITING : "assumed",
        startSource:
          daysTyped !== undefined ? "set by the user" : daysUsed !== null ? DAYS_DEFAULT_SOURCE : "no cited default for limited access",
      });
    }

    if (people !== null && perCapita !== null && daysUsed !== null) {
      const beneficiaryM3 = (people * perCapita * daysUsed) / LITRES_PER_M3;
      values.push({
        key: "beneficiaryVolumeM3PerYear",
        label: "Water for the people served",
        unit: "m³ per year",
        kind: "result",
        value: beneficiaryM3,
        used: beneficiaryM3,
        origin: "derived",
        source: formatCitation(D3_CITES.beneficiaries),
      });
      steps.push({
        label: "Water for the people served",
        how: "people × litres per person per day × days ÷ 1,000",
        value: beneficiaryM3,
        unit: "m³ per year",
        source: formatCitation(D3_CITES.beneficiaries),
      });

      if (capacityM3 !== null && beneficiaryM3 > capacityM3) {
        withProject = capacityM3;
        notes.push(
          "The water for the people served is more than the system can supply. The sum uses what the system can supply, so the benefit is not overstated.",
        );
      } else {
        withProject = beneficiaryM3;
      }
      steps.push({
        label: "Water provided with the project",
        how: capacityM3 !== null ? "the smaller of the water for the people served and what the system can supply" : "the water for the people served",
        value: withProject,
        unit: "m³ per year",
        source: formatCitation(capacityM3 !== null ? D3_CITES.capacityCap : D3_CITES.beneficiaries),
      });
    }
  }

  values.push({
    key: "withProjectM3PerYear",
    label: "Water provided with the project",
    unit: "m³ per year",
    kind: "result",
    value: withProject,
    used: withProject,
    origin: withProject === null ? null : "derived",
    source: formatCitation(D3_CITES.options),
  });

  // The water before the project: a project fact. 0 is a real answer (a brand-new supply), so it is asked, not assumed.
  const without = input.withoutProjectM3PerYear;
  if (without === undefined) {
    values.push(
      awaited({
        key: "withoutProjectM3PerYear",
        label: "Water this supply gave before the project",
        unit: "m³ per year",
        kind: "project fact",
        value: null,
        used: null,
        origin: null,
        source: RECORD,
        note: `${AWAITING}. Enter 0 for a brand-new supply.`,
      }),
    );
  } else {
    values.push({
      key: "withoutProjectM3PerYear",
      label: "Water this supply gave before the project",
      unit: "m³ per year",
      kind: "project fact",
      value: without,
      used: without,
      origin: "entered",
      source: RECORD,
    });
  }

  let vwb: number | null = null;
  if (withProject !== null && without !== undefined) {
    vwb = withProject - without;
    steps.push({
      label: "Volumetric water benefit",
      how: "water with the project − water before it",
      value: vwb,
      unit: "m³ per year",
      source: formatCitation(D3_CITES.formula),
    });
    if (vwb < 0) notes.push("The project gives less water than this supply gave before it. The benefit is shown as it is: below zero.");
  }
  values.push({
    key: "vwbM3PerYear",
    label: "Volumetric water benefit",
    unit: "m³ per year",
    kind: "result",
    value: vwb,
    used: vwb,
    origin: vwb === null ? null : "derived",
    source: formatCitation(D3_CITES.formula),
  });

  return {
    method: "VWBA 2.0 D-3 Volume Provided",
    engineVersion: D3_ENGINE_VERSION,
    view,
    option,
    values,
    steps,
    sliders,
    notes,
    awaiting,
    conditions: [
      `The water is free from contamination and meets the local quality standards for its use (${formatCitation(D3_CITES.conditions)}).`,
      `The people counted have reasonable access, at home or nearby (${formatCitation(D3_CITES.conditions)}).`,
      `Each unit of water is counted once. This benefit is never added to another claim on the same water (${formatCitation(D3_CITES.countOnce)}).`,
    ],
    withProjectM3PerYear: withProject,
    vwbM3PerYear: vwb,
  };
}
