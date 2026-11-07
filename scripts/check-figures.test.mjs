// Tests for the number gate. Every number, word and marker here is made up. Run by `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import {
  parseFigures,
  parseRegistry,
  figureForms,
  fingerprint,
  scanText,
  scanFiles,
  scanPush,
  pushedTips,
  main,
  ListError,
  CI_NOTICE,
  MARKER_FINGERPRINT,
} from "./check-figures.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "number-gate-"));
const MARKER_LINE = "# ---- made-up marker: built part below ----";
const MARKER = fingerprint(MARKER_LINE);

// A made-up figures list: a hand-kept part, the marker, and a built part.
const FIGURES = [
  "# hand-kept",
  "73914",
  "Quillwort Basin | from case-k1",
  "",
  `  ${MARKER_LINE}  `,
  "48213.7 | from case-b2, case-b3",
  "6,052.81",
  "-907.25",
  "0.0418",
  "0.041",
  "42",
  "5190 | allowed in notes/made-up.md",
].join("\n");
const NAMES = ["# names", "Zelda Quimby", "40417", "77 | allowed on copyright and licence lines", ""].join("\n");

const lists = () => {
  const f = parseFigures(FIGURES, MARKER);
  const r = parseRegistry(NAMES);
  return { entries: [...f.entries, ...r], short: f.short };
};
const lines = (text, path) => scanText(text, lists(), path).filter((h) => !h.allowed).map((h) => h.line);

test("the list is split at the marker; figures, words and short figures are told apart", () => {
  const { entries, short } = parseFigures(FIGURES, MARKER);
  assert.deepEqual(entries.map((e) => e.kind), ["figure", "word", "figure", "figure", "figure", "figure", "figure"]);
  assert.equal(short, 2, "0.041 and 42 have two significant digits");
  assert.equal(entries[1].from, "case-k1");
});

test("the code ships with no marker fingerprint until the maintainer supplies one, so a real run stops", () => {
  assert.equal(typeof MARKER_FINGERPRINT, "string");
  assert.match(MARKER_FINGERPRINT, /^(|[0-9a-f]{64})$/);
  assert.throws(() => parseFigures(FIGURES, ""), ListError);
});

test("a list with no marker, or nothing below it, cannot be trusted and stops the run", () => {
  assert.throws(() => parseFigures("73914\n48213.7\n", MARKER), /no marker/);
  assert.throws(() => parseFigures(`73914\n${MARKER_LINE}\n# only a note\n`, MARKER), /nothing below/);
  assert.throws(() => parseFigures(`73914\n${MARKER_LINE} extra\n48213.7\n`, MARKER), /no marker/, "the whole line must be the marker");
  assert.throws(() => parseFigures(`73914\n${MARKER_LINE.toUpperCase()}\n48213.7\n`, MARKER), /no marker/, "case counts");
});

test("an option the gate does not know stops it", () => {
  assert.throws(() => parseFigures(`${MARKER_LINE}\n48213.7 | allowed everywhere\n`, MARKER), ListError);
  assert.throws(() => parseFigures(`${MARKER_LINE}\n | from case-x\n`, MARKER), ListError);
});

test("significant digits: leading zeros never count, trailing zeros do", () => {
  assert.equal(figureForms("0.0418").significant, 3);
  assert.equal(figureForms("0.041").significant, 2);
  assert.equal(figureForms("5100").significant, 4);
  assert.equal(figureForms("3.50").significant, 3);
  assert.equal(figureForms("007").significant, 1);
  assert.equal(figureForms("-6,052.81").significant, 6);
});

test("a figure is hunted as written, without commas, and at 1000 or more with US thousands commas", () => {
  assert.deepEqual(figureForms("48213.7").forms, ["48213.7", "48,213.7"]);
  assert.deepEqual(figureForms("6,052.81").forms, ["6,052.81", "6052.81"]);
  assert.deepEqual(figureForms("6,052.80").forms, ["6,052.80", "6052.80", "6,052.8"], "the value form drops trailing decimal zeros");
  assert.deepEqual(figureForms("907.25").forms, ["907.25"], "under 1000: no comma form");
  assert.deepEqual(figureForms("-1234567").forms, ["-1234567", "-1,234,567"]);
});

test("a figure matches with no digit or point before it and no digit after it; letters may touch", () => {
  assert.deepEqual(lines("a\nyield 48213.7 m3\nb"), [2]);
  assert.deepEqual(lines("48,213.7\n6052.81\n6,052.81"), [1, 2, 3]);
  assert.deepEqual(lines("x48213.7kg\n(48213.7)\n48213.7%"), [1, 2, 3]);
  assert.deepEqual(lines("148213.7\n48213.75\n0.48213.7\nv1.48213.7"), [], "digit before, digit after, or point before");
  assert.deepEqual(lines("73914.25"), [1], "a whole-number figure matches the whole part of a longer decimal");
});

