// The kinds of drinking-water project and the one table (decided by the maintainer on 2026-11-25). Every project is made up.
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { agentMap, noMethodFor, type MapInput } from "./agentMap";
import { NewerWay } from "./newerWay";
import {
  KIND_ASKS,
  KIND_FACTS,
  KIND_FACT_SCHEMA,
  KIND_TABLE,
  NO_CALCULATOR_YET,
  PROJECT_RULES,
  SHORTFALL_WORDS,
  TREATMENTS,
  WATER_SOURCES,
  YES_NO_FACTS,
  answerForAgent,
  askFor,
  carbonAnswerFor,
  factsWithKind,
  knownKindFacts,
  readKindFacts,
  waterAnswerFor,
  workOutKind,
  type Answer,
  type GivenKindFacts,
} from "./projectKinds";
import {
  NEWER_WAY_NOTE,
  addGivenFacts,
  addKindTicket,
  carbonAnswer,
  changeFacts,
  emptyRecord,
  kindTicket,
  needsHomeUse,
  newProjectRecord,
  newerWay,
  projectExists,
  recordCarbon,
  recordTechnology,
  recordWaterSupply,
  redoUnderTodaysRules,
  setAgentResults,
  underTodaysRules,
  waterAnswer,
  type HomeUse,
  type PathwayReading,
  type ProjectRecord,
  type ProjectTypeId,
} from "./record";
import { TECHNOLOGY_LABELS, technologyCode } from "./technologyLabels";

const by = { by: "person", note: "made up for a test" } as const;
const kind = (f: GivenKindFacts) => workOutKind(f).kind;
const carbon = (f: GivenKindFacts, v: readonly ("2021" | "2026")[] = ["2026"]): Answer => carbonAnswerFor(f, v);
const ask = (fact: string) => ({ says: "ask", fact });
const NEW: GivenKindFacts = { waterSource: "new" };
const RESTORED: GivenKindFacts = { waterSource: "restored" };
const EXISTING: GivenKindFacts = { waterSource: "existing" };
const DOWN: GivenKindFacts = { outThreeMonths: true, repairPlanned: false };

describe("section 1: the kind is worked out from the facts", () => {
  test.each([
    ["K1", { ...NEW, treatment: "none", sourceSafe: true }],
    ["K2", { ...NEW, treatment: "central" }],
    ["K2", { ...NEW, treatment: "homes" }],
    ["K2", { ...NEW, treatment: "institution" }],
    ["K2", { ...NEW, treatment: "none", sourceSafe: false }],
    ["K3", { ...RESTORED, treatment: "none" }],
    ["K3", { ...RESTORED, treatment: "central" }],
    ["K4", { ...EXISTING, treatment: "central" }],
    ["K5", { ...EXISTING, treatment: "institution" }],
    ["K6", { ...EXISTING, treatment: "homes" }],
  ] as [string, GivenKindFacts][])("%s", (k, f) => expect(kind(f)).toBe(k));
  test("one blank fact is named, and two things name no kind", () => {
    expect(workOutKind({})).toMatchObject({ missing: "waterSource" });
    for (const f of [NEW, RESTORED, EXISTING]) expect(workOutKind(f)).toMatchObject({ missing: "treatment" });
    expect(workOutKind({ ...NEW, treatment: "none" })).toMatchObject({ missing: "sourceSafe", could: ["K1", "K2"] });
    expect(workOutKind({ ...EXISTING, treatment: "more than one" })).toEqual({ kind: null, none: "two kinds" });
    expect(workOutKind({ ...EXISTING, treatment: "none" })).toEqual({ kind: null, none: "improving a source" });
  });
  test("the same facts always give the same kind, in any order, and the facts handed in are not changed", () => {
    for (const waterSource of WATER_SOURCES)
      for (const treatment of TREATMENTS)
        for (const sourceSafe of [true, false]) {
          const f = Object.freeze({ waterSource, treatment, sourceSafe });
          expect(workOutKind(f)).toEqual(workOutKind({ sourceSafe, treatment, waterSource }));
        }
  });
  test("each kind has one row, with a source for each side", () => {
    expect(KIND_TABLE.map((r) => r.kind)).toEqual(["K1", "K2", "K3", "K4", "K5", "K6"]);
    for (const r of KIND_TABLE) {
      expect(r.carbon.source).toContain("pp.3 to 5");
      expect(r.water.source).toMatch(/VWBA 2\.0/);
    }
  });
});

