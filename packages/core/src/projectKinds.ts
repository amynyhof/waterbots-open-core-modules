/**
 * THE KINDS OF DRINKING-WATER PROJECT, AND THE ONE TABLE (decided by the maintainer on 2026-11-25).
 *
 * Nobody asks a visitor for a "kind", and no agent chooses one. The record holds a few plain project facts: the source,
 * the treatment and, when it matters, whether the water is safe. This file works out the kind from them. The same facts
 * always give the same kind, on both sites. K1 to K6 are our own names: a visitor never sees them.
 *
 * THE ONE TABLE says what Calvin does and what Violet does with each kind. The label list and the agent map read it. No
 * site keeps its own. Standards text is cited, never copied.
 *
 * It does no sums and calls no model.
 */
import type { Ask } from "./chat";
import type { ProjectFacts } from "./record";

/**
 * The version of these rules. A project keeps the version it was made under (`ProjectFacts.rules`), so an update never
 * changes a project that already exists. A project with none was made before them.
 */
export const PROJECT_RULES = 1 as const;

/** The first version that works the kind out from the facts. A later version does not move a project made under this one. */
export const KINDS_SINCE = 1 as const;

// ── The facts ────────────────────────────────────────────────────────────────────────────────────────────────────

/** Where the water comes from: a new source, one brought back after it had stopped, or one people already use. */
export const WATER_SOURCES = ["new", "restored", "existing"] as const;
export type WaterSource = (typeof WATER_SOURCES)[number];

/** Where the project treats the water. "more than one": in more than one of these places. */
export const TREATMENTS = ["none", "central", "homes", "institution", "more than one"] as const;
export type Treatment = (typeof TREATMENTS)[number];

/** The yes-or-no facts. Each is asked only when it applies. Unknown is left blank, as any missing fact is. */
export const YES_NO_FACTS = [
  /** The water at the source is safe to drink. */
  "sourceSafe",
  /** The source was out of action for at least three months before the work (carbon, 2026 version). */
  "outThreeMonths",
  /** There was already a plan to bring the source back (carbon, 2026 version). */
  "repairPlanned",
  /** For at least three months after it stopped, no maintenance or repair was planned (carbon, 2021 version). */
  "noRepairThreeMonths",
  /** The supply being treated is public piped water. */
  "publicPiped",
  /** The public piped water has been shown not to be safe to drink. */
  "pipedShownUnsafe",
] as const;
export type YesNoFact = (typeof YES_NO_FACTS)[number];

/** Every fact the kind, and what a calculator does with it, is worked out from. */
export const KIND_FACTS = ["waterSource", "treatment", ...YES_NO_FACTS] as const;
export type KindFact = (typeof KIND_FACTS)[number];

/** Those facts as a person gives them. */
export interface GivenKindFacts extends Partial<Record<YesNoFact, boolean>> {
  waterSource?: WaterSource;
  treatment?: Treatment;
}

/** The facts whose answer needs evidence later: the record's source note says so. */
export const NEEDS_EVIDENCE: readonly KindFact[] = ["outThreeMonths", "repairPlanned", "noRepairThreeMonths", "pipedShownUnsafe"];

/** The facts, as a JSON shape for an agent's answer or a tool. */
export const KIND_FACT_SCHEMA: Record<KindFact, Record<string, unknown>> = {
  waterSource: { type: "string", enum: [...WATER_SOURCES], description: "The source: new; restored, brought back after it had stopped; or existing, one people already use." },
  treatment: { type: "string", enum: [...TREATMENTS], description: "Where the project treats the water: none; central, at one central point; homes; institution, such as a school or a clinic; or more than one of these." },
  sourceSafe: { type: "boolean", description: "Whether the water at the source is safe to drink." },
  outThreeMonths: { type: "boolean", description: "A restored source: whether it was out of action for at least three months before the work." },
  repairPlanned: { type: "boolean", description: "A restored source: whether there was already a plan to bring it back." },
  noRepairThreeMonths: { type: "boolean", description: "A restored source in a project credited under V1.0: whether no maintenance or repair was planned for at least three months after it stopped." },
  publicPiped: { type: "boolean", description: "Treatment at one central point of a supply people already use: whether that supply is public piped water." },
  pipedShownUnsafe: { type: "boolean", description: "Public piped water: whether it has been shown not to be safe to drink." },
};

