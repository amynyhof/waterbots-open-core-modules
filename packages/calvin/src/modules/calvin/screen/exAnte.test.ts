// The ex-ante sliders (Road to v1, V3): their ends, the "assumed" and "entered" labels, the notes,
// and the number the engine credits. Made-up projects only.
import { describe, expect, it } from "vitest";
import { computeScenario, fnrbAvailability } from "../engine";
import {
  applySlider, capNote, creditedIfDifferent, creditedValue, endLabel, showSliders, sliderLabel, sliderNotes,
  sliderSpecs, startsWithoutSource, withSliderStarts, type SliderKey, type SliderSpec,
} from "./exAnte";
import { seedCalcState, toScenarioInput, type CalcState, type CalvinProject } from "./state";

const COUNTRY = "LSO"; // a country with an official fNRB; the project itself is invented
const invented = (technology: "CWS" | "HWT", analysis: CalvinProject["analysis"] = {}): CalvinProject => ({
  name: "Invented test project",
  standards: [],
  technology,
  country: COUNTRY,
  population: { mode: "people", served: 1200 },
  analysis,
});
const spec = (s: CalcState, key: SliderKey): SliderSpec => sliderSpecs(s).find((x) => x.key === key)!;
const move = (s: CalcState, key: SliderKey, display: number): CalcState => {
  const c = applySlider(s, spec(s, key), display);
  if (!c.ok) throw new Error(c.reason);
  return { ...s, ...c.patch };
};
const run = (s: CalcState) => computeScenario(toScenarioInput(s));
const cws = () => seedCalcState(invented("CWS"));
const hwt = () => seedCalcState(invented("HWT"));

describe("which sliders show", () => {
  it("the test country has an official fNRB", () => {
    expect(fnrbAvailability(COUNTRY).ok).toBe(true);
  });
  it("community systems: water, days of operation, tests; no usage slider", () => {
    expect(sliderSpecs(cws()).map((s) => s.key)).toEqual(["litres", "days", "testsPass"]);
    expect(spec(cws(), "days").label).toBe("Days of operation a year");
  });
  it("household treatment: adds the share of homes using the device", () => {
    expect(sliderSpecs(hwt()).map((s) => s.key)).toEqual(["litres", "days", "testsPass", "usage"]);
    expect(spec(hwt(), "days").label).toBe("Days a year the device is in the home");
  });
  it("only when the site turns them on, and only on an ex-ante run", () => {
    expect(showSliders(true, { mode: "ex-ante" })).toBe(true);
    expect(showSliders(true, { mode: "ex-post" })).toBe(false);
    expect(showSliders(false, { mode: "ex-ante" })).toBe(false);
    expect(showSliders(undefined, { mode: "ex-ante" })).toBe(false);
  });
});