describe("section 2: what Calvin does", () => {
  test("K1: counted when the water is safe; blank, he asks", () => {
    expect(carbon({ ...NEW, treatment: "none", sourceSafe: true })).toEqual({ says: "counted", code: "CWS", as: "CWS" });
    expect(carbon({ ...NEW, treatment: "none" })).toEqual(ask("sourceSafe"));
  });
  test("not safe: the project needs treatment, and he asks where", () => {
    const a = carbon({ ...NEW, treatment: "none", sourceSafe: false });
    expect(a).toEqual({ says: "ask", fact: "treatment", fix: true });
    expect(a.says === "ask" && askFor(a).about).toContain("where the water will be treated");
  });
  test("K2: at one central point counted; in homes, at an institution or in more than one place, not set up yet", () => {
    expect(carbon({ ...NEW, treatment: "central" })).toEqual({ says: "counted", code: "CWS", as: "CWS with CWT" });
    for (const treatment of ["homes", "institution", "more than one"] as const) expect(carbon({ ...NEW, treatment })).toEqual({ says: "not set up yet" });
  });
  test("K3: the conditions of the version in use, then whether the water is safe", () => {
    const f: GivenKindFacts = { ...RESTORED, treatment: "none" };
    expect(carbon(f)).toEqual(ask("outThreeMonths"));
    expect(carbon({ ...f, outThreeMonths: true })).toEqual(ask("repairPlanned"));
    expect(carbon({ ...f, ...DOWN })).toEqual(ask("sourceSafe"));
    expect(carbon({ ...f, ...DOWN, sourceSafe: true })).toEqual({ says: "counted", code: "CWS", as: "CWS" });
    expect(carbon({ ...f, ...DOWN, sourceSafe: false })).toMatchObject({ says: "ask", fact: "treatment", fix: true });
    for (const bad of [{ outThreeMonths: false }, { outThreeMonths: true, repairPlanned: true }]) expect(carbon({ ...f, ...bad, sourceSafe: true })).toEqual({ says: "falls short", because: "restored source, 2026 version" });
    // Each version's own conditions.
    expect(carbon(f, ["2021"])).toEqual(ask("noRepairThreeMonths"));
    expect(carbon({ ...f, noRepairThreeMonths: true, sourceSafe: true }, ["2021"])).toMatchObject({ says: "counted" });
    expect(carbon({ ...f, noRepairThreeMonths: false, sourceSafe: true }, ["2021"])).toEqual({ says: "falls short", because: "restored source, 2021 version" });
    expect(carbon({ ...f, ...DOWN, sourceSafe: true }, ["2026", "2021"])).toEqual(ask("noRepairThreeMonths"));
  });
  test("K3 with treatment: at one central point counted, with the same questions; elsewhere not set up yet", () => {
    expect(carbon({ ...RESTORED, treatment: "central", ...DOWN })).toEqual(ask("sourceSafe"));
    for (const sourceSafe of [true, false]) expect(carbon({ ...RESTORED, treatment: "central", ...DOWN, sourceSafe })).toEqual({ says: "counted", code: "CWS", as: "CWS with CWT" });
    expect(carbon({ ...RESTORED, treatment: "homes" })).toEqual({ says: "not set up yet" });
  });
  test("K4: counted; public piped water only when it has been shown not to be safe", () => {
    const f: GivenKindFacts = { ...EXISTING, treatment: "central" };
    expect(carbon(f)).toEqual(ask("publicPiped"));
    expect(carbon({ ...f, publicPiped: false })).toEqual({ says: "counted", code: "CWS", as: "CWT" });
    expect(carbon({ ...f, publicPiped: true })).toEqual(ask("pipedShownUnsafe"));
    expect(carbon({ ...f, publicPiped: true, pipedShownUnsafe: true })).toMatchObject({ says: "counted", as: "CWT" });
    expect(carbon({ ...f, publicPiped: true, pipedShownUnsafe: false })).toEqual({ says: "falls short", because: "public piped water" });
  });
  test("K5 not set up yet, K6 counted by Method 2, two kinds not set up yet, improving a source held", () => {
    expect(carbon({ ...EXISTING, treatment: "institution" })).toEqual({ says: "not set up yet" });
    expect(carbon({ ...EXISTING, treatment: "homes" })).toEqual({ says: "counted", code: "HWT", as: "HWT" });
    expect(carbon({ ...EXISTING, treatment: "more than one" })).toEqual({ says: "not set up yet" });
    expect(carbon({ ...EXISTING, treatment: "none" })).toEqual({ says: "held for now" });
  });
});

