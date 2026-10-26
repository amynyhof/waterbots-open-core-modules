// Seed check. Proves the seeded files are still the seed's own bytes.
//
//   node scripts/check-seed.mjs
//
// `seeds/calvin/carry-hashes.sha256` is the list that came with the Calvin seed. It is kept exactly as it arrived.
// Each line is a SHA-256 fingerprint (a scrambled code that changes if even one byte changes) and the file's path
// inside the seed. This script maps each path to where the file lives in this repo and checks the fingerprint.
//
// It also checks the fingerprint of the list itself against the one recorded in SEEDS.md.
// Exit codes: 0 all match, 1 something differs, 2 the check could not run.
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

/** Checks one seed under `root`. Returns { checked, skipped, problems, listFingerprint }. */
export function checkSeed(root, name = "calvin") {
  const listPath = join(root, "seeds", name, "carry-hashes.sha256");
  if (!existsSync(listPath)) throw new Error("the seed's hash list is missing");
  const listBytes = readFileSync(listPath);
  const problems = [];
  let checked = 0;
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
    const here = installedPath(seedPath);
    if (!here) {
      problems.push(`${seedPath}: no place for it in the map`);
    } else if (!existsSync(join(root, here))) {
      problems.push(`${here}: missing`);
    } else if (sha256(readFileSync(join(root, here))) !== want) {
      problems.push(`${here}: differs from the seed`);
    } else {
      checked++;
    }
  }
  const listFingerprint = sha256(listBytes);
  const seedsMd = existsSync(join(root, "SEEDS.md")) ? readFileSync(join(root, "SEEDS.md"), "utf8") : "";
  if (!seedsMd.includes(listFingerprint)) problems.push("SEEDS.md does not record this hash list's fingerprint");
  return { checked, skipped, problems, listFingerprint };
}

export function main(cwd = process.cwd(), out = console.log, err = console.error) {
  let r;
  try {
    r = checkSeed(cwd);
  } catch (e) {
    err(`check-seed: cannot run (${e.message}).`);
    return 2;
  }
  for (const p of r.problems) out(`check-seed: ${p}`);
  out(`check-seed: ${r.checked} installed file(s) match the seed, ${r.skipped} not installed, ${r.problems.length} problem(s)`);
  return r.problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main();
}