describe("the ends", () => {
  it("litres: cited ceiling per version; the floor is just 0, with no note", () => {
    const l = spec(cws(), "litres");
    expect(l.ceiling).toEqual({ value: 5.5, kind: "cited", source: "V2.0 Table 9, adult cap (§7.3.11, p.31)" });
    expect(sliderSpecs({ version: "legacy", method: 1 })[0]!.ceiling.source).toBe("V1.0 §3.6.6 (p.12)");
    expect(l.floor).toEqual({ value: 0, kind: "open" });
    expect(endLabel(l, l.floor)).toBe("0.00 L");
  });
  it("days: the year is a natural limit; the floor is just 0", () => {
    const d = spec(hwt(), "days");
    expect(endLabel(d, d.ceiling)).toBe("365 d · natural limit: the days in a year");
    expect(endLabel(d, d.floor)).toBe("0 d");
  });
  it("shares: 0% and 100% are natural limits; usage stops one step above 0", () => {
    const t = spec(hwt(), "testsPass");
    expect(endLabel(t, t.floor)).toBe("0% · natural limit: a share");
    expect(endLabel(t, t.ceiling)).toBe("100% · natural limit: a share");
    const u = spec(hwt(), "usage");
    expect(endLabel(u, u.floor)).toBe("1% · natural limit: a share, never 0");
  });
  it("community days start at 347, with its source; with sliders on, the seat starts there too", () => {
    expect(spec(cws(), "days").start).toEqual({ value: 347, source: "V2.0 SDWS 32; V1.0 SDWS 27" });
    const s = withSliderStarts(cws(), {}, true);
    expect(s.operationalDays).toBe(347);
    expect(sliderNotes(s, spec(s, "days"))).toEqual([]);
    expect(creditedValue(s, run(s), "days")).toBe(347);
  });
  it("the 347 start applies only with sliders on, and never over a saved value", () => {
    expect(withSliderStarts(cws(), {}, false).operationalDays).toBe(365);
    expect(withSliderStarts({ ...cws(), mode: "ex-post" }, {}, true).operationalDays).toBe(365);
    const saved = seedCalcState(invented("CWS", { operationalDays: 300 }));
    expect(withSliderStarts(saved, { operationalDays: 300 }, true).operationalDays).toBe(300);
  });
  it("household days start at 365 and can only move down", () => {
    expect(withSliderStarts(hwt(), {}, true).operationalDays).toBe(365);
    expect(spec(hwt(), "days").start).toEqual({ value: 365, source: "natural limit: the days in a year" });
    const s = hwt();
    expect(spec(s, "days").start.value).toBe(365);
    expect(spec(s, "days").ceiling.value).toBe(365);
    expect(s.operationalDays).toBe(365);
  });
});

describe("starting values", () => {
  it("every slider starts assumed at its starting value", () => {
    const s = hwt();
    for (const x of sliderSpecs(s)) expect(sliderLabel(s, x.key), x.key).toBe("assumed");
    expect([s.litresPerPersonPerDay, s.operationalDays, s.waterQualityFactor, s.usageRate]).toEqual([4, 365, 1, 1]);
  });
  it("lists every start with no source yet, for the plan", () => {
    expect([...new Set(startsWithoutSource().map((u) => u.key))]).toEqual(["usage"]);
    expect(spec(hwt(), "usage").start.source).toBeNull();
  });
  it("moving or typing makes it entered", () => {
    let s = hwt();
    s = move(s, "litres", 3.5);
    s = move(s, "days", 300);
    s = move(s, "testsPass", 90);
    s = move(s, "usage", 80);
    for (const key of ["litres", "days", "testsPass", "usage"] as const) expect(sliderLabel(s, key), key).toBe("entered");
    expect([s.litresPerPersonPerDay, s.operationalDays, s.waterQualityFactor, s.usageRate]).toEqual([3.5, 300, 0.9, 0.8]);
  });
  it("a saved analysis keeps entered and typed values", () => {
    const s = move(hwt(), "days", 400);
    const again = seedCalcState(invented("HWT", { slidersEntered: s.slidersEntered, slidersTyped: s.slidersTyped, operationalDays: s.operationalDays }));
    expect(sliderLabel(again, "days")).toBe("entered");
    expect(capNote(again, spec(again, "days"))).not.toBeNull();
  });
});