describe("section 3: what Violet does", () => {
  test("a new or restored source is counted; treatment of a supply people use is held for now", () => {
    for (const f of [{ ...NEW, treatment: "central" }, { ...NEW, treatment: "homes" }, { ...RESTORED, treatment: "none" }] as GivenKindFacts[]) expect(waterAnswerFor(f)).toEqual({ says: "counted" });
    for (const treatment of ["central", "institution", "homes", "more than one", "none"] as const) expect(waterAnswerFor({ ...EXISTING, treatment })).toEqual({ says: "held for now" });
  });
  test("whether the water is safe does not matter to her; the source and the treatment do", () => {
    expect(waterAnswerFor({ ...NEW, treatment: "none" })).toEqual({ says: "counted" });
    expect(waterAnswerFor({})).toEqual(ask("waterSource"));
    expect(waterAnswerFor(NEW)).toEqual(ask("treatment"));
  });
});

/** A made-up new project with these facts, at home unless it says otherwise. */
function project(f: GivenKindFacts, more: { type?: ProjectTypeId; homeUse?: HomeUse; label?: string; creditedUnderV1?: boolean } = {}): ProjectRecord {
  const { label, type, homeUse, creditedUnderV1 } = more;
  return addGivenFacts(newProjectRecord(), "wellington", {
    ...f,
    ...(type !== undefined ? { type } : {}),
    ...(homeUse !== undefined ? { homeUse } : {}),
    ...(creditedUnderV1 !== undefined ? { creditedUnderV1 } : {}),
    ...(label !== undefined ? { technology: { label } } : {}),
    country: "XKX",
  }).record;
}

describe("a project's own record", () => {
  test("a label cannot change it", () => {
    for (const { label } of TECHNOLOGY_LABELS) {
      const r = project({ ...EXISTING, treatment: "homes" }, { label, homeUse: "yes" });
      expect(recordTechnology(r), label).toBe("HWT");
      expect(recordWaterSupply(r.facts), label).toBe("not covered yet");
    }
    expect(recordTechnology(project({}, { label: "Community water supply" }))).toBeUndefined();
  });
  test("home use: the drinking-water type or a community supply's label has said it; otherwise it is asked", () => {
    const f: GivenKindFacts = { ...NEW, treatment: "central" };
    expect(waterAnswer(project(f, { type: "C-19" }).facts)).toEqual({ says: "counted" });
    expect(waterAnswer(project(f, { label: "Community water supply" }).facts)).toEqual({ says: "counted" });
    for (const r of [project(f), project(f, { type: "C-11" })]) {
      expect(waterAnswer(r.facts)).toEqual(ask("homeUse"));
      expect(needsHomeUse(r.facts)).toBe(true);
    }
    expect(waterAnswer(project(f, { type: "C-11", homeUse: "yes" }).facts)).toEqual({ says: "counted" });
    expect(waterAnswer(project(f, { type: "C-11", homeUse: "no" }).facts)).toEqual({ says: "another kind of project" });
    expect(waterAnswer(project(f, { homeUse: "not sure" }).facts)).toEqual({ says: "held for now" });
    // Calvin asks only where it could be reuse or irrigation.
    expect(carbonAnswer(project(f).facts)).toMatchObject({ says: "counted" });
    expect(carbonAnswer(project(f, { type: "C-11" }).facts)).toEqual(ask("homeUse"));
  });
  test("another type is another kind of project, for both", () => {
    const { facts } = project({}, { type: "C-12" });
    expect([carbonAnswer(facts).says, waterAnswer(facts).says]).toEqual(["another kind of project", "another kind of project"]);
  });
  test("a project credited under V1.0 is asked for both versions' conditions", () => {
    const r = project({ ...RESTORED, treatment: "none", ...DOWN, sourceSafe: true }, { creditedUnderV1: true });
    expect(carbonAnswer(r.facts)).toEqual(ask("noRepairThreeMonths"));
    expect(carbonAnswer(r.facts, ["2026"])).toMatchObject({ says: "counted" });
  });
  test("the record notes where evidence will be needed", () => {
    const r = project({ ...RESTORED, ...DOWN, sourceSafe: true });
    expect(r.facts.outThreeMonths?.source.note).toBe("given to wellington; evidence will be needed");
    expect(r.facts.sourceSafe?.source.note).toBe("given to wellington");
  });
  test("only a value that holds is kept", () => {
    expect(readKindFacts({ waterSource: "well", treatment: "central", sourceSafe: "yes", publicPiped: false, K: 1 })).toEqual({ treatment: "central", publicPiped: false });
    expect(readKindFacts(null)).toEqual({});
    expect(addGivenFacts(newProjectRecord(), "wellington", { waterSource: "well" as never }).dropped).toEqual(["waterSource"]);
    expect(Object.keys(KIND_FACT_SCHEMA).sort()).toEqual([...KIND_FACTS].sort());
  });
});