/** What each question is about, what it is for and where the answer usually comes from. The agent words it. */
export const KIND_ASKS: Record<KindFact | "homeUse", Ask> = {
  waterSource: {
    key: "waterSource",
    about: "whether the water comes from a new source, one that had stopped working and is brought back, or one people already use",
    why: "it says how the project is counted",
    from: "what the project builds or repairs",
    needed: true,
  },
  treatment: {
    key: "treatment",
    about: "whether the project treats the water and, if it does, where: at one central point, in homes, or at a school, clinic or other institution",
    why: "it says how the project is counted",
    from: "what the project builds or hands out",
    needed: true,
  },
  sourceSafe: { key: "sourceSafe", about: "whether the water at the source is safe to drink", why: "a supply with no treatment is counted only when its water is safe", from: "a water test at the source", needed: true },
  outThreeMonths: {
    key: "outThreeMonths",
    about: "whether the source had been out of action for at least three months before the work",
    why: "the method counts a restored source only then, and evidence will be needed later",
    from: "the repair log, or the people who use the source",
    needed: true,
  },
  repairPlanned: {
    key: "repairPlanned",
    about: "whether there was already a plan to bring the source back",
    why: "the method counts a restored source only when there was none, and evidence will be needed later",
    from: "the water office, or whoever owns the source",
    needed: true,
  },
  noRepairThreeMonths: {
    key: "noRepairThreeMonths",
    about: "whether no maintenance or repair was planned for at least three months after the source stopped",
    why: "the older version counts a restored source only then, and evidence will be needed later",
    from: "the project's V1.0 filing",
    needed: true,
  },
  publicPiped: { key: "publicPiped", about: "whether the supply being treated is public piped water", why: "public piped water is counted only when it has been shown not to be safe", from: "who runs the supply", needed: true },
  pipedShownUnsafe: {
    key: "pipedShownUnsafe",
    about: "whether the public piped water has been shown not to be safe to drink",
    why: "public piped water is counted only then, and evidence will be needed later",
    from: "water tests of the piped supply",
    needed: true,
  },
  homeUse: {
    key: "homeUse",
    about: "whether people use the water at home",
    why: "a new or alternative supply can also be reuse or irrigation, and only water people use at home is counted",
    from: "who the water is for, in the project's plan",
    needed: true,
  },
};

/** The question for an answer's one blank fact. A source whose water is not safe is asked where it will be treated. */
export function askFor(a: Extract<Answer, { says: "ask" }>): Ask {
  const ask = KIND_ASKS[a.fact];
  return a.fix
    ? { ...ask, about: "where the water will be treated, because the water at the source is not safe to drink: at one central point, in homes, or at a school, clinic or other institution", why: "a supply whose water is not safe is counted only with treatment" }
    : ask;
}

/** Keeps only the facts that hold: a word on its list, or a yes or no. */
export function readKindFacts(raw: unknown): GivenKindFacts {
  if (typeof raw !== "object" || raw === null) return {};
  const o = raw as Record<string, unknown>;
  const out: GivenKindFacts = {};
  const source = WATER_SOURCES.find((x) => x === o.waterSource);
  const treatment = TREATMENTS.find((x) => x === o.treatment);
  if (source !== undefined) out.waterSource = source;
  if (treatment !== undefined) out.treatment = treatment;
  for (const k of YES_NO_FACTS) if (typeof o[k] === "boolean") out[k] = o[k];
  return out;
}

/** The kind facts a record holds, as plain values. */
export function kindFactsOf(facts: ProjectFacts): GivenKindFacts {
  return readKindFacts(Object.fromEntries(KIND_FACTS.map((k) => [k, facts[k]?.value])));
}

/** Project facts that hold only these, under today's rules: for a tool or a place with no project record. */
export function factsWithKind(given: GivenKindFacts, by: "person" | "site intake" = "person"): ProjectFacts {
  const source = { by, note: "given" } as const;
  return { rules: PROJECT_RULES, ...Object.fromEntries(KIND_FACTS.flatMap((k) => (given[k] === undefined ? [] : [[k, { value: given[k], source }]]))) };
}

