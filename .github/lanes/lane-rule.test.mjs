import { test } from "node:test";
import assert from "node:assert/strict";
import { laneForPath, laneForFiles, MAX_FILES } from "./lane-rule.mjs";

const f = (filename, previous_filename) => (previous_filename ? { filename, previous_filename } : { filename });

test("lane 1: the plain-writing files", () => {
  for (const p of ["BUILD_PLAN.md", "BUILD_LOG.md", "docs/a.md", "docs/deep/er/b.md"]) {
    assert.equal(laneForPath(p), 1, p);
  }
});

test("lane 2: README", () => {
  assert.equal(laneForPath("README.md"), 2);
});

test("lane 3: anything not on a list", () => {
  for (const p of [
    "CLAUDE.md",
    ".claude/settings.json",
    ".github/workflows/ci.yml",
    ".github/lanes/lane-rule.mjs",
    "docs/x.txt",
    "docs/x.md.js",
    "docs.md",
    "Docs/a.md",
    "build_plan.md",
    "BUILD_PLAN.md.bak",
    "sub/BUILD_LOG.md",
    "packages/calvin/engine/x.ts",
    "LICENSE",
    "docs/../CLAUDE.md",
    "",
  ]) {
    assert.equal(laneForPath(p), 3, p);
  }
  assert.equal(laneForPath(undefined), 3);
});

test("a pull request takes the highest lane", () => {
  assert.equal(laneForFiles([f("BUILD_LOG.md"), f("docs/a.md")]), 1);
  assert.equal(laneForFiles([f("BUILD_LOG.md"), f("README.md")]), 2);
  assert.equal(laneForFiles([f("BUILD_LOG.md"), f("README.md"), f("CLAUDE.md")]), 3);
});

test("a rename counts its old path too", () => {
  assert.equal(laneForFiles([f("docs/a.md", "packages/calvin/engine/data.md")]), 3);
  assert.equal(laneForFiles([f("docs/b.md", "docs/a.md")]), 1);
  assert.equal(laneForFiles([{ filename: "docs/a.md", previous_filename: null }]), 1);
});

test("fails closed on odd input", () => {
  assert.equal(laneForFiles([]), 3);
  assert.equal(laneForFiles(null), 3);
  assert.equal(laneForFiles([{}]), 3);
  assert.equal(laneForFiles(Array.from({ length: MAX_FILES }, (_, i) => f(`docs/${i}.md`))), 3);
});
