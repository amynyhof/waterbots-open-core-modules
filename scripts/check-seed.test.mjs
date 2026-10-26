// Tests for the seed check. The files and fingerprints here are invented. Run by `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { checkSeed, installedPath, main } from "./check-seed.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex");

function put(root, path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

/** A tiny invented seed: three installed files and a readme that is not installed. */
function fixture({ breakFile = false, dropFile = false, wrongFingerprint = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "seed-check-"));
  const files = {
    "modules/core/a.ts": "export const a = 1;\n",
    "calculators/x/b.ts": "export const b = 2;\n",
    "expected-outputs.json": '{"cases":[]}\n',
    "README.md": "for the person carrying the seed\n",
  };
  const list = Object.entries(files).map(([p, t]) => `${sha(t)}  ${p}\n`).join("");
  put(root, "seeds/calvin/carry-hashes.sha256", list);
  put(root, "packages/core/src/a.ts", breakFile ? "export const a = 99;\n" : files["modules/core/a.ts"]);
  if (!dropFile) put(root, "packages/calvin/src/calculators/x/b.ts", files["calculators/x/b.ts"]);
  put(root, "packages/calvin/src/expected-outputs.json", files["expected-outputs.json"]);
  put(root, "SEEDS.md", `fingerprint ${wrongFingerprint ? "0".repeat(64) : sha(list)}\n`);
  return root;
}

test("each seed path maps to its place in the packages", () => {
  assert.equal(installedPath("modules/core/agent.ts"), "packages/core/src/agent.ts");
  assert.equal(installedPath("modules/calvin/screen/state.ts"), "packages/calvin/src/modules/calvin/screen/state.ts");
  assert.equal(installedPath("calculators/data/x.json"), "packages/calvin/src/calculators/data/x.json");
  assert.equal(installedPath("agents/calvin/prompt.md"), "packages/calvin/src/agents/calvin/prompt.md");
  assert.equal(installedPath("sources/public-index.yaml"), "packages/calvin/src/sources/public-index.yaml");
  assert.equal(installedPath("expected-outputs.json"), "packages/calvin/src/expected-outputs.json");
  assert.equal(installedPath("somewhere/else.ts"), null);
});

test("matching files pass, and the readme is counted as not installed", () => {
  const r = checkSeed(fixture());
  assert.deepEqual(r.problems, []);
  assert.equal(r.checked, 3);
  assert.equal(r.skipped, 1);
});

test("a changed file is found", () => {
  const r = checkSeed(fixture({ breakFile: true }));
  assert.deepEqual(r.problems, ["packages/core/src/a.ts: differs from the seed"]);
});

test("a missing file is found", () => {
  const r = checkSeed(fixture({ dropFile: true }));
  assert.deepEqual(r.problems, ["packages/calvin/src/calculators/x/b.ts: missing"]);
});

test("a hash list whose fingerprint is not in SEEDS.md is found", () => {
  const r = checkSeed(fixture({ wrongFingerprint: true }));
  assert.deepEqual(r.problems, ["SEEDS.md does not record this hash list's fingerprint"]);
});

test("a path with no place in the map is found", () => {
  const root = fixture();
  put(root, "seeds/calvin/carry-hashes.sha256", `${sha("x")}  stray/file.ts\n`);
  assert.match(checkSeed(root).problems[0], /stray\/file\.ts: no place for it in the map/);
});

test("main exits 0 when clean, 1 when a file differs, 2 when the list is missing", () => {
  const quiet = () => {};
  assert.equal(main(fixture(), quiet, quiet), 0);
  assert.equal(main(fixture({ breakFile: true }), quiet, quiet), 1);
  assert.equal(main(mkdtempSync(join(tmpdir(), "seed-check-empty-")), quiet, quiet), 2);
});
