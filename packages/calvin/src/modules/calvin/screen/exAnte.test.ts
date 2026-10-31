// The ex-ante sliders (Road to v1, V3): their cited ends, the "assumed" and "entered" labels, the cap
// note, and the number the engine credits. Made-up projects only.
import { describe, expect, it } from "vitest";
import { computeScenario, fnrbAvailability } from "../engine";
import {
  applySlider, capNote, creditedValue, showSliders, sliderLabel, sliderSpecs, trackEnds, uncitedEnds,
  type SliderKey, type SliderSpec,
} from "./exAnte";
import { seedCalcState, toScenarioInput, type CalcState, type CalvinProject } from "./state";

const COUNTRY = "LSO"; // a country with an official fNRB; the project itself is invented
const invented =(technology: "CWS" | "HWT", analysis: CalvinProject["analysis"] = {}): CalvinProject => ({
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

describe("which sliders show", () => {
  it("the test country has an official fNRB", () => {
    expect(fnrbAvailability(COUNTRY).ok).toBe(true);
  });
  it("community supply: three sliders; household treatment adds usage", () => {
    expect(sliderSpecs(seedCalcState(invented("CWS"))).map((s) => s.key)).toEqual(["litres", "days", "testsPass"]);
    expect(sliderSpecs(seedCalcState(invented("HWT"))).map((s) => s.key)).toEqual(["litres", "days", "testsPass", "usage"]);
  });
  it("only when the site turns them on, and only on an ex-ante run", () => {
    expect(showSliders(true, { mode: "ex-ante" })).toBe(true);
    expect(showSliders(true, { mode: "ex-post" })).toBe(false);
    expect(showSliders(false, { mode: "ex-ante" })).toBe(false);
    expect(showSliders(undefined, { mode: "ex-ante" })).toBe(false);
  });
});

describe("the ends are the cited floor and ceiling", () => {
  for (const version of ["paa", "legacy"] as const) {
    for (const method of [1, 2] as const) {
      it(`${version}, method ${method}: every cited end has a source`, () => {
        for (const s of sliderSpecs({ version, method })) {
          for (const end of [s.floor, s.ceiling]) if (end) expect(end.source, s.key).toMatch(/V[12]\.0/);
        }
      });
    }
  }
  it("litres: ceiling 5.5, cited per version", () => {
    expect(spec(seedCalcState(invented("CWS")), "litres").ceiling).toEqual({ value: 5.5, source: "V2.0 Table 9, adult cap (§7.3.11, p.31)" });
    expect(sliderSpecs({ version: "legacy", method: 1 })[0]!.ceiling).toEqual({ value: 5.5, source: "V1.0 §3.6.6 (p.12)" });
  });
  it("days start at 365 and can only move down", () => {
    const s = seedCalcState(invented("HWT"));
    const d = spec(s, "days");
    expect(d.label).toBe("Days a year the device is in the home");
    expect(d.start.value).toBe(365);
    expect(trackEnds(d).max).toBe(365);
    expect(s.operationalDays).toBe(365);
  });
  it("shares run 0% to 100%; usage never reaches 0", () => {
    const s = seedCalcState(invented("HWT"));
    expect(trackEnds(spec(s, "testsPass"))).toEqual({ min: 0, max: 1 });
    expect(trackEnds(spec(s, "usage")).min).toBeGreaterThan(0);
    expect(trackEnds(spec(s, "usage")).max).toBe(1);
  });
  it("lists every end and start with no citation, for a ruling", () => {
    const keys = [...new Set(uncitedEnds().map((u) => `${u.key} ${u.what}`))].sort();
    expect(keys).toEqual(["days floor", "litres floor", "usage floor", "usage start"]);
  });
});

describe("assumed until moved, then entered", () => {
  it("every slider starts assumed at its cited value", () => {
    const s = seedCalcState(invented("HWT"));
    for (const x of sliderSpecs(s)) expect(sliderLabel(s, x.key), x.key).toBe("assumed");
    expect([s.litresPerPersonPerDay, s.operationalDays, s.waterQualityFactor, s.usageRate]).toEqual([4, 365, 1, 1]);
  });
  it("moving or typing makes it entered", () => {
    let s = seedCalcState(invented("HWT"));
    s = move(s, "litres", 3.5);
    s = move(s, "days", 300);
    s = move(s, "testsPass", 90);
    s = move(s, "usage", 80);
    for (const key of ["litres", "days", "testsPass", "usage"] as const) expect(sliderLabel(s, key), key).toBe("entered");
    expect([s.litresPerPersonPerDay, s.operationalDays, s.waterQualityFactor, s.usageRate]).toEqual([3.5, 300, 0.9, 0.8]);
  });
  it("a saved analysis keeps entered and typed values", () => {
    const s = move(seedCalcState(invented("HWT")), "days", 400);
    const again = seedCalcState(invented("HWT", { slidersEntered: s.slidersEntered, slidersTyped: s.slidersTyped, operationalDays: s.operationalDays }));
    expect(sliderLabel(again, "days")).toBe("entered");
    expect(capNote(again, spec(again, "days"))).not.toBeNull();
  });
});

describe("a typed value past a cited end caps the credit", () => {
  it("days typed above 365: the engine gets 365 and the row says it is capped", () => {
    const s = move(seedCalcState(invented("CWS")), "days", 400);
    expect(s.operationalDays).toBe(365);
    expect(capNote(s, spec(s, "days"))).toBe("You typed 400 d. The credit is capped at 365 d (V2.0 SDWS 32: days in the year).");
    expect(creditedValue(s, run(s), "days")).toBe(365);
  });
  it("litres typed above 5.5: capped at 5.5, and the engine credits 5.5", () => {
    const s = move(seedCalcState(invented("CWS")), "litres", 7);
    expect(capNote(s, spec(s, "litres"))).toMatch(/^You typed 7\.00 L\. The credit is capped at 5\.50 L/);
    expect(run(s).qpwEffective).toBe(5.5);
  });
  it("tests passing typed above 100%: capped at 100%", () => {
    const s = move(seedCalcState(invented("CWS")), "testsPass", 120);
    expect(s.waterQualityFactor).toBe(1);
    expect(capNote(s, spec(s, "testsPass"))).toMatch(/^You typed 120%\. The credit is capped at 100%/);
  });
  it("a value back inside the ends clears the note", () => {
    let s = move(seedCalcState(invented("CWS")), "days", 400);
    s = move(s, "days", 300);
    expect(capNote(s, spec(s, "days"))).toBeNull();
  });
  it("below an uncited floor nothing is capped: the value stands", () => {
    const s = move(seedCalcState(invented("CWS")), "litres", 1);
    expect(s.litresPerPersonPerDay).toBe(1);
    expect(capNote(s, spec(s, "litres"))).toBeNull();
  });
  it("usage of 0 is refused, and the value in force does not change", () => {
    const s = seedCalcState(invented("HWT"));
    expect(applySlider(s, spec(s, "usage"), 0)).toEqual({ ok: false, reason: "The share of homes using the device can't be 0." });
  });
});

describe("the number shown is the one the engine credits", () => {
  it("litres on a V2.0 run with no entered volume: the engine's age-weighted volume, not the starting 4.0", () => {
    const s = seedCalcState(invented("HWT"));
    const r = run(s);
    expect(r.volumeBasis).toBe("table9");
    expect(creditedValue(s, r, "litres")).toBe(r.qpwEffective);
    expect(r.qpwEffective).not.toBe(4);
  });
  it("every slider's credited number matches what the engine used", () => {
    const s = move(move(move(move(seedCalcState(invented("HWT")), "litres", 3.2), "days", 200), "testsPass", 85), "usage", 70);
    const r = run(s);
    const input = toScenarioInput(s);
    expect(creditedValue(s, r, "litres")).toBe(r.qpwEffective);
    expect(creditedValue(s, r, "days")).toBe(input.operationalDays);
    expect(creditedValue(s, r, "testsPass")).toBe(input.M_qy);
    expect(creditedValue(s, r, "usage")).toBe(input.usageRate);
    expect([r.qpwEffective, input.operationalDays, input.M_qy, input.usageRate]).toEqual([3.2, 200, 0.85, 0.7]);
  });
});