const read = (reading: PathwayReading["reading"]): PathwayReading => ({ reading, reason: "made up", wouldChange: "made up", source: { by: "phoebe", note: "made up" } });
const map = (r: ProjectRecord, extra: Partial<MapInput> = {}) =>
  agentMap({ place: "free-site", record: { ...r, pathways: { carbon: read("likely"), vwba: read("likely") }, agents: { ...r.agents, bridget: { done: true } } }, reads: ["carbon", "vwba"], ...extra });
const called = (m: ReturnType<typeof agentMap>, a: string) => m.agents.find((x) => x.agent === a)!;

describe("the map", () => {
  test("one small question at a time, about one fact, and never a kind", () => {
    const m = agentMap({ place: "free-site", record: newProjectRecord() });
    expect(m.next).toEqual({ step: "gather facts", facts: ["waterSource", "treatment", "country"] });
    expect(m.ask).toEqual(KIND_ASKS.waterSource);
    const r = addGivenFacts(newProjectRecord(), "wellington", { waterSource: "new" }).record;
    expect(agentMap({ place: "free-site", record: r }).ask).toEqual(KIND_ASKS.treatment);
    expect(map(project({ ...NEW, treatment: "central" })).ask).toEqual(KIND_ASKS.homeUse);
    expect(map(project({ ...NEW, treatment: "central" }, { homeUse: "yes" })).ask).toBeNull();
  });
  test("a project that is not drinking water is not asked for a source", () => {
    expect(agentMap({ place: "free-site", record: project({}, { type: "C-12" }) }).next).toEqual({ step: "call", agent: "phoebe" });
  });
  test("Calvin: called where he counts, asks or shows how to fix it; not called where nothing can be counted yet", () => {
    for (const f of [{ ...NEW, treatment: "none" }, { ...NEW, treatment: "none", sourceSafe: false }, { ...EXISTING, treatment: "central", publicPiped: true, pipedShownUnsafe: false }] as GivenKindFacts[]) {
      expect(called(map(project(f, { homeUse: "yes" })), "calvin").called).toBe(true);
    }
    expect(called(map(project({ ...EXISTING, treatment: "institution" })), "calvin")).toMatchObject({ called: false, because: "not set up yet" });
    expect(called(map(project({ ...EXISTING, treatment: "none" })), "calvin")).toMatchObject({ called: false, because: "not covered yet" });
    expect(called(map(project({})), "calvin")).toMatchObject({ called: false, because: "waiting for basic facts" });
    expect(noMethodFor("carbon", project({ ...EXISTING, treatment: "central" }).facts)).toBeNull();
  });
  test("community level treatment: Calvin is called and Violet is not", () => {
    const m = map(project({ ...EXISTING, treatment: "central" }));
    expect(called(m, "calvin").called).toBe(true);
    expect(called(m, "violet")).toMatchObject({ called: false, because: "not covered yet" });
  });
});

