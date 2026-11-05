// Screen-entry check. Proves a site can mount Calvin's two views from the packed files, through
// `@waterbots/calvin/screen`, the way the release delivers them.
//
//   node scripts/check-screen-entry.mjs
//
// It builds `core` and `calvin`, packs both with `npm pack`, and unpacks them into a fresh folder outside the repo, as
// a site's `node_modules` would hold them. It adds React from this repo's own install, and nothing else. A plain Node
// process there loads the screen entry and renders, on a made-up project:
//   - the ex-ante view on a site locked to ex-ante: the sliders show, even for a saved ex-post analysis;
//   - the ex-post view on a site that shows both: no sliders, the metered volume row instead;
//   - the report tab of the ex-post view.
// It also checks that both stylesheets are in the packed files and reachable by their names, and it typechecks a
// small file that imports the entry, the way a site's bundler reads the types.
// Exit codes: 0 all pass, 1 something is wrong, 2 the check could not run.
import { execFileSync, execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

// What a site writes to mount a seat: the state hook, the controls panel and the work surface.
const RUN = `import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as S from "@waterbots/calvin/screen";
const project = (analysis) => ({
  name: "Invented test project", standards: [], technology: "CWS", country: "LSO",
  population: { mode: "people", served: 1200 }, analysis: { fnrbFiledV1: 0.3, ...analysis },
});
function Seat({ project, options, tab }) {
  const calc = S.useCalculatorState(project, options);
  return h("div", null, h(S.CalculatorLens, { calc }), h(S.CalculatorWork, { calc, project, appVersion: "0.0.0", tab }));
}
const render = (p, options, tab = "calculator") => renderToStaticMarkup(h(Seat, { project: p, options, tab }));
const found = (name) => existsSync(fileURLToPath(import.meta.resolve(name)));
process.stdout.write(JSON.stringify({
  names: Object.keys(S),
  views: {
    exAnte: render(project({}), { exAnteOnly: true }),
    exAnteFromSavedExPost: render(project({ mode: "ex-post" }), { exAnteOnly: true }),
    exPost: render(project({ mode: "ex-post" }), {}),
    exPostReport: render(project({ mode: "ex-post" }), {}, "report"),
  },
  stylesheets: { "@waterbots/calvin/styles.css": found("@waterbots/calvin/styles.css"), "@waterbots/core/base.css": found("@waterbots/core/base.css") },
}));
`;

const TYPES = `import { useCalculatorState, CalculatorLens, CalculatorWork, ReportView, VersionTabs, type CalculatorOptions, type CalvinProject } from "@waterbots/calvin/screen";
const options: CalculatorOptions = { exAnteOnly: true };
export const parts = [useCalculatorState, CalculatorLens, CalculatorWork, ReportView, VersionTabs] as const;
export const project: CalvinProject | null = null;
export { options };
`;

const TSCONFIG = {
  compilerOptions: { module: "esnext", moduleResolution: "bundler", target: "es2022", jsx: "react-jsx", strict: true, noEmit: true, skipLibCheck: true, types: [] },
  include: ["types-check.ts"],
};

/** What each rendered view must and must not hold. Plain text from the screens, not numbers. */
export const EXPECT = {
  exAnte: { has: ['aria-label="Anticipated performance"', "Q_m — planned production"], lacks: ["Q_m — metered volume"] },
  exAnteFromSavedExPost: { has: ['aria-label="Anticipated performance"', "Q_m — planned production"], lacks: ["Q_m — metered volume"] },
  exPost: { has: ["Q_m — metered volume"], lacks: ['aria-label="Anticipated performance"'] },
  exPostReport: { has: ["print-report", "Ex-post"], lacks: ['aria-label="Anticipated performance"'] },
};
export const NAMES = ["useCalculatorState", "CalculatorLens", "CalculatorWork", "ReportView", "VersionTabs"];

/** Compares what the installed entry rendered with what each view must show. Returns the problems found. */
export function compare(run) {
  const problems = [];
  for (const n of NAMES) if (!run.names?.includes(n)) problems.push(`the entry does not export ${n}`);
  for (const [view, { has, lacks }] of Object.entries(EXPECT)) {
    const html = run.views?.[view];
    if (typeof html !== "string" || html.length === 0) {
      problems.push(`${view}: nothing rendered`);
      continue;
    }
    for (const s of has) if (!html.includes(s)) problems.push(`${view}: missing ${s}`);
    for (const s of lacks) if (html.includes(s)) problems.push(`${view}: should not show ${s}`);
  }
  for (const [name, ok] of Object.entries(run.stylesheets ?? {})) if (!ok) problems.push(`stylesheet not found: ${name}`);
  if (Object.keys(run.stylesheets ?? {}).length !== 2) problems.push("the stylesheets were not checked");
  for (const e of run.typeErrors ?? ["the types were not checked"]) problems.push(`types: ${e}`);
  return problems;
}

/** Unpacks one packed file into `node_modules/@waterbots/<name>`. Relative paths only, so it works on every system. */
function unpack(packs, file, site, name) {
  const into = join(packs, `unpack-${name}`);
  mkdirSync(into);
  execFileSync("tar", ["-xzf", join("..", file)], { cwd: into });
  renameSync(join(into, "package"), join(site, "node_modules", "@waterbots", name));
}

/** Packs both packages, installs them alone with React in a fresh folder, and renders the views there. */
function runInstalled() {
  execSync("npm run build -w @waterbots/core && npm run build -w @waterbots/calvin", { cwd: root, stdio: "ignore" });
  const work = mkdtempSync(join(tmpdir(), "calvin-screen-"));
  try {
    const packs = join(work, "packs");
    const site = join(work, "site");
    mkdirSync(packs);
    mkdirSync(join(site, "node_modules", "@waterbots"), { recursive: true });
    mkdirSync(join(site, "node_modules", "@types"), { recursive: true });
    execSync(`npm pack -w @waterbots/core -w @waterbots/calvin --pack-destination "${packs}"`, { cwd: root, stdio: "ignore" });
    const files = readdirSync(packs).filter((f) => f.endsWith(".tgz"));
    unpack(packs, files.find((f) => f.startsWith("waterbots-core-")), site, "core");
    unpack(packs, files.find((f) => f.startsWith("waterbots-calvin-")), site, "calvin");
    for (const dep of ["react", "react-dom", "scheduler", join("@types", "react")]) {
      const from = join(root, "node_modules", dep);
      if (existsSync(from)) cpSync(from, join(site, "node_modules", dep), { recursive: true });
    }
    writeFileSync(join(site, "package.json"), JSON.stringify({ name: "a-site", private: true, type: "module" }));
    writeFileSync(join(site, "run.mjs"), RUN);
    const out = JSON.parse(execFileSync(process.execPath, ["run.mjs"], { cwd: site, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
    writeFileSync(join(site, "tsconfig.json"), JSON.stringify(TSCONFIG));
    writeFileSync(join(site, "types-check.ts"), TYPES);
    let typeErrors = [];
    try {
      execFileSync(process.execPath, [join(root, "node_modules", "typescript", "bin", "tsc"), "-p", site], { cwd: site, encoding: "utf8" });
    } catch (e) {
      typeErrors = String(e.stdout ?? "").split(/\r?\n/).filter((l) => l.includes("error TS"));
      if (!typeErrors.length) throw e;
    }
    return { ...out, typeErrors };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export function main(out = console.log, err = console.error) {
  let run;
  try {
    run = runInstalled();
  } catch (e) {
    err(`check-screen-entry: cannot run (${e.message}).`);
    return 2;
  }
  const problems = compare(run);
  for (const p of problems) out(`check-screen-entry: ${p}`);
  out(`check-screen-entry: ${Object.keys(EXPECT).length} views rendered from the packed files; ${problems.length} problem(s)`);
  return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main();
}
