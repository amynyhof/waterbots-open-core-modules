// Engine-entry check. Proves the built engine-only entry, `@waterbots/calvin/engine`, works with no React installed.
//
//   node scripts/check-engine-entry.mjs
//
// It builds the entry with the package's own `build:engine` script, then makes a fresh folder outside the repo and
// installs only calvin's package.json and the built file there. No React, no `@waterbots/core`. A plain Node process
// in that folder loads the entry through the package's exports, checks that React cannot be found, and re-runs every
// case in `expected-outputs.json`. All 48 checks (the engine version and every case) must give the same answers.
// This shows nothing broke. It does not show a match to real filings.
// Exit codes: 0 all match, 1 something differs, 2 the check could not run.
import { execFileSync, execSync } from "node:child_process";
import { deepStrictEqual } from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkgDir = join(root, "packages", "calvin");

const RUN = `import { readFileSync } from "node:fs";
import { runReferenceCases } from "./run-reference-cases.mjs";
const engine = await import("@waterbots/calvin/engine");
const react = await import("react").then(() => "found", (e) => e.code);
const doc = JSON.parse(readFileSync(new URL("./expected-outputs.json", import.meta.url), "utf8"));
process.stdout.write(JSON.stringify({ react, results: runReferenceCases(engine, doc) }));
`;

/** Builds the entry, installs it alone in a fresh folder and runs it there. Returns what that run printed. */
function runInstalled() {
  execSync("npm run build:engine -w @waterbots/calvin", { cwd: root, stdio: "ignore" });
  const work = mkdtempSync(join(tmpdir(), "calvin-engine-"));
  try {
    const installed = join(work, "node_modules", "@waterbots", "calvin");
    mkdirSync(join(installed, "dist"), { recursive: true });
    copyFileSync(join(pkgDir, "package.json"), join(installed, "package.json"));
    copyFileSync(join(pkgDir, "dist", "engine.js"), join(installed, "dist", "engine.js"));
    copyFileSync(join(pkgDir, "test", "run-reference-cases.mjs"), join(work, "run-reference-cases.mjs"));
    copyFileSync(join(pkgDir, "src", "expected-outputs.json"), join(work, "expected-outputs.json"));
    writeFileSync(join(work, "package.json"), JSON.stringify({ name: "engine-only", private: true, type: "module" }));
    writeFileSync(join(work, "run.mjs"), RUN);
    const bundle = readFileSync(join(installed, "dist", "engine.js"), "utf8");
    const out = JSON.parse(execFileSync(process.execPath, ["run.mjs"], { cwd: work, encoding: "utf8" }));
    return { ...out, importsSomething: /^\s*import\s|\brequire\(/m.test(bundle) };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

/** Compares what the installed entry gave with the recorded outputs. Returns { checks, matched, problems }. */
export function compare(doc, run) {
  const problems = [];
  let matched = 0;
  const same = (label, got, want) => {
    try {
      deepStrictEqual(got, want);
      matched++;
    } catch {
      problems.push(`${label}: differs`);
    }
  };
  if (run.react !== "ERR_MODULE_NOT_FOUND") problems.push("React could be found where the entry was installed");
  if (run.importsSomething) problems.push("the built entry imports another file");
  same("engine version", run.results.engineVersion, doc.engineVersion);
  for (const c of doc.cases) same(c.id, run.results.cases[c.id], { held: [], outputs: c.outputs });
  for (const c of doc.fnrbCases) same(c.id, run.results.fnrbCases[c.id], c.outputs);
  return { checks: 1 + doc.cases.length + doc.fnrbCases.length, matched, problems };
}

export function main(out = console.log, err = console.error) {
  let doc;
  let run;
  try {
    doc = JSON.parse(readFileSync(join(pkgDir, "src", "expected-outputs.json"), "utf8"));
    run = runInstalled();
  } catch (e) {
    err(`check-engine-entry: cannot run (${e.message}).`);
    return 2;
  }
  const r = compare(doc, run);
  for (const p of r.problems) out(`check-engine-entry: ${p}`);
  out(`check-engine-entry: ${r.matched} of ${r.checks} match with no React installed, ${r.problems.length} problem(s)`);
  return r.problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main();
}