/** Each kind fact on the record, as a line an agent can read. */
export function knownKindFacts(facts: ProjectFacts): string[] {
  const f = kindFactsOf(facts);
  const out: string[] = [];
  if (f.waterSource !== undefined) out.push(`The source: ${{ new: "new", restored: "brought back after it had stopped", existing: "one people already use" }[f.waterSource]}`);
  if (f.treatment !== undefined) {
    out.push(`Treatment: ${{ none: "none", central: "at one central point", homes: "in homes", institution: "at an institution", "more than one": "in more than one kind of place" }[f.treatment]}`);
  }
  const said = (k: YesNoFact, words: string): void => {
    if (f[k] !== undefined) out.push(`${words}: ${f[k] ? "yes" : "no"}`);
  };
  said("sourceSafe", "The water at the source is safe to drink");
  said("outThreeMonths", "The source was out of action for at least three months before the work");
  said("repairPlanned", "There was already a plan to bring the source back");
  said("noRepairThreeMonths", "No repair was planned for at least three months after the source stopped");
  said("publicPiped", "The supply being treated is public piped water");
  said("pipedShownUnsafe", "The public piped water has been shown not to be safe");
  return out;
}

// ── The kind, worked out ─────────────────────────────────────────────────────────────────────────────────────────

export const KINDS = ["K1", "K2", "K3", "K4", "K5", "K6"] as const;
export type Kind = (typeof KINDS)[number];

export type WorkedOut =
  | { kind: Kind }
  /** One fact is missing. `could` are the kinds it could still be. */
  | { kind: null; missing: "waterSource" | "treatment" | "sourceSafe"; could: readonly Kind[] }
  /** The facts name no kind: two kinds at once, or improving a source that still works. */
  | { kind: null; none: "two kinds" | "improving a source" };

/** Works out the kind from the facts as they stand. */
export function workOutKind(f: GivenKindFacts): WorkedOut {
  if (f.waterSource === undefined) return { kind: null, missing: "waterSource", could: KINDS };
  if (f.waterSource === "restored") return f.treatment === undefined ? { kind: null, missing: "treatment", could: ["K3"] } : { kind: "K3" };
  if (f.treatment === undefined) return { kind: null, missing: "treatment", could: f.waterSource === "new" ? ["K1", "K2"] : ["K4", "K5", "K6"] };
  if (f.waterSource === "new") {
    if (f.treatment !== "none") return { kind: "K2" };
    if (f.sourceSafe === undefined) return { kind: null, missing: "sourceSafe", could: ["K1", "K2"] };
    return { kind: f.sourceSafe ? "K1" : "K2" };
  }
  switch (f.treatment) {
    case "central":
      return { kind: "K4" };
    case "institution":
      return { kind: "K5" };
    case "homes":
      return { kind: "K6" };
    case "more than one":
      return { kind: null, none: "two kinds" };
    case "none":
      return { kind: null, none: "improving a source" };
  }
}

// ── What a calculator does ───────────────────────────────────────────────────────────────────────────────────────

/** Why a project falls short of the method as it stands. */
export type Shortfall = "restored source, 2026 version" | "restored source, 2021 version" | "public piped water";

/** The carbon method's own class for a counted project, as a report names it. */
export type MethodClass = "CWS" | "CWS with CWT" | "CWT" | "HWT";

/** What a calculator does with a project. It carries no kind, so nothing a visitor sees can show one. */
export type Answer =
  /** A figure shows. `code` is the carbon method's: CWS runs Method 1, HWT runs Method 2. `as` is the method's own class. */
  | { says: "counted"; code?: "CWS" | "HWT"; as?: MethodClass }
  /** One fact decides it and is blank. `fix`: the water is not safe, so the project needs treatment. */
  | { says: "ask"; fact: KindFact | "homeUse"; fix?: true }
  /** WaterBots shows no figure until an open question is answered. */
  | { says: "held for now" }
  /** The standard has a method, and WaterBots has not built that type of project. */
  | { says: "not set up yet" }
  /** The method's own condition is not met as it stands. */
  | { says: "falls short"; because: Shortfall }
  /** Not a drinking-water project. */
  | { says: "another kind of project" };

/** The carbon method's versions. A new project gets 2026 only; one already credited under V1.0 gets both. */
export type CarbonVersion = "2021" | "2026";

export interface KindRow {
  kind: Kind;
  from: string;
  /** What Calvin does. The safe-water carbon method: 2021 version (V1.0), 2026 version (V2.0). */
  carbon: { answer: (f: GivenKindFacts, versions: readonly CarbonVersion[]) => Answer; code: "CWS" | "HWT" | null; source: string };
  /** What Violet does. VWBA 2.0, D-3. */
  water: { answer: Answer; source: string };
}