describe("section 1b: an update never interrupts a project that already exists", () => {
  const old = (label: string, code?: "CWS" | "HWT"): ProjectRecord => {
    const r = emptyRecord();
    r.facts.technology = { label, ...(code ? { code } : {}), source: by };
    return r;
  };
  test("a site says so by handing back the record as it was saved", () => {
    const saved = JSON.parse(JSON.stringify(old("Community water supply", "CWS"))) as ProjectRecord;
    expect([projectExists(saved), underTodaysRules(saved.facts)]).toEqual([true, false]);
    expect([projectExists(newProjectRecord()), underTodaysRules(newProjectRecord().facts)]).toEqual([false, true]);
    expect(projectExists(emptyRecord())).toBe(false);
    // A figure with no technology on the record is a project too.
    expect(projectExists({ ...emptyRecord(), agents: { violet: { estimate: { figure: 1, unit: "m³ a year", method: "vwba-d3", engineVersion: "0" } } } })).toBe(true);
    expect(projectExists({ ...emptyRecord(), facts: { rules: PROJECT_RULES } })).toBe(false);
  });
  test("it keeps its answers, with no new question", () => {
    const r = old("Community water supply", "CWS");
    expect([recordTechnology(r), recordWaterSupply(r.facts), recordCarbon(r.facts)]).toEqual(["CWS", "covered", "covered"]);
    expect(map({ ...r, place: { country: { value: "XKX", source: by } } }).ask).toBeNull();
    expect(recordTechnology(old("Community level water treatment technologies", "CWS"))).toBe("CWS");
    expect(recordTechnology(old("Community level water treatment technologies"))).toBeUndefined();
  });
  test("nothing said in a chat changes its kind; its owner does, on the Project Record page", () => {
    const r = setAgentResults(old("Community water supply", "CWS"), "calvin", { estimate: { figure: 1, unit: "t", method: "carbon-v2.0", engineVersion: "0" } });
    const chat = changeFacts(r, "calvin", { waterSource: "existing", treatment: "homes" });
    expect([chat.onRecordPage, chat.changed, chat.figuresOff, chat.added]).toEqual([["waterSource", "treatment"], [], [], []]);
    expect(chat.record).toEqual(r);
    expect(addGivenFacts(r, "calvin", { waterSource: "new" }).dropped).toEqual(["waterSource"]);
    const owner = changeFacts(r, "wellington", { waterSource: "existing", treatment: "homes" }, { saved: true, by: "owner" });
    expect([recordTechnology(owner.record), owner.record.facts.rules, owner.figuresOff]).toEqual(["HWT", PROJECT_RULES, ["calvin"]]);
  });
  test("adding any other fact changes none of its answers", () => {
    const r = setAgentResults(old("A label nobody has sent yet"), "calvin", { estimate: { figure: 1, unit: "t", method: "carbon-v2.0", engineVersion: "0" } });
    const out = changeFacts(r, "violet", { homeUse: "yes", population: { served: 40 } });
    expect([out.figuresOff, out.record.agents.calvin?.estimate?.figure, out.record.facts.rules]).toEqual([[], 1, undefined]);
  });
  test("where today's rules would answer differently, a plain note and a choice to redo it", () => {
    const r = old("Community level water treatment technologies");
    expect([newerWay(r, "carbon"), newerWay(r, "vwba")]).toEqual([true, false]);
    for (const same of [old("Community water supply", "CWS"), old("Household water treatment", "HWT"), old("Institutional water treatment technologies"), newProjectRecord(), emptyRecord()]) expect(newerWay(same, "carbon")).toBe(false);
    const redone = redoUnderTodaysRules(r);
    expect([newerWay(redone, "carbon"), carbonAnswer(redone.facts)]).toEqual([false, ask("waterSource")]);
    expect(r.facts.rules).toBeUndefined();
    const html = renderToStaticMarkup(createElement(NewerWay, { onRedo: () => {} }));
    expect(html).toContain(NEWER_WAY_NOTE);
    expect(html).toContain("<button");
    expect(renderToStaticMarkup(createElement(NewerWay, { onRedo: () => {}, readOnly: true }))).not.toContain("<button");
    expect(renderToStaticMarkup(createElement(NewerWay, {}))).not.toContain("<button");
  });
  test("a blank record comes under today's rules with the first fact about its source, its type or its technology", () => {
    for (const given of [{ waterSource: "new" }, { type: "C-19" }, { technology: { label: "Community water supply" } }] as const) expect(addGivenFacts(emptyRecord(), "wellington", given).record.facts.rules).toBe(PROJECT_RULES);
    expect(addGivenFacts(emptyRecord(), "wellington", { country: "XKX" }).record.facts.rules).toBeUndefined();
  });
});

