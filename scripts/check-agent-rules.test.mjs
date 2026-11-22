// The foundational agent rules: the page at the root, and the one file the agents read. Run by `npm test`.
// It reads the real files. Nothing here runs a model.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path = (rel) => fileURLToPath(new URL(rel, import.meta.url));
// Line endings are set aside: one copy of the repo may give a file CRLF and another LF.
const read = (rel) => readFileSync(path(rel), "utf8").replace(/\r\n/g, "\n");

const page = read("../AGENT_RULES.md");
const rules = read("../packages/core/src/agent-rules.md");

test("core's file is rules 1 to 21 of the page, word for word, without the notes for builders", () => {
  const start = page.indexOf("## How an agent talks\n");
  const end = page.indexOf("## Notes for builders");
  assert.ok(start > 0 && end > start, "the page's sections are where they were");
  assert.equal(rules, "# Foundational agent rules\n\n" + page.slice(start, end).replace(/\n+$/, "\n"));
  assert.doesNotMatch(rules, /Notes for builders/);
});

test("core's file holds rules 1 to 21, in order", () => {
  const numbers = [...rules.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
  assert.deepEqual(numbers, Array.from({ length: 21 }, (_, i) => i + 1));
});

test("it is the one copy: Calvin and Violet read it from core and keep none of their own", () => {
  for (const agent of ["calvin", "violet"]) {
    const config = read(`../packages/${agent}/src/agents/${agent}/config.yaml`);
    assert.match(config, /^base_rules: "@waterbots\/core\/agent-rules\.md"( +#.*)?$/m);
    assert.equal(existsSync(path(`../packages/${agent}/src/agents/_base-rules.md`)), false);
  }
});

test("core ships it", () => {
  const pkg = JSON.parse(read("../packages/core/package.json"));
  assert.equal(pkg.exports["./agent-rules.md"], "./dist/agent-rules.md");
  assert.match(pkg.scripts.build, /build:rules/);
});