test("what is never matched: scientific notation, spaced thousands, an added zero, rounding", () => {
  assert.deepEqual(lines("4.82137e4\n48 213.7\n48213.70\n48213.8\n48214\n6052.8"), []);
});

test("a minus in the figure must be in the text; a figure with no minus also matches with one", () => {
  assert.deepEqual(lines("-907.25\n907.25\n−907.25"), [1]);
  assert.deepEqual(lines("-73914"), [1]);
});

test("short figures are not hunted", () => {
  assert.deepEqual(lines("0.041 and 42"), []);
});

test("a word matches anywhere, in any case", () => {
  assert.deepEqual(lines("QUILLWORT BASIN\nupper quillwort basins\nQuillwort-Basin"), [1, 2]);
});

test("registry numbers from the name list: exact digits, no digit either side, no minimum length", () => {
  assert.deepEqual(parseRegistry(NAMES).map((e) => e.forms[0]), ["40417", "77"]);
  assert.deepEqual(lines("id 40417\nGS40417x\n404170\n140417\nzelda quimby"), [1, 2], "names are the name scan's job");
  assert.deepEqual(lines("page 77"), [1]);
  assert.deepEqual(lines("4.77"), [1], "a point before is fine for a registry number");
});

test("'allowed in' lets a value through in files whose path ends with it, and nowhere else", () => {
  const l = lists();
  assert.deepEqual(scanText("5190", l, "docs/notes/made-up.md"), [{ line: 1, from: null, allowed: "allowed in this file" }]);
  assert.deepEqual(scanText("5190", l, "docs/other.md").map((h) => h.allowed), [null]);
  assert.deepEqual(scanText("5190", l, null).map((h) => h.allowed), [null], "a message has no path, so no allowance");
});

test("files: every text file is read, dist, source maps and files with no extension included; names too", () => {
  const dir = tmp();
  mkdirSync(join(dir, "dist"));
  writeFileSync(join(dir, "dist", "index.js.map"), '{"mappings":"","sourcesContent":["const y = 48213.7"]}');
  writeFileSync(join(dir, "LICENSE"), "plain\nQuillwort basin\n");
  writeFileSync(join(dir, "report-73914.txt"), "nothing here\n");
  writeFileSync(join(dir, "image.bin"), Buffer.from([0, 1, 2, 0x37, 0x33, 0x39, 0x31, 0x34]));
  const r = scanFiles(dir, ["dist/index.js.map", "LICENSE", "report-73914.txt", "image.bin"], lists());
  assert.deepEqual(
    r.findings.map((f) => `${f.file}:${f.line}:${f.kind}`),
    ["dist/index.js.map:1:listed value in text", "LICENSE:2:listed value in text", "(path hidden):0:listed value in file name"],
  );
  assert.equal(r.textFiles, 3);
});

function writeLists(dir) {
  const figures = join(dir, "figures.txt");
  const names = join(dir, "names.txt");
  writeFileSync(figures, FIGURES);
  writeFileSync(names, NAMES);
  return { WB_FIGURES_LIST: figures, WB_NAMES_LIST: names };
}

function capture(argv, env, cwd, stdin = "") {
  const out = [];
  const err = [];
  const code = main(argv, env, cwd, (s) => out.push(s), (s) => err.push(s), () => stdin, MARKER);
  return { code, text: [...out, ...err].join("\n") };
}

test("output names file, line, kind and 'from' ids, never the figure", () => {
  const dir = tmp();
  const env = writeLists(dir);
  const site = join(dir, "site");
  mkdirSync(site);
  writeFileSync(join(site, "a.md"), "fine\nthe total was 48,213.7 last year\n");
  const r = capture([site], env, dir);
  assert.equal(r.code, 1);
  assert.match(r.text, /a\.md:2: listed value in text \(from case-b2, case-b3\)/);
  for (const secret of ["48213", "48,213", "Quillwort", "73914", "40417"]) assert.equal(r.text.includes(secret), false, secret);
});

test("a clean folder passes, and an allowed hit is counted but does not fail", () => {
  const dir = tmp();
  const env = writeLists(dir);
  const site = join(dir, "site");
  mkdirSync(join(site, "notes"), { recursive: true });
  writeFileSync(join(site, "notes", "made-up.md"), "5190\n");
  const r = capture([site], env, dir);
  assert.equal(r.code, 0);
  assert.match(r.text, /0 finding\(s\), 1 allowed/);
});