describe("section 5: when the visitor changes a fact in a screening", () => {
  const estimate = (method: string) => ({ figure: 9, unit: "made up", method, engineVersion: "0" });
  function screened(): ProjectRecord {
    let r = project({ ...NEW, treatment: "none", sourceSafe: true }, { homeUse: "yes" });
    r = addGivenFacts(r, "violet", { withoutProjectM3PerYear: 0 }).record;
    r = setAgentResults(r, "calvin", { estimate: estimate("carbon-v2.0"), inputs: { version: "paa" }, done: true });
    return setAgentResults(r, "violet", { estimate: estimate("vwba-d3"), done: true });
  }
  test("the record changes, the kind is worked out again, and a figure that no longer fits comes off", () => {
    const before = screened();
    const out = changeFacts(before, "bridget", { waterSource: "existing", treatment: "central" });
    expect([out.changed, out.figuresOff]).toEqual([["waterSource", "treatment"], ["calvin", "violet"]]);
    expect(out.record.agents.calvin).toEqual({ inputs: { version: "paa" }, done: false });
    expect(out.record.agents.violet?.estimate).toBeUndefined();
    expect(carbonAnswer(out.record.facts)).toEqual(ask("publicPiped"));
    expect(out.record.facts.waterSource?.source.note).toBe("changed in bridget's chat");
    // The record handed in is not changed.
    expect(before).toEqual(screened());
  });
  test("only the figure that no longer fits: Violet's stays when the water is found not to be safe", () => {
    const out = changeFacts(screened(), "calvin", { sourceSafe: false });
    expect(out.figuresOff).toEqual(["calvin"]);
    expect(out.record.agents.violet?.estimate?.figure).toBe(9);
  });
  test("a restored source is its own answer: the water before the project is asked again", () => {
    const out = changeFacts(screened(), "violet", { waterSource: "restored" });
    expect(out.figuresOff).toEqual(["calvin", "violet"]);
    expect(out.record.facts.withoutProjectM3PerYear).toBeUndefined();
    expect(recordWaterSupply(out.record.facts)).toBe("covered");
  });
  test("home use changes the same way", () => {
    const out = changeFacts(screened(), "violet", { homeUse: "no" });
    expect([out.changed, out.figuresOff]).toEqual([["homeUse"], ["calvin", "violet"]]);
    expect(changeFacts(screened(), "violet", { homeUse: "no" }, { saved: true }).onRecordPage).toEqual(["homeUse"]);
    expect(changeFacts(screened(), "violet", { homeUse: "maybe" as HomeUse }).changed).toEqual([]);
  });
  test("a later version of the rules does not move a project made under this one", () => {
    expect(underTodaysRules({ rules: 1 })).toBe(true);
    expect(underTodaysRules({ rules: 2 })).toBe(true);
    expect(underTodaysRules({ rules: 0 })).toBe(false);
  });
  test("said again, nothing changes", () => {
    const out = changeFacts(screened(), "calvin", { waterSource: "new", treatment: "none" });
    expect([out.changed, out.added, out.figuresOff]).toEqual([[], [], []]);
    expect(out.record).toEqual(screened());
  });
  test("on a saved project the owner changes it on the Project Record page; a blank fact is still filled", () => {
    const out = changeFacts(screened(), "calvin", { waterSource: "existing", publicPiped: true }, { saved: true });
    expect([out.onRecordPage, out.added, out.figuresOff]).toEqual([["waterSource"], ["publicPiped"], []]);
    expect(out.record.facts.waterSource?.value).toBe("new");
    expect(changeFacts(screened(), "wellington", { waterSource: "existing" }, { saved: true, by: "owner" }).record.facts.waterSource?.value).toBe("existing");
  });
});

