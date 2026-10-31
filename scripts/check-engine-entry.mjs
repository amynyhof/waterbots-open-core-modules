// Engine-entry check. Proves the built engine-only entry, `@waterbots/calvin/engine`, works with no React installed.
//
//   node scripts/check-engine-entry.mjs
//
// It builds the entry with the package's own `build:engine` script, then makes a fresh folder outside the repo and
// installs only calvin's package.json and the built file there. No React, no `@waterbots/core`. A plain Node process
// in that folder loads the entry through the package's exports, checks that React cannot be found, and re-runs every
// case in `expected-outputs.json`, with the same steps as the package tests (`src/test-cases.ts`). All 48 checks (the
// engine version and every case) must give the same answers. This shows nothing broke. It does not show a match to real
// filings.
//
// It also checks the entry's types the way a project using Node's own module rules (`nodenext`) sees them. It installs
// the built type files beside the code and typechecks a small file there, with the package's type files checked too.
// That file imports the entry and fails if any export, or any function's inputs or result, falls back to "any".
// Exit codes: 0 all match, 1 something differs, 2 the check could not run.
import { execFileSync, execSync } from "node:child_process";
import { deepStrictEqual } from "node:assert/strict";
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkgDir = join(root, "packages", "calvin");

const RUN = `import { readFileSync } from "node:fs";
import { runTestCases } from "./test-cases.ts";
const engine = await import("@waterbots/calvin/engine");
const react = await import("react").then(() => "found", (e) => e.code);
const doc = JSON.parse(readFileSync(new URL("./expected-outputs.json", import.meta.url), "utf8"));
process.stdout.write(JSON.stringify({ react, names: Object.keys(engine), results: runTestCases(engine, doc) }));
`;

const TSCONFIG = {
  compilerOptions: { module: "nodenext", moduleResolution: "nodenext", target: "es2022", strict: true, noEmit: true, skipLibCheck: false, types: [] },
  include: ["types-check.ts"],
};

/** A file that fails to typecheck if any named export, or a function's inputs or result, is "any". */
export function typesCheckFile(names) {
  const lines = [
    `import * as E from "@waterbots/calvin/engine";`,
    `type IsAny<T> = 0 extends 1 & T ? true : false;`,
    `type Parts<T> = T extends (...a: infer P) => infer R ? [T, R, ...P] : T extends abstract new (...a: infer P) => infer R ? [T, R, ...P] : [T];`,
    `type HasAny<L extends unknown[]> = true extends { [K in keyof L]: IsAny<L[K]> }[number] ? true : false;`,
  ];
  for (const n of names) lines.push(`export const no_any_${n}: HasAny<Parts<typeof E.${n}>> = false;`);
  return lines.join("\n") + "\n";
}

/** Typechecks the installed entry under Node's own module rules. Returns the error lines; none means it passed. */
function checkTypes(work, names) {
  writeFileSync(join(work, "tsconfig.json"), JSON.stringify(TSCONFIG));
  writeFileSync(join(work, "types-check.ts"), typesCheckFile(names));
  try {
    execFileSync(process.execPath, [join(root, "node_modules", "typescript", "bin", "tsc"), "-p", work], { cwd: work, encoding: "utf8" });
    return [];
  } catch (e) {
    const lines = String(e.stdout ?? "").split(/\r?\n/).filter((l) => l.includes("error TS"));
    if (!lines.length) throw e;
    return lines;
  }
}

/** Builds the entry and its types, installs them alone in a fresh folder and checks them there. Returns what it found. */
function runInstalled() {
  execSync("npm run build -w @waterbots/core && npm run build -w @waterbots/calvin", { cwd: root, stdio: "ignore" });
  const work = mkdtempSync(join(tmpdir(), "calvin-engine-"));
  try {
    const installed = join(work, "node_modules", "@waterbots", "calvin");
    mkdirSync(join(installed, "dist"), { recursive: true });
    copyFileSync(join(pkgDir, "package.json"), join(installed, "package.json"));
    copyFileSync(join(pkgDir, "dist", "engine.js"), join(installed, "dist", "engine.js"));
    copyFileSync(join(pkgDir, "dist", "engine.d.ts"), join(installed, "dist", "engine.d.ts"));
    cpSync(join(pkgDir, "dist", "calculators"), join(installed, "dist", "calculators"), {
      recursive: true,
      filter: (src) => !/\.js(\.map)?$/.test(src),
    });
    copyFileSync(join(pkgDir, "src", "test-cases.ts"), join(work, "test-cases.ts"));
    copyFileSync(join(pkgDir, "src", "expected-outputs.json"), join(work, "expected-outputs.json"));
    writeFileSync(join(work, "package.json"), JSON.stringify({ name: "engine-only", private: true, type: "module" }));
    writeFileSync(join(work, "run.mjs"), RUN);
    const bundle = readFileSync(join(installed, "dist", "engine.js"), "utf8");
    const out = JSON.parse(execFileSync(process.execPath, ["run.mjs"], { cwd: work, encoding: "utf8" }));
    return { ...out, importsSomething: /^\s*import\s|\brequire\(/m.test(bundle), typeErrors: checkTypes(work, out.names) };
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
  if (!run.names?.length) problems.push("the entry exports nothing");
  for (const e of run.typeErrors ?? ["the types were not checked"]) problems.push(`types under Node's module rules: ${e}`);
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
  out(`check-engine-entry: ${r.matched} of ${r.checks} match with no React installed; types of ${run.names.length} export(s) checked under Node's module rules; ${r.problems.length} problem(s)`);
  return r.problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main();
}
