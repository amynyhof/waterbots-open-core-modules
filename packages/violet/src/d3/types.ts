// The shapes D-3 takes in and gives back. No sums here.

/** Ex-ante: before the project runs, with sliders. Ex-post: after it runs, with typed monitoring data. */
export type D3View = "ex-ante" | "ex-post";

/**
 * How the volume with the project is worked out. The guidebook gives three ways, in order of preference
 * (VWBA 2.0, Appendix D, D-3, p.45 to 46):
 * - "metered": meter readings. Ex-post only, since a project that has not run has no readings.
 * - "capacity": the system's flow times the hours it runs.
 * - "beneficiaries": people with access, times litres per person per day, times days of access.
 */
export type D3Option = "metered" | "capacity" | "beneficiaries";

/** Full access (at home or nearby, all year) or limited access (for example a school). A project fact. */
export type AccessLevel = "full" | "limited";

/** Where a value came from. */
export type Origin =
  /** The user typed it. */
  | "entered"
  /** Filled in from a published source. The user's own local value replaces it. */
  | "default"
  /** Worked out from other values. */
  | "derived"
  /** Expected project performance. The user should set it to their planned project. */
  | "assumed";

/** The three kinds of value, plus the engine's own results. */
export type ValueKind = "project fact" | "method default" | "anticipated performance" | "result";

/** What a field shows while a project fact is missing. Never guessed. */
export const AWAITING = "awaiting user project input" as const;

export interface D3Input {
  view: D3View;
  option: D3Option;
  /** Project fact: water this supply gave each year before the project, in m³. 0 for a brand-new supply. */
  withoutProjectM3PerYear?: number;
  /** Project facts from the record: how many are served, and whether that counts people or households. */
  population?: {
    mode?: "people" | "households";
    served?: number;
    householdSize?: number;
  };
  /** Project fact: full or limited access. It chooses the per-person default. */
  accessLevel?: AccessLevel;
  /** "metered" only: the metered volume for the year, in m³. */
  meteredM3PerYear?: number;
  /** Project fact: the system's design delivery or pumping capacity, or its expected average flow, in m³ per hour. */
  flowM3PerHour?: number;
  /** Hours a year the system runs at that flow. Ex-ante: a slider. Ex-post: from operating logs. */
  operatingHoursPerYear?: number;
  /**
   * The user's own litres per person per day. It replaces the default. It needs its source: local data or a
   * national guideline (ex-ante), or monitoring (ex-post).
   */
  litresPerPersonPerDay?: { value: number; source: string };
  /** Days of access in the year. Ex-ante: a slider. Ex-post: from monitoring. */
  daysOfAccessPerYear?: number;
}

export type D3ValueKey =
  | "peopleServed"
  | "accessLevel"
  | "litresPerPersonPerDayDefault"
  | "litresPerPersonPerDay"
  | "daysOfAccessPerYear"
  | "flowM3PerHour"
  | "operatingHoursPerYear"
  | "supplyCapacityM3PerYear"
  | "beneficiaryVolumeM3PerYear"
  | "meteredM3PerYear"
  | "withProjectM3PerYear"
  | "withoutProjectM3PerYear"
  | "vwbM3PerYear";

/** One value, with where it came from. */
export interface D3Value {
  key: D3ValueKey;
  label: string;
  unit: string;
  kind: ValueKind;
  /** What the user typed, or the default, or the derived value. Null while it is awaited. */
  value: number | string | null;
  /** What the sum uses. Differs from `value` only when a cap was applied. Null while awaited. */
  used: number | string | null;
  /** Null while awaited. */
  origin: Origin | null;
  /** Where it came from: a citation, the project record, or the source the user gave. */
  source: string;
  /** Plain words. Present when a cap was applied or a value is awaited. */
  note?: string;
}

/** A slider in the ex-ante view. Its floor and ceiling each say where they came from. */
export interface D3Slider {
  key: "daysOfAccessPerYear" | "operatingHoursPerYear";
  label: string;
  unit: string;
  floor: number;
  floorSource: string;
  ceiling: number;
  ceilingSource: string;
  /** Where the slider starts: the value the engine used, or null when nothing is known yet. */
  start: number | null;
  /** "assumed" when it starts at a cited value; AWAITING when there is none. */
  startLabel: "assumed" | typeof AWAITING;
  startSource: string;
}

/** One line of the sum, in words, with its source. */
export interface D3Step {
  label: string;
  /** The sum in words, e.g. "people × litres per person per day × days ÷ 1,000". */
  how: string;
  value: number | null;
  unit: string;
  source: string;
}

export interface D3Result {
  method: "VWBA 2.0 D-3 Volume Provided";
  engineVersion: string;
  view: D3View;
  option: D3Option;
  values: D3Value[];
  steps: D3Step[];
  /** Ex-ante only. Empty in ex-post, where values are typed. */
  sliders: D3Slider[];
  /** Plain notes: caps applied, values held to their bounds. */
  notes: string[];
  /** The labels of every value still awaited. */
  awaiting: string[];
  /** What must be true of the project for D-3 to apply. The user confirms these; the engine does not. */
  conditions: string[];
  withProjectM3PerYear: number | null;
  /** The volumetric water benefit, m³ a year. Null until every value it needs is known. */
  vwbM3PerYear: number | null;
}
