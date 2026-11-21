// Tests for the screen-entry check: how it judges what was rendered, on invented markup only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { compare, EXPECT, FILED_ASK, MONITORING_ASK, NAMES, PACKAGE_DAF, SITE_DAF, SITE_SOURCE, V2_ONLY } from "./check-screen-entry.mjs";

const SLIDERS = 'aria-label="Anticipated performance"';
const goodRun = () => ({
  names: [...NAMES, "ReportHeading"],
  views: {
    exAnte: `<section ${SLIDERS}></section><span>How much water will the system produce in a year?</span>`,
    exAnteFromSavedExPost: `<section ${SLIDERS}></section><span>How much water will the system produce in a year?</span>`,
    exPostNeedsMonitoring: `<section>${MONITORING_ASK}<span data-needed-dot=""></span></section>`,
    exPost: `<span>Q_m — metered volume / yr</span><span>${PACKAGE_DAF}</span><p>From the operation log or sensor (V2.0 SDWS 32)</p>`,
    exPostReport: '<div class="print-report">Ex-post</div>',
    siteTable: `<span>Q_m — metered volume / yr</span><span>${SITE_DAF}</span><span>${SITE_SOURCE}</span>`,
    siteTableReport: `<div class="print-report">${SITE_DAF} ${SITE_SOURCE}</div>`,
    newProject: `<div ${V2_ONLY}>PAA v2.0</div>`,
    newProjectReport: '<div class="print-report">PAA V2.0 Report · PAA V2.0 Emission Reductions</div>',
    transition: "<p>Transition delta (PAA − Legacy)</p><span>Legacy V1.0</span>",
    transitionReport: "<h1>PAA Transition Analysis</h1><p>Legacy V1.0 ER</p><h2>What changed — methodology transition</h2>",
    transitionNeedsFiling: `<span>${FILED_ASK}</span>`,
  },
  stylesheets: { "@waterbots/calvin/styles.css": true, "@waterbots/core/base.css": true },
  typeErrors: [],
});

test("every view as it should be: no problem", () => {
  assert.deepEqual(compare(goodRun()), []);
});

test("checks twelve views", () => {
  assert.deepEqual(Object.keys(EXPECT), [
    "exAnte", "exAnteFromSavedExPost", "exPostNeedsMonitoring", "exPost", "exPostReport", "siteTable", "siteTableReport",
    "newProject", "newProjectReport", "transition", "transitionReport", "transitionNeedsFiling",
  ]);
});

test("an ex-post run with no monitoring values that shows figures, or no ask, is a problem", () => {
  const run = goodRun();
  run.views.exPostNeedsMonitoring = `<span>Q_m — metered volume / yr</span><span>${PACKAGE_DAF}</span>`;
  assert.deepEqual(compare(run), [
    `exPostNeedsMonitoring: missing ${MONITORING_ASK}`,
    "exPostNeedsMonitoring: missing data-needed-dot",
    "exPostNeedsMonitoring: should not show Q_m — metered volume",
    `exPostNeedsMonitoring: should not show ${PACKAGE_DAF}`,
  ]);
});

test("a new project shown the transition, or asked for a V1.0 filing, is a problem", () => {
  const run = goodRun();
  run.views.newProject += "<p>Transition delta (PAA − Legacy)</p>";
  run.views.newProjectReport += `<p>${FILED_ASK}</p>`;
  assert.deepEqual(compare(run), [
    "newProject: should not show Transition delta (PAA − Legacy)",
    `newProjectReport: should not show ${FILED_ASK}`,
  ]);
});

test("a transitioning project given the V2.0-only view is a problem", () => {
  const run = goodRun();
  run.views.transition = `<div ${V2_ONLY}>PAA v2.0</div>`;
  assert.deepEqual(compare(run), [
    "transition: missing Transition delta (PAA − Legacy)",
    "transition: missing Legacy V1.0",
    `transition: should not show ${V2_ONLY}`,
  ]);
});

test("a site's table that the screen does not print is a problem", () => {
  const run = goodRun();
  run.views.siteTable = `<span>Q_m — metered volume / yr</span><span>${PACKAGE_DAF}</span>`;
  assert.deepEqual(compare(run), [
    `siteTable: missing ${SITE_DAF}`,
    `siteTable: missing ${SITE_SOURCE}`,
    `siteTable: should not show ${PACKAGE_DAF}`,
  ]);
});

test("the site's source on the view with no table is a problem", () => {
  const run = goodRun();
  run.views.exPost += `<span>${SITE_SOURCE}</span>`;
  assert.deepEqual(compare(run), [`exPost: should not show ${SITE_SOURCE}`]);
});

test("a site locked to ex-ante that opens a saved ex-post analysis as ex-post is a problem", () => {
  const run = goodRun();
  run.views.exAnteFromSavedExPost = "<span>Q_m — metered volume / yr</span>";
  assert.deepEqual(compare(run), [
    `exAnteFromSavedExPost: missing ${SLIDERS}`,
    "exAnteFromSavedExPost: missing How much water will the system produce in a year?",
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