test("fails closed: no variable, a missing list, or an empty list gives exit 2 and no result", () => {
  const dir = tmp();
  const env = writeLists(dir);
  assert.equal(capture([dir], {}, dir).code, 2);
  assert.equal(capture([dir], { WB_FIGURES_LIST: env.WB_FIGURES_LIST }, dir).code, 2, "the name list is needed too");
  assert.equal(capture([dir], { ...env, WB_FIGURES_LIST: join(dir, "nope.txt") }, dir).code, 2);
  writeFileSync(join(dir, "empty.txt"), "\n\n");
  assert.equal(capture([dir], { ...env, WB_FIGURES_LIST: join(dir, "empty.txt") }, dir).code, 2);
  const real = main([dir], env, dir, () => {}, () => {}, () => "");
  assert.equal(real, MARKER_FINGERPRINT ? 0 : 2, "with no fingerprint in the code, a real run stops");
});

test("--ci with no list says plainly that the gate ran only locally, with a warning and a summary", () => {
  const dir = tmp();
  const summary = join(dir, "summary.md");
  writeFileSync(summary, "");
  const r = capture(["--ci"], { GITHUB_ACTIONS: "true", GITHUB_STEP_SUMMARY: summary }, dir);
  assert.equal(r.code, 0);
  assert.match(r.text, /ran only locally/);
  assert.match(r.text, /::warning title=Number gate ran only locally::/);
  assert.match(readFileSync(summary, "utf8"), /## Number gate: ran only locally/);
  assert.equal(CI_NOTICE.length > 0, true);
});

test("only --ci may pass without the list: every other mode stops", () => {
  const dir = tmp();
  for (const argv of [[], [dir], ["--push"]]) assert.equal(capture(argv, { GITHUB_ACTIONS: "true" }, dir).code, 2, argv.join(" "));
});

const sh = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

function madeUpRepo() {
  const dir = tmp();
  sh(dir, "init", "-q", "-b", "work");
  sh(dir, "config", "user.email", "test@example.invalid");
  sh(dir, "config", "user.name", "Test");
  sh(dir, "config", "commit.gpgsign", "false");
  sh(dir, "config", "core.autocrlf", "false");
  return dir;
}

test("push: a figure added in one commit and taken out in the next still fails", () => {
  const repo = madeUpRepo();
  writeFileSync(join(repo, "notes.md"), "draft 48213.7\n");
  sh(repo, "add", ".");
  sh(repo, "commit", "-q", "-m", "First");
  writeFileSync(join(repo, "notes.md"), "draft\n");
  sh(repo, "commit", "-q", "-am", "Second");
  const tip = sh(repo, "rev-parse", "HEAD");
  const r = scanPush(repo, [tip], lists());
  assert.deepEqual(r.findings.map((f) => `${f.file}:${f.line}`), ["notes.md:1"]);
});

test("push: commit messages are read, and a deleted ref sends nothing", () => {
  const repo = madeUpRepo();
  writeFileSync(join(repo, "a.txt"), "clean\n");
  sh(repo, "add", ".");
  sh(repo, "commit", "-q", "-m", "Set the total\n\nIt was 6052.81 before.");
  const tip = sh(repo, "rev-parse", "HEAD");
  const r = scanPush(repo, [tip], lists());
  assert.deepEqual(r.findings.map((f) => `${f.file.replace(/[0-9a-f]{7}/, "<id>")}:${f.line}`), ["commit <id> message:3"]);
  const zeros = "0".repeat(40);
  assert.deepEqual(pushedTips(`refs/heads/x ${zeros} refs/heads/x ${tip}\nrefs/heads/work ${tip} refs/heads/work ${zeros}\n`), [tip]);
});

test("push through main: refs on stdin, exit 1 on a hit, 0 when clean", () => {
  const dir = tmp();
  const env = writeLists(dir);
  const repo = madeUpRepo();
  writeFileSync(join(repo, "a.txt"), "clean\n");
  sh(repo, "add", ".");
  sh(repo, "commit", "-q", "-m", "Clean");
  const zeros = "0".repeat(40);
  const clean = sh(repo, "rev-parse", "HEAD");
  assert.equal(capture(["--push"], env, repo, `refs/heads/work ${clean} refs/heads/work ${zeros}\n`).code, 0);
  writeFileSync(join(repo, "b.txt"), "Quillwort Basin\n");
  sh(repo, "add", ".");
  sh(repo, "commit", "-q", "-m", "Add b");
  const dirty = sh(repo, "rev-parse", "HEAD");
  const r = capture(["--push"], env, repo, `refs/heads/work ${dirty} refs/heads/work ${zeros}\n`);
  assert.equal(r.code, 1);
  assert.match(r.text, /b\.txt:1: listed value in text \(from case-k1\)/);
});