describe("the save ticket", () => {
  test("the facts and their rules cross over, word for word", () => {
    const r = project({ ...RESTORED, treatment: "central", ...DOWN, sourceSafe: false });
    const ticket = JSON.parse(JSON.stringify(kindTicket(r))) as unknown;
    expect(ticket).toEqual({ rules: PROJECT_RULES, waterSource: "restored", treatment: "central", sourceSafe: false, outThreeMonths: true, repairPlanned: false });
    const saved = addKindTicket(emptyRecord(), ticket);
    expect(kindTicket(saved)).toEqual(ticket);
    expect(recordTechnology(saved)).toBe("CWS");
  });
  test("a project made before these rules stays that way, and only what holds is read", () => {
    expect(kindTicket(emptyRecord())).toEqual({});
    expect(addKindTicket(emptyRecord(), {}).facts.rules).toBeUndefined();
    for (const bad of [null, "x", { rules: "1" }, { rules: 99 }, { rules: 0.5 }, { waterSource: "well" }]) expect(addKindTicket(emptyRecord(), bad).facts).toEqual({});
    const r = project({ ...NEW });
    expect(addKindTicket(r, { waterSource: "existing" }).facts.waterSource?.value).toBe("new");
  });
});

describe("the words", () => {
  const every: Answer[] = [
    { says: "counted", code: "CWS", as: "CWT" },
    { says: "held for now" },
    { says: "not set up yet" },
    { says: "another kind of project" },
    ...[...KIND_FACTS, "homeUse" as const].map((fact) => ({ says: "ask" as const, fact })),
    { says: "ask", fact: "treatment", fix: true },
    ...(Object.keys(SHORTFALL_WORDS) as (keyof typeof SHORTFALL_WORDS)[]).map((because) => ({ says: "falls short" as const, because })),
  ];
  test("no visitor or agent sees one of our own labels, and nothing is ruled out or said not to exist", () => {
    const words = [...every.map(answerForAgent), ...Object.values(KIND_ASKS).flatMap((a) => [a.about, a.why, a.from]), JSON.stringify(KIND_FACT_SCHEMA), ...Object.values(SHORTFALL_WORDS), NEWER_WAY_NOTE, ...knownKindFacts(factsWithKind({ waterSource: "new", treatment: "more than one", ...Object.fromEntries(YES_NO_FACTS.map((k) => [k, true])) }))];
    for (const w of words) expect(w).not.toMatch(/\bK[1-6]\b|ruled out|no calculator exists|experts|new or restored/i);
  });
  test("held for now and not set up yet, each with its own meaning, and one sentence for the visitor", () => {
    expect(answerForAgent({ says: "held for now" })).toMatch(/until an open question is answered/);
    expect(answerForAgent({ says: "not set up yet" })).toMatch(/has a method for it, and WaterBots has not built/);
    for (const says of ["held for now", "not set up yet", "another kind of project"] as const) expect(answerForAgent({ says })).toContain(NO_CALCULATOR_YET);
  });
  test("every question says what it is for and where the answer comes from, and asks for one fact", () => {
    for (const [k, a] of Object.entries(KIND_ASKS)) expect([a.key, a.about !== "", a.why !== "", a.from !== "", a.needed]).toEqual([k, true, true, true, true]);
  });
  test("the label list reads the table", () => {
    expect(technologyCode("Community level water treatment technologies")).toBe("CWS");
    for (const t of TECHNOLOGY_LABELS) if (t.code !== undefined) expect(KIND_TABLE.find((r) => r.kind === t.kinds[0])!.carbon.code).toBe(t.code);
  });
});
