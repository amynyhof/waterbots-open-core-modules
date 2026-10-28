// Seed check. Proves the seed landed in this repo as the seed's own bytes, and that the commit it landed in is still
// in this branch's history.
//
//   node scripts/check-seed.mjs
//
// `seeds/calvin/carry-hashes.sha256` is the list that came with the Calvin seed. It is kept exactly as it arrived.
// Each line is a SHA-256 fingerprint (a scrambled code that changes if even one byte changes) and the file's path
// inside the seed. This script maps each path to where the file lives in this repo, reads that file as it stood in
// the seed commit (SEED_COMMIT, below), and checks the fingerprint.
//
// It reads the seed commit, not the files as they are today. Since the seed landed, Calvin's home is this repo and its
// files change here by normal pull requests. Those changes are allowed. The record of what arrived is not: the seed
// commit must be in history, every file in it must match the list, and the list must be unchanged.
//
// It also checks the fingerprint of the list itself against the one recorded in SEEDS.md.
// Exit codes: 0 all match, 1 something differs, 2 the check could not run.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The commit on main where the Calvin seed landed (pull request #5). SEEDS.md records it too.
export const SEED_COMMIT = "50fe2f6e4ca6c718757a230c037fb30a7c56c95d";

// Where each part of the seed lives here. The first matching prefix wins.
export const MAP = [
  ["modules/core/", "packages/core/src/"],
  ["modules/calvin/", "packages/calvin/src/modules/calvin/"],
  ["calculators/", "packages/calvin/src/calculators/"],
  ["agents/", "packages/calvin/src/agents/"],
  ["sources/", "packages/calvin/src/sources/"],
  ["expected-outputs.json", "packages/calvin/src/expected-outputs.json"],
];
// In the seed's list, but written for the person carrying the seed, so not installed.
export const NOT_INSTALLED = ["README.md", "MANIFEST.md"];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

export function installedPath(seedPath) {
  for (const [from, to] of MAP) {
    if (seedPath === from) return to;
    if (from.endsWith("/") && seedPath.startsWith(from)) return to + seedPath.slice(from.length);
  }
  return null;
}

const git = (root, args, input) => execFileSync("git", args, { cwd: root, input, stdio: ["pipe", "pipe", "ignore"] });

/** Reads files as they stood in `commit`, in one git call. Returns a Map of path to bytes; a missing path is absent. */
function readAtCommit(root, commit, paths) {
  const out = git(root, ["cat-file", "--batch"], paths.map((p) => `${commit}:${p}\n`).join(""));
  const found = new Map();
  let at = 0;
  for (const p of paths) {
    const end = out.indexOf(0x0a, at);
    const header = out.subarray(at, end).toString("utf8");
    at = end + 1;
    const m = /^[0-9a-f]+ blob (\d+)$/.exec(header);
    if (!m) continue;
    const size = Number(m[1]);
    found.set(p, out.subarray(at, at + size));
    at += size + 1;
  }
  return found;
}

/**
 * Checks one seed under `root` against the commit it landed in.
 * Returns { checked, skipped, changedSince, problems, listFingerprint }. `changedSince` counts installed files that
 * later pull requests have changed. It is information, not a problem.
 */
export function checkSeed(root, { name = "calvin", commit = SEED_COMMIT } = {}) {
  const listRepoPath = `seeds/${name}/carry-hashes.sha256`;
  try {
    git(root, ["cat-file", "-e", `${commit}^{commit}`]);
  } catch {
    throw new Error(`the seed commit ${commit.slice(0, 7)} is not in this clone's history`);
  }
  try {
    git(root, ["merge-base", "--is-ancestor", commit, "HEAD"]);
  } catch {
    throw new Error(`the seed commit ${commit.slice(0, 7)} is not an ancestor of HEAD`);
  }
  const listBytes = readAtCommit(root, commit, [listRepoPath]).get(listRepoPath);
  if (!listBytes) throw new Error("the seed's hash list is missing at the seed commit");

  const problems = [];
  const here = existsSync(join(root, listRepoPath)) ? readFileSync(join(root, listRepoPath)) : null;
  if (!here) problems.push(`${listRepoPath}: missing`);
  else if (!here.equals(listBytes)) problems.push(`${listRepoPath}: differs from the list that arrived with the seed`);

  const entries = [];
  let skipped = 0;
  for (const line of listBytes.toString("utf8").split("\n").filter(Boolean)) {
    const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(line);
    if (!m) {
      problems.push("a line in the hash list cannot be read");
      continue;
    }
    const [, want, seedPath] = m;
    if (NOT_INSTALLED.includes(seedPath)) {
      skipped++;
      continue;
    }
    const path = installedPath(seedPath);
    if (!path) problems.push(`${seedPath}: no place for it in the map`);
    else entries.push({ want, path });
  }

  const atSeed = readAtCommit(root, commit, entries.map((e) => e.path));
  let checked = 0;
  let changedSince = 0;
  for (const { want, path } of entries) {
    const bytes = atSeed.get(path);
    if (!bytes) {
      problems.push(`${path}: missing at the seed commit`);
    } else if (sha256(bytes) !== want) {
      problems.push(`${path}: differs from the seed at the seed commit`);
    } else {
      checked++;
      const now = existsSync(join(root, path)) ? readFileSync(join(root, path)) : null;
      if (!now || !now.equals(bytes)) changedSince++;
    }
  }

  const listFingerprint = sha256(listBytes);
  const seedsMd = existsSync(join(root, "SEEDS.md")) ? readFileSync(join(root, "SEEDS.md"), "utf8") : "";
  if (!seedsMd.includes(listFingerprint)) problems.push("SEEDS.md does not record this hash list's fingerprint");
  return { checked, skipped, changedSince, problems, listFingerprint };
}

export function main(cwd = process.cwd(), out = console.log, err = console.error, commit = SEED_COMMIT) {
  let r;
  try {
    r = checkSeed(cwd, { commit });
  } catch (e) {
    err(`check-seed: cannot run (${e.message}).`);
    return 2;
  }
  for (const p of r.problems) out(`check-seed: ${p}`);
  out(
    `check-seed: ${r.checked} file(s) match the seed at commit ${commit.slice(0, 7)}, ${r.skipped} not installed, ` +
      `${r.changedSince} changed since by later pull requests, ${r.problems.length} problem(s)`,
  );
  return r.problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main();
}
