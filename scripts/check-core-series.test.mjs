// Calvin and Violet accept any core in the same series, so one agent can be released without the others (agreed by the
// maintainer on 2026-11-23). Run by `npm test`. It reads the real files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pkg = (name) => JSON.parse(readFileSync(fileURLToPath(new URL(`../packages/${name}/package.json`, import.meta.url)), "utf8"));
const core = pkg("core").version;
const [major, minor] = core.split(".");

/** True when a core of this version is in the range "a.b.x". */
const accepts = (range, version) => version.startsWith(range.slice(0, -1));

for (const name of ["calvin", "violet"]) {
  test(`${name} accepts any core in the series ${major}.${minor}`, () => {
    const range = pkg(name).dependencies["@waterbots/core"];
    assert.equal(range, `${major}.${minor}.x`);
    for (const v of [core, `${major}.${minor}.0`, `${major}.${minor}.99`]) assert.ok(accepts(range, v), v);
    for (const v of [`${major}.${Number(minor) + 1}.0`, `${Number(major) + 1}.${minor}.0`, "0.2.0"]) assert.ok(!accepts(range, v), v);
  });
}
