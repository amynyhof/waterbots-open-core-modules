// Tests for the engine-entry check's comparison, on invented inputs only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { compare } from "./check-engine-entry.mjs";

const doc = {
  engineVersion: "9.9.9",
  cases: [{ id: "invented-a", outputs: { x: 1.5, y: 2 } }],
  fnrbCases: [{ id: "invented-f", outputs: { refused: true, message: "no value" } }],
};
const goodRun = () => ({
  react: "ERR_MODULE_NOT_FOUND",
  importsSomething: false,
  results: {
    engineVersion: "9.9.9",
    cases: { "invented-a": { held: [], outputs: { x: 1.5, y: 2 } } },
    fnrbCases: { "invented-f": { refused: true, message: "no value" } },
  },
});

test("all match: every check counted, no problem", () => {
  assert.deepEqual(compare(doc, goodRun()), { checks: 3, matched: 3, problems: [] });
});

test("a different output is a problem, named by case only", () => {
  const run = goodRun();
  run.results.cases["invented-a"].outputs.y = 2.0000001;
  const r = compare(doc, run);
  assert.equal(r.matched, 2);
  assert.deepEqual(r.problems, ["invented-a: differs"]);
});

test("a held baseline edit is a problem", () => {
  const run = goodRun();
  run.results.cases["invented-a"].held = ["wood"];
  assert.deepEqual(compare(doc, run).problems, ["invented-a: differs"]);
});

test("a missing case is a problem", () => {
  const run = goodRun();
  delete run.results.fnrbCases["invented-f"];
  assert.deepEqual(compare(doc, run).problems, ["invented-f: differs"]);
});

test("React found where the entry was installed is a problem", () => {
  const run = goodRun();
  run.react = "found";
  assert.deepEqual(compare(doc, run).problems, ["React could be found where the entry was installed"]);
});

test("a built entry that imports another file is a problem", () => {
  const run = goodRun();
  run.importsSomething = true;
  assert.deepEqual(compare(doc, run).problems, ["the built entry imports another file"]);
});
