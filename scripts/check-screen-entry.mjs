// Screen-entry check. Proves a site can mount Calvin's two views from the packed files, through
// `@waterbots/calvin/screen`, the way the release delivers them.
//
//   node scripts/check-screen-entry.mjs [--built]
//
// It builds `core` and `calvin`, unless `--built` says they are already built. It packs both with `npm pack` and
// unpacks them into a fresh folder outside the repo, as a site's `node_modules` would hold them. It adds React from this repo's own install, and nothing else. A plain Node
// process there loads the screen entry and renders, on a made-up project:
//   - the ex-ante view on a site locked to ex-ante: the sliders show, even for a saved ex-post analysis;
//   - the ex-post view on a site that shows both: no sliders, the metered volume row instead;
//   - the report tab of the ex-post view;
//   - the ex-post view and its report again, with a site's own DAF table passed in (V13). The table is invented. The
//     check proves the screens print the site's value and its source, and that the view with no table still prints the
//     package's own value;
//   - a new project (the site passes no `creditedUnderV1`) and its report: V2.0 only, with no V1.0 figure, no
//     transition and no ask for a filed V1.0 fNRB (ruling 2026-09-21);
//   - a project credited under V1.0 and its report: both versions and the transition;
//   - a project credited under V1.0 with no filed V1.0 fNRB on the record: the ask for it.
// It also checks that both stylesheets are in the packed files and reachable by their names, and it typechecks a
// small file that imports the entry, the way a site's bundler reads the types.
// Exit codes: 0 all pass, 1 something is wrong, 2 the check could not run.
import { execFileSync, execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

/** The site's table for the mount test: one invented DAF row for the project's country, which the package's DAF table lacks. */
export const SITE_SOURCE = "Invented site table for the screen-entry check";
export const SITE_DAF = "0.0321";
/** What the package prints for that country with no site table: the DAF tool's cited floor. */
export const PACKAGE_DAF = "Default value: 0.0125";
/** Marks the V2.0-only header, the one a new project gets. */
export const V2_ONLY = 'data-view="v2-only"';
/** Text only the transition view and its report print. */
export const TRANSITION = ["Transition delta (PAA − Legacy)", "PAA Transition Analysis", "Legacy V1.0 ER", "What changed — methodology transition"];
/** The ask for a filed V1.0 fNRB. */
export const FILED_ASK = "Filed V1.0 fNRB needed";
export const MONITORING_ASK = "Monitoring values needed";
const SITE_TABLES = { daf: { source: SITE_SOURCE, countries: { LSO: { name: "Lesotho", daf_2026_2030: Number(SITE_DAF), basis: "invented basis" } } } };

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
// An ex-post run shows figures only once its monitoring values are entered (ruling 2026-11-21). Invented values.
const monitored = { mode: "ex-post", operationalDays: 300, operationalDaysEntered: true, mQuality: 0.95, mQualityEntered: true, xCleanboil: 0.1, xCleanboilEntered: true };
const tables = ${JSON.stringify(SITE_TABLES)};
const found = (name) => existsSync(fileURLToPath(import.meta.resolve(name)));
process.stdout.write(JSON.stringify({
  names: Object.keys(S),
  views: {
    exAnte: render(project({}), { exAnteOnly: true }),
    exAnteFromSavedExPost: render(project({ mode: "ex-post" }), { exAnteOnly: true }),
    exPostNeedsMonitoring: render(project({ mode: "ex-post" }), {}),
    exPost: render(project(monitored), {}),
    exPostReport: render(project(monitored), {}, "report"),
    siteTable: render(project(monitored), { tables }),
    siteTableReport: render(project(monitored), { tables }, "report"),
    newProject: render({ ...project({}), analysis: {} }, {}),
    newProjectReport: render({ ...project({}), analysis: {} }, {}, "report"),
    transition: render({ ...project(monitored), creditedUnderV1: true }, {}),
    transitionReport: render({ ...project(monitored), creditedUnderV1: true }, {}, "report"),
    transitionNeedsFiling: render({ ...project({}), analysis: {}, creditedUnderV1: true }, {}),
  },
  stylesheets: { "@waterbots/calvin/styles.css": found("@waterbots/calvin/styles.css"), "@waterbots/core/base.css": found("@waterbots/core/base.css") },
}));
`;

const TYPES = `import { useCalculatorState, CalculatorLens, CalculatorWork, ReportView, VersionTabs, type CalculatorOptions, type CalvinProject, type SiteTables } from "@waterbots/calvin/screen";
const tables: SiteTables = { daf: { source: "invented", countries: { LSO: { name: "Lesotho", daf_2026_2030: 0.03, basis: "invented" } } } };
const options: CalculatorOptions = { exAnteOnly: true, tables };
export const parts = [useCalculatorState, CalculatorLens, CalculatorWork, ReportView, VersionTabs] as const;
export const project: CalvinProject | null = null;
export const transitioning: CalvinProject = { name: "invented", standards: [], creditedUnderV1: true };
export { options };
`;

const TSCONFIG = {
  compilerOptions: { module: "esnext", moduleResolution: "bundler", target: "es2022", jsx: "react-jsx", strict: true, noEmit: true, skipLibCheck: true, types: [] },
  include: ["types-check.ts"],
};

/** What each rendered view must and must not hold. Plain text from the screens, not numbers. */
export const EXPECT = {
  exAnte: { has: ['aria-label="Anticipated performance"', "How much water will the system produce in a year?"], lacks: ["Q_m — metered volume"] },
  exAnteFromSavedExPost: { has: ['aria-label="Anticipated performance"', "How much water will the system produce in a year?"], lacks: ["Q_m — metered volume"] },
  exPostNeedsMonitoring: { has: [MONITORING_ASK, "data-needed-dot"], lacks: ["Q_m — metered volume", PACKAGE_DAF] },
  exPost: { has: ["Q_m — metered volume", PACKAGE_DAF, "From the operation log or sensor"], lacks: [MONITORING_ASK, 'aria-label="Anticipated performance"', SITE_SOURCE] },
  exPostReport: { has: ["print-report", "Ex-post"], lacks: ['aria-label="Anticipated performance"', SITE_SOURCE] },
  siteTable: { has: ["Q_m — metered volume", SITE_DAF, SITE_SOURCE], lacks: [PACKAGE_DAF] },
  siteTableReport: { has: ["print-report", SITE_DAF, SITE_SOURCE], lacks: [PACKAGE_DAF] },
  newProject: { has: [V2_ONLY, "PAA v2.0"], lacks: [...TRANSITION, FILED_ASK] },
  newProjectReport: { has: ["PAA V2.0 Emission Reductions", "PAA V2.0 Report"], lacks: [...TRANSITION, FILED_ASK] },
  transition: { has: ["Transition delta (PAA − Legacy)", "Legacy V1.0"], lacks: [V2_ONLY, FILED_ASK] },
  transitionReport: { has: ["PAA Transition Analysis", "Legacy V1.0 ER", "What changed — methodology transition"], lacks: [V2_ONLY, "PAA V2.0 Emission Reductions"] },
  transitionNeedsFiling: { has: [FILED_ASK], lacks: [V2_ONLY, ...TRANSITION] },
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
  // With --built, the caller has just built core and calvin (the root test script does), so they are not built again.
  if (!process.argv.includes("--built")) {
    execSync("npm run build -w @waterbots/core && npm run build -w @waterbots/calvin", { cwd: root, stdio: "ignore" });
  }
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