describe("a typed value stays within the ends", () => {
  it("days typed above 365: the engine gets 365 and the row says it is capped", () => {
    const s = move(cws(), "days", 400);
    expect(s.operationalDays).toBe(365);
    expect(capNote(s, spec(s, "days"))).toBe("You typed 400 d. The credit is capped at 365 d (natural limit: the days in a year).");
    expect(creditedValue(s, run(s), "days")).toBe(365);
  });
  it("litres typed above 5.5: capped at 5.5, and the engine credits 5.5", () => {
    const s = move(cws(), "litres", 7);
    expect(capNote(s, spec(s, "litres"))).toMatch(/^You typed 7\.00 L\. The credit is capped at 5\.50 L/);
    expect(run(s).qpwEffective).toBe(5.5);
  });
  it("tests passing typed above 100%: capped at 100%", () => {
    const s = move(cws(), "testsPass", 120);
    expect(s.waterQualityFactor).toBe(1);
    expect(capNote(s, spec(s, "testsPass"))).toMatch(/^You typed 120%\. The credit is capped at 100%/);
  });
  it("a value back inside the ends clears the cap note", () => {
    const s = move(move(cws(), "days", 400), "days", 300);
    expect(capNote(s, spec(s, "days"))).toBeNull();
  });
  it("0 is allowed where no floor is cited; below 0 is refused", () => {
    expect(move(cws(), "litres", 0).litresPerPersonPerDay).toBe(0);
    expect(applySlider(cws(), spec(cws(), "days"), -1)).toEqual({ ok: false, reason: "This value can't be below 0 d." });
  });
  it("usage of 0 is refused, and the value in force does not change", () => {
    const s = hwt();
    expect(applySlider(s, spec(s, "usage"), 0)).toEqual({ ok: false, reason: "The share of homes using the device can't be 0." });
  });
});

describe("notes", () => {
  it("community days above 347 need an operation sensor", () => {
    const sensor = "Over 347 days requires an operation sensor (V2.0 SDWS 32; V1.0 SDWS 27).";
    expect(sliderNotes(cws(), spec(cws(), "days"))).toEqual([sensor]);
    const s = move(cws(), "days", 347);
    expect(sliderNotes(s, spec(s, "days"))).toEqual([]);
    expect(sliderNotes(hwt(), spec(hwt(), "days"))).toEqual([]);
  });
  it("tests passing below the V2.0 §7.4.3 line: which years it falls short in", () => {
    const note = (pct: number) => {
      const s = move(cws(), "testsPass", pct);
      return sliderNotes(s, spec(s, "testsPass"))[0] ?? null;
    };
    expect(note(90)).toBeNull();
    expect(note(89)).toMatch(/^Below the corrective-action line from year 3 \(V2\.0 §7\.4\.3/);
    expect(note(84)).toMatch(/^Below the corrective-action line from year 2 /);
    expect(note(79)).toMatch(/^Below the corrective-action line in every year /);
    expect(note(79)).toContain("A corrective action plan is required. If the next tests don't improve, crediting is suspended.");
  });
  it("the corrective-action note is a V2.0 rule: none on a V1.0 run", () => {
    const s = move({ ...cws(), version: "legacy" }, "testsPass", 50);
    expect(sliderNotes(s, spec(s, "testsPass"))).toEqual([]);
  });
});

describe("the number the engine credits", () => {
  it("litres on a V2.0 run with no entered volume: shown, because the engine's age-weighted volume differs", () => {
    const s = hwt();
    const r = run(s);
    expect(r.volumeBasis).toBe("table9");
    expect(creditedValue(s, r, "litres")).toBe(r.qpwEffective);
    expect(creditedIfDifferent(s, r, spec(s, "litres"))).not.toBeNull();
  });
  it("not shown when it is the value set", () => {
    const s = move(move(hwt(), "litres", 3.2), "days", 200);
    const r = run(s);
    for (const x of sliderSpecs(s)) expect(creditedIfDifferent(s, r, x), x.key).toBeNull();
  });
  it("every slider's credited number matches what the engine used", () => {
    const s = move(move(move(move(hwt(), "litres", 3.2), "days", 200), "testsPass", 85), "usage", 70);
    const r = run(s);
    const input = toScenarioInput(s);
    expect([creditedValue(s, r, "litres"), creditedValue(s, r, "days"), creditedValue(s, r, "testsPass"), creditedValue(s, r, "usage")])
      .toEqual([r.qpwEffective, input.operationalDays, input.M_qy, input.usageRate]);
    expect([r.qpwEffective, input.operationalDays, input.M_qy, input.usageRate]).toEqual([3.2, 200, 0.85, 0.7]);
  });
});
