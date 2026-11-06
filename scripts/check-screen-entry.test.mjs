// Tests for the screen-entry check: how it judges what was rendered, on invented markup only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, EXPECT, NAMES } from "./check-screen-entry.mjs";

const SLIDERS = 'aria-label="Anticipated performance"';
const goodRun = () => ({
  names: [...NAMES, "ReportHeading"],
  views: {
    exAnte: `<section ${SLIDERS}></section><span>Q_m — planned production / yr</span>`,
    exAnteFromSavedExPost: `<section ${SLIDERS}></section><span>Q_m — planned production / yr</span>`,
    exPost: "<span>Q_m — metered volume / yr</span>",
    exPostReport: '<div class="print-report">Ex-post</div>',
  },
  stylesheets: { "@waterbots/calvin/styles.css": true, "@waterbots/core/base.css": true },
  typeErrors: [],
});

test("every view as it should be: no problem", () => {
  assert.deepEqual(compare(goodRun()), []);
});

test("checks four views", () => {
  assert.deepEqual(Object.keys(EXPECT), ["exAnte", "exAnteFromSavedExPost", "exPost", "exPostReport"]);
});

test("a site locked to ex-ante that opens a saved ex-post analysis as ex-post is a problem", () => {
  const run = goodRun();
  run.views.exAnteFromSavedExPost = "<span>Q_m — metered volume / yr</span>";
  assert.deepEqual(compare(run), [
    `exAnteFromSavedExPost: missing ${SLIDERS}`,
    "exAnteFromSavedExPost: missing Q_m — planned production",
    "exAnteFromSavedExPost: should not show Q_m — metered volume",
  ]);
});

test("sliders on the ex-post view are a problem", () => {
  const run = goodRun();
  run.views.exPost += `<section ${SLIDERS}></section>`;
  assert.deepEqual(compare(run), [`exPost: should not show ${SLIDERS}`]);
});

test("a missing export, view, stylesheet or type check is a problem", () => {
  const run = goodRun();
  run.names = run.names.filter((n) => n !== "VersionTabs");
  delete run.views.exPostReport;
  run.stylesheets["@waterbots/core/base.css"] = false;
  delete run.typeErrors;
  assert.deepEqual(compare(run), [
    "the entry does not export VersionTabs",
    "exPostReport: nothing rendered",
    "stylesheet not found: @waterbots/core/base.css",
    "types: the types were not checked",
  ]);
});
