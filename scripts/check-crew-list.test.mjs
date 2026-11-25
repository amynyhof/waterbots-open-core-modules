// The crew list: core's code is the file the maintainer edits, and core ships the file. Run by `npm test`.
// It reads the real file and the built code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CREW, CREW_VERSION } from "../packages/core/dist/crew.js";

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8").replace(/\r\n/g, "\n");
const yaml = read("../packages/core/src/roster.yaml");

test("the code is the file: the version, every seat, and every line of it", () => {
  assert.ok(yaml.includes(`\nversion: ${CREW_VERSION}\n`));
  assert.deepEqual([...yaml.matchAll(/\n  - id: (\w+)/g)].map((m) => m[1]), CREW.map((s) => s.id));
  for (const s of CREW) {
    const at = yaml.indexOf(`\n  - id: ${s.id}\n`);
    const next = yaml.indexOf("\n  - id: ", at + 1);
    const block = yaml.slice(at, next === -1 ? yaml.indexOf("\n# Names that were seats") : next);
    for (const line of [`name: ${s.name}`, `seat: ${s.seat}`, `job: ${s.job}`, `phase: ${s.phase}`, `faces: [${s.faces.join(", ")}]`]) assert.ok(block.includes(`    ${line}\n`), line);
    assert.equal([...block.matchAll(/^      - /gm)].length, s.helpsWith.length, s.id);
    for (const h of s.helpsWith) assert.ok(block.includes(`      - ${h}\n`), h);
    for (const [door, level] of Object.entries(s.doors)) assert.ok(block.includes(`      ${door}: { level: ${level},`), door);
  }
});

test("core ships it", () => {
  const pkg = JSON.parse(read("../packages/core/package.json"));
  assert.equal(pkg.exports["./roster.yaml"], "./dist/roster.yaml");
  assert.match(pkg.scripts.build, /build:roster/);
});
