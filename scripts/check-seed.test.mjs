// Tests for the seed check. The files and fingerprints here are invented. Run by `npm test`.
// Each fixture is a throwaway git repo: one seed commit, and sometimes a later change on top.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { checkSeed, installedPath, main } from "./check-seed.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const quiet = () => {};

function put(root, path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}

// A throwaway repo for tests only, so it is given its own author and no signing.
const git = (root, ...args) =>
  execFileSync("git", ["-c", "user.name=Seed Test", "-c", "user.email=seed@test.invalid", "-c", "commit.gpgsign=false", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();

function commitAll(root, message) {
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", message);
  return git(root, "rev-parse", "HEAD");
}

/** A tiny invented seed: three installed files and a readme that is not installed. Returns { root, seed }. */
function fixture({ breakFile = false, dropFile = false, wrongFingerprint = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "seed-check-"));
  git(root, "init", "-q");
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
  return { root, seed: commitAll(root, "seed") };
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

test("a matching seed commit passes, and the readme is counted as not installed", () => {
  const { root, seed } = fixture();
  const r = checkSeed(root, { commit: seed });
  assert.deepEqual(r.problems, []);
  assert.equal(r.checked, 3);
  assert.equal(r.skipped, 1);
  assert.equal(r.changedSince, 0);
});

test("later changes to seeded files are allowed, and counted", () => {
  const { root, seed } = fixture();
  put(root, "packages/core/src/a.ts", "export const a = 3;\n");
  commitAll(root, "a normal change");
  rmSync(join(root, "packages/calvin/src/calculators/x/b.ts"));
  const r = checkSeed(root, { commit: seed });
  assert.deepEqual(r.problems, []);
  assert.equal(r.checked, 3);
  assert.equal(r.changedSince, 2);
});

test("a file that differed from the list at the seed commit is found", () => {
  const { root, seed } = fixture({ breakFile: true });
  const r = checkSeed(root, { commit: seed });
  assert.deepEqual(r.problems, ["packages/core/src/a.ts: differs from the seed at the seed commit"]);
});

test("a file missing at the seed commit is found", () => {
  const { root, seed } = fixture({ dropFile: true });
  const r = checkSeed(root, { commit: seed });
  assert.deepEqual(r.problems, ["packages/calvin/src/calculators/x/b.ts: missing at the seed commit"]);
});

test("a changed hash list is found", () => {
  const { root, seed } = fixture();
  put(root, "seeds/calvin/carry-hashes.sha256", `${sha("x")}  calculators/x/b.ts\n`);
  const r = checkSeed(root, { commit: seed });
  assert.deepEqual(r.problems, ["seeds/calvin/carry-hashes.sha256: differs from the list that arrived with the seed"]);
});

test("a hash list whose fingerprint is not in SEEDS.md is found", () => {
  const { root, seed } = fixture({ wrongFingerprint: true });
  assert.deepEqual(checkSeed(root, { commit: seed }).problems, ["SEEDS.md does not record this hash list's fingerprint"]);
});

test("a path with no place in the map is found", () => {
  const { root } = fixture();
  put(root, "seeds/calvin/carry-hashes.sha256", `${sha("x")}  stray/file.ts\n`);
  const seed = commitAll(root, "seed with a stray path");
  assert.match(checkSeed(root, { commit: seed }).problems[0], /stray\/file\.ts: no place for it in the map/);
});

test("a seed commit that is not in this branch's history stops the check", () => {
  const { root } = fixture();
  const main = git(root, "rev-parse", "--abbrev-ref", "HEAD");
  git(root, "checkout", "-q", "-b", "other");
  put(root, "x.txt", "x\n");
  const elsewhere = commitAll(root, "not on main");
  git(root, "checkout", "-q", main);
  assert.throws(() => checkSeed(root, { commit: elsewhere }), /not an ancestor of HEAD/);
  assert.throws(() => checkSeed(root, { commit: "1".repeat(40) }), /not in this clone's history/);
});

test("main exits 0 when clean, 1 when a seed file differed, 2 when it cannot run", () => {
  const good = fixture();
  assert.equal(main(good.root, quiet, quiet, good.seed), 0);
  const bad = fixture({ breakFile: true });
  assert.equal(main(bad.root, quiet, quiet, bad.seed), 1);
  assert.equal(main(good.root, quiet, quiet, "1".repeat(40)), 2);
});
