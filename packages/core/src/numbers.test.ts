// Numbers as a person writes them, and the guards on an agent's numbers (2026-11-25). Every message is made up.
import { describe, expect, test } from "vitest";
import { askedOutOfRange, checkAnswerNumbers, returnToAgent, takenOut, type AnswerNumber } from "./numberGuard";
import { readNumbers, sameNumber } from "./numbers";

const first = (text: string): number[] => readNumbers(text).map((n) => n.readings[0]!);
const any = (text: string): number[] => readNumbers(text).flatMap((n) => n.readings);

describe("reading", () => {
  test.each([
    ["1200 people", 1200],
    ["1,200 people", 1200],
    ["1 200 people", 1200],
    ["1 200 people", 1200],
    ["1'200 people", 1200],
    ["1,234,567", 1234567],
    ["1.234.567", 1234567],
    ["12,34,567", 1234567],
    ["1,234.5 m³", 1234.5],
    ["1.234,5 m³", 1234.5],
    ["4,6 people in a home", 4.6],
    ["4.625", 4.625],
    ["0,125", 0.125],
    ["2k", 2000],
    ["2.5 thousand", 2500],
    ["about 3 million litres", 3000000],
    ["2 lakh", 200000],
    ["3 hundred thousand", 300000],
    ["5L a day", 5],
    ["-5", -5],
    ["minus 5", -5],
    ["80%", 80],
    ["80 percent", 80],
    ["twelve hundred", 1200],
    ["one thousand two hundred", 1200],
    ["two thousand five hundred and twenty-five", 2525],
    ["a hundred homes", 100],
    ["one hundred and twenty", 120],
    ["two and a half thousand", 2500],
    ["half a million", 500000],
    ["four point six", 4.6],
    ["a dozen schools", 12],
    ["zero", 0],
    ["eighty percent", 80],
    ["minus five", -5],
    ["three hundred thousand", 300000],
  ])("%s", (text, n) => expect(first(text)[0]).toBe(n));

  test("a number that can be read two ways keeps both", () => {
    expect(any("1,200")).toEqual([1200, 1.2]);
    expect(any("1.200")).toEqual([1.2, 1200]);
    expect(any("80%")).toEqual([80, 0.8]);
    expect(any("12 500").sort((a, b) => a - b)).toEqual([12, 500, 12500]);
  });
  test("several numbers, in order, and none from a name or an ordinal", () => {
    expect(first("300 homes, with five people in each")).toEqual([300, 5]);
    expect(first("We filed under V2 and CO2 counts. It is the 3rd phase.")).toEqual([]);
    expect(first("no numbers here, and a half day")).not.toContain(0);
    expect(first("5-6 people")).toEqual([5, 6]);
    expect(first("")).toEqual([]);
  });
  test("stray decimals do not matter", () => {
    expect(first("4.6 thousand")).toEqual([4600]);
    expect([sameNumber(0.1 + 0.2, 0.3), sameNumber(0, 0), sameNumber(1, 1.001)]).toEqual([true, true, false]);
  });
});

const n = (value: number, more: Partial<AnswerNumber> = {}): AnswerNumber => ({ id: "served", name: "People served", value, ...more });
const check = (numbers: AnswerNumber[], messages: string[], asked?: string) => checkAnswerNumbers(numbers, { messages, asked });

describe("the guard", () => {
  test("a number is kept only if it is in the visitor's own messages, any of them", () => {
    expect(check([n(1200)], ["It serves 1,200 people.", "Yes."]).kept).toEqual(["served"]);
    expect(check([n(1200)], ["It serves a village."]).faults).toEqual([n(1200)]);
    expect(check([n(1200)], []).faults).toHaveLength(1);
  });
  test("one equal to what the screen holds is dropped with no fault", () => {
    expect(check([n(1200, { held: 1200 })], ["Yes."])).toEqual({ kept: [], held: ["served"], faults: [] });
    expect(check([n(1200, { held: null })], ["Yes."]).faults).toHaveLength(1);
  });
  test("a zero is taken from none or brand-new, only as the answer to that question", () => {
    const zero = n(0, { id: "without", ask: "without" });
    for (const said of ["None.", "It is brand-new.", "brand new", "0", "zero", "There was nothing before."]) expect(check([zero], [said], "without").kept, said).toEqual(["without"]);
    expect(check([zero], ["None."], "served").faults).toHaveLength(1);
    expect(check([zero], ["None.", "It has a hand pump."], "without").faults).toHaveLength(1);
    expect(check([zero], ["None."]).faults).toHaveLength(1);
  });
  test("a share, as a percent, as words or as a plain number", () => {
    for (const said of ["80%", "eighty percent", "0.8", "about 80", "0,8"]) expect(check([n(0.8, { share: true })], [said]).kept, said).toEqual(["served"]);
    expect(check([n(0.8)], ["about 80"]).faults).toHaveLength(1);
  });
  test("it goes back to the agent once, naming what did not pass; then the visitor is told", () => {
    const { faults } = check([n(1200), n(5, { id: "size", name: "People per household" })], ["It serves a village."]);
    expect(returnToAgent(faults)).toContain("People served 1200; People per household 5");
    expect(takenOut(faults)).toBe("People served and People per household: not filled in, because the number is not in your messages. Please type it again.");
    expect([returnToAgent([]), takenOut([])]).toEqual([null, null]);
  });
});

describe("out of range, for the fact just asked", () => {
  test("it shows from the visitor's own words", () => {
    expect(askedOutOfRange("daysOfAccess", "about 400 days")).toBe("Days of access must be between 0 and 365.");
    expect(askedOutOfRange("daysOfAccess", "1,200")).toBe("Days of access must be between 0 and 365.");
    expect(askedOutOfRange("population.served", "minus five", { name: "Households served" })).toBe("Households served must be a whole number, 1 or more.");
    expect(askedOutOfRange("usageRate", "120%")).toBe("Usage rate must be between 0 and 1.");
  });
  test("it does not show when a number could be the answer, or there is none", () => {
    expect(askedOutOfRange("daysOfAccess", "365 days, and 1,200 people")).toBeNull();
    expect(askedOutOfRange("usageRate", "about 80")).toBeNull();
    expect(askedOutOfRange("usageRate", "0.8")).toBeNull();
    expect(askedOutOfRange("daysOfAccess", "I do not know")).toBeNull();
  });
});