const CARBON = "The safe-water carbon method, 2021 version (sections 1 and 2.2.1, pp.3 to 5) and 2026 version (Table 2, pp.6 to 7; Table 3, p.9; section 3.2.6, p.11)";
const counted = (as: MethodClass): Answer => ({ says: "counted", code: as === "HWT" ? "HWT" : "CWS", as });
const NOT_SET_UP: Answer = { says: "not set up yet" };
const HELD: Answer = { says: "held for now" };

/** A supply whose water is not safe, or that is treated: by where the water is treated. */
function combined(f: GivenKindFacts): Answer {
  if (f.treatment === "central") return counted("CWS with CWT");
  return f.treatment === "none" || f.treatment === undefined ? { says: "ask", fact: "treatment", ...(f.treatment === "none" ? { fix: true as const } : {}) } : NOT_SET_UP;
}

/** A restored source: each version's own conditions, then whether the water is safe. */
function restored(f: GivenKindFacts, versions: readonly CarbonVersion[]): Answer {
  if (f.treatment !== "none" && f.treatment !== "central") return combined(f);
  if (versions.includes("2026")) {
    if (f.outThreeMonths === undefined) return { says: "ask", fact: "outThreeMonths" };
    if (!f.outThreeMonths) return { says: "falls short", because: "restored source, 2026 version" };
    if (f.repairPlanned === undefined) return { says: "ask", fact: "repairPlanned" };
    if (f.repairPlanned) return { says: "falls short", because: "restored source, 2026 version" };
  }
  if (versions.includes("2021")) {
    if (f.noRepairThreeMonths === undefined) return { says: "ask", fact: "noRepairThreeMonths" };
    if (!f.noRepairThreeMonths) return { says: "falls short", because: "restored source, 2021 version" };
  }
  if (f.sourceSafe === undefined) return { says: "ask", fact: "sourceSafe" };
  return f.sourceSafe && f.treatment === "none" ? counted("CWS") : combined(f);
}

/** Treatment at one central point of a supply people already use. */
function centralTreatment(f: GivenKindFacts): Answer {
  if (f.publicPiped === undefined) return { says: "ask", fact: "publicPiped" };
  if (!f.publicPiped) return counted("CWT");
  if (f.pipedShownUnsafe === undefined) return { says: "ask", fact: "pipedShownUnsafe" };
  return f.pipedShownUnsafe ? counted("CWT") : { says: "falls short", because: "public piped water" };
}

/** THE ONE TABLE. Built row by row from the maintainer's page of 2026-11-25. */
export const KIND_TABLE: readonly KindRow[] = [
  {
    kind: "K1",
    from: "A new source, no treatment, water safe to drink",
    carbon: { answer: () => counted("CWS"), code: "CWS", source: `${CARBON}. A community water supply, Method 1.` },
    water: { answer: { says: "counted" }, source: "VWBA 2.0, Appendix C, p.38; Appendix D, D-3, pp.44 to 46: new wells and piped systems." },
  },
  {
    kind: "K2",
    from: "A new source, with treatment",
    carbon: { answer: combined, code: "CWS", source: `${CARBON}. A community water supply combined with treatment. At one central point: Method 1.` },
    water: { answer: { says: "counted" }, source: "VWBA 2.0, Appendix D, D-3, pp.44 to 45: the new supply's water is counted." },
  },
  {
    kind: "K3",
    from: "A source brought back after it had stopped, with or without treatment",
    carbon: { answer: restored, code: "CWS", source: `${CARBON}. A community water supply, Method 1, when each version's own conditions are met.` },
    water: { answer: { says: "counted" }, source: "VWBA 2.0, Appendix C, p.38; Appendix D, D-3, pp.44 to 46. Taking off the water before the project is WaterBots' reading." },
  },
  {
    kind: "K4",
    from: "Treatment at one central point, of a supply people already use",
    carbon: { answer: centralTreatment, code: "CWS", source: `${CARBON}. Community water treatment, Method 1, treatment only included. Decided 2026-11-25.` },
    water: { answer: HELD, source: "WaterBots' choice. VWBA 2.0 (pp.18, 38, 44) gives no way to count treatment by itself." },
  },
  {
    kind: "K5",
    from: "Treatment at a school, clinic or other institution",
    carbon: { answer: () => NOT_SET_UP, code: null, source: `${CARBON}. Institutional water treatment, Method 2. The institution volumes and school days are not in the calculator.` },
    water: { answer: HELD, source: "WaterBots' choice. VWBA 2.0 (p.46) does not speak of treatment there with no new supply." },
  },
  {
    kind: "K6",
    from: "Treatment in people's homes",
    carbon: { answer: () => counted("HWT"), code: "HWT", source: `${CARBON}. Household water treatment, Method 2.` },
    water: { answer: HELD, source: "WaterBots' choice. VWBA 2.0 (pp.18, 38, 44) does not say how it is counted by itself." },
  },
];

/** One kind's row. */
export function kindRow(kind: Kind): KindRow {
  return KIND_TABLE.find((r) => r.kind === kind)!;
}

/** The versions in use: 2026 for every project, and 2021 too for one already credited under V1.0. */
export function carbonVersions(facts: Pick<ProjectFacts, "creditedUnderV1">): readonly CarbonVersion[] {
  return facts.creditedUnderV1?.value === true ? ["2026", "2021"] : ["2026"];
}

/** What Calvin does with these kind facts. Improving a source that still works is held: the method does not say. */
export function carbonAnswerFor(f: GivenKindFacts, versions: readonly CarbonVersion[]): Answer {
  const k = workOutKind(f);
  if (k.kind !== null) return kindRow(k.kind).carbon.answer(f, versions);
  if ("missing" in k) return { says: "ask", fact: k.missing };
  return k.none === "two kinds" ? NOT_SET_UP : HELD;
}

/**
 * What Violet does with these kind facts. Where every kind it could still be has one answer, the missing fact does not
 * matter: she does not ask whether the water is safe. The source and the treatment are always needed.
 */
export function waterAnswerFor(f: GivenKindFacts): Answer {
  const k = workOutKind(f);
  if (k.kind !== null) return kindRow(k.kind).water.answer;
  if ("none" in k) return HELD;
  return k.missing === "sourceSafe" ? kindRow(k.could[0]!).water.answer : { says: "ask", fact: k.missing };
}

// ── The words ────────────────────────────────────────────────────────────────────────────────────────────────────

/** What a visitor reads for another kind of project, one no calculator here covers (the maintainer's words, 2026-11-25). */
export const NO_CALCULATOR_YET =
  "We do not have a calculator for this kind of project yet. To ask for it to be added, contact WaterBots at hello@waterbots.ai.";

/** What a visitor reads when the project falls short of the method as it stands. */
export const SHORTFALL_WORDS: Record<Shortfall, string> = {
  "restored source, 2026 version": "The method counts a restored source only if it was out of action for at least three months before the work, and there was no plan to bring it back.",
  "restored source, 2021 version": "The older version of the method counts a restored source only if no maintenance or repair was planned for at least three months after it stopped.",
  "public piped water": "The method counts treatment of public piped water only if that water has been shown not to be safe to drink.",
};

/** The fact, lower case, so it drops into a sentence on a screen. */
export const FACT_LABEL: Record<KindFact | "homeUse", string> = {
  waterSource: "whether the source is new, restored or already in use",
  treatment: "where the water is treated, if it is treated",
  sourceSafe: "whether the water at the source is safe to drink",
  outThreeMonths: "whether the source was out of action for at least three months before the work",
  repairPlanned: "whether there was already a plan to bring the source back",
  noRepairThreeMonths: "whether no repair was planned for at least three months after the source stopped",
  publicPiped: "whether the supply is public piped water",
  pipedShownUnsafe: "whether the public piped water has been shown not to be safe to drink",
  homeUse: "whether people use the water at home",
};

/** What an agent is told when no figure shows. Facts, in our own words: "held for now" and "not set up yet" are ours. */
export function answerForAgent(a: Answer): string {
  switch (a.says) {
    case "counted":
      return "It is counted.";
    case "ask":
      return a.fix
        ? "The water is not safe to drink, so the project needs treatment, and where the water is treated has not been said."
        : `Still to be said: ${FACT_LABEL[a.fact]}.`;
    case "held for now":
      return `It is held for now: WaterBots shows no figure until an open question is answered. The visitor reads: "${NO_CALCULATOR_YET}"`;
    case "not set up yet":
      return `It is not set up yet: the standard has a method for it, and WaterBots has not built that type of project. The visitor reads: "${NO_CALCULATOR_YET}"`;
    case "falls short":
      return `As it stands, it falls short. The visitor reads: "${SHORTFALL_WORDS[a.because]}"`;
    case "another kind of project":
      return `It is another kind of project, not drinking water. The visitor reads: "${NO_CALCULATOR_YET}"`;
  }
}
