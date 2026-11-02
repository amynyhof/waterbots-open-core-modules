// Tests for the name scan. Every name here is invented. Run by `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseNames, loadNames, listPathFromEnv, scanText, pathHasName, scanFiles, repositoryLines, ListError } from "./check-names.mjs";

const script = fileURLToPath(new URL("./check-names.mjs", import.meta.url));
const tmp = () => mkdtempSync(join(tmpdir(), "name-scan-"));
const LIST = [
  "# comments and blank lines are skipped",
  "",
  "Zelda Quimby",
  "plinth-orrery",
  "40417",
  "Harbour Voss | allowed on copyright and licence lines only",
  "",
].join("\n");

test("the list is parsed: comments and blanks skipped, the allowance suffix recognised", () => {
  const entries = parseNames(LIST);
  assert.equal(entries.length, 4);
  assert.deepEqual(entries.map((e) => e.copyrightOnly), [false, false, false, true]);
});

test("a list with no entries is refused", () => {
  assert.throws(() => parseNames("# only a comment\n\n"), ListError);
});

test("matches whole words in any case", () => {
  const entries = parseNames(LIST);
  assert.deepEqual(scanText("one\nZELDA QUIMBY was here\nthree", entries), [2]);
  assert.deepEqual(scanText("a zelda quimby", entries), [1]);
});

test("a space, dot, dash or underscore inside an entry matches any of them, or nothing", () => {
  const entries = parseNames(LIST);
  for (const s of ["zelda_quimby", "zelda-quimby", "zelda.quimby", "ZeldaQuimby", "zelda   quimby"]) {
    assert.deepEqual(scanText(s, entries), [1], s);
  }
  assert.deepEqual(scanText("plinth orrery", entries), [1]);
});

test("does not match inside a longer word or number", () => {
  const entries = parseNames(LIST);
  assert.deepEqual(scanText("zeldaquimbys\nxplinth-orrery\n404170\n140417", entries), []);
  assert.deepEqual(scanText("id 40417.", entries), [1]);
});

test("an entry with the allowance is let through on copyright and licence lines only", () => {
  const entries = parseNames(LIST);
  assert.deepEqual(scanText("Copyright 2026 Harbour Voss", entries), []);
  assert.deepEqual(scanText("# Licence: Harbour Voss", entries), []);
  assert.deepEqual(scanText("written by Harbour Voss", entries), [1]);
  assert.deepEqual(scanText("Copyright 2026 Zelda Quimby", entries), [1], "the allowance is for its own entry only");
});

test("the allowance note works with or without its closing 'only'", () => {
  const entries = parseNames("Merrin Ashgrove | allowed on copyright and licence lines\nTobin Fallowmere | Allowed on copyright and license lines only\n");
  assert.deepEqual(entries.map((e) => e.copyrightOnly), [true, true]);
  assert.deepEqual(scanText("written by Merrin Ashgrove", entries), [1], "the note is not read as part of the name");
  assert.deepEqual(scanText("Copyright 2026 Merrin Ashgrove", entries), []);
  assert.deepEqual(scanText("thanks to Tobin Fallowmere", entries), [1]);
});

test("a note the scan does not know stops it, instead of switching the entry off", () => {
  assert.throws(() => parseNames("Merrin Ashgrove | allowed in footers\n"), ListError);
  assert.throws(() => parseNames("Zelda Quimby\nMerrin Ashgrove |\n"), ListError, "an empty note is not known either");
  const dir = tmp();
  const list = join(dir, "list.txt");
  writeFileSync(list, "Merrin Ashgrove | allowed in footers\n");
  const clean = join(dir, "clean");
  mkdirSync(clean);
  writeFileSync(join(clean, "a.txt"), "hello\n");
  const r = run([clean], list);
  assert.equal(r.status, 2);
  assert.equal((r.stdout + r.stderr).toLowerCase().includes("merrin"), false, "the entry is never printed");
});

test("a person with the allowance is also found by first name alone and by surname alone", () => {
  const entries = parseNames(LIST);
  assert.deepEqual(scanText("ask Harbour about it\nsent to Voss\nharbour_voss", entries), [1, 2, 3]);
  assert.deepEqual(scanText("Copyright 2026 Voss", entries), [], "the allowance covers each part too");
  assert.deepEqual(scanText("Harbourside\nVossberg", entries), [], "still whole words only");
  assert.deepEqual(scanText("Zelda alone\nQuimby alone", entries), [], "entries without the allowance are not split");
});

test("a copyright or licence line must start with one of the set words, after any comment marks", () => {
  const entries = parseNames(LIST);
  for (const s of [
    "Copyright 2026 Harbour Voss",
    "© 2026 Harbour Voss",
    "(c) 2026 Harbour Voss",
    "  // Copyright 2026 Harbour Voss",
    " * Copyright 2026 Harbour Voss",
    "# SPDX-FileCopyrightText: Harbour Voss",
    "<!-- Licence: Harbour Voss -->",
  ]) {
    assert.deepEqual(scanText(s, entries), [], s);
  }
  for (const s of [
    "Harbour Voss holds the copyright",
    "see the licence, Harbour Voss",
    "notes (c) Harbour Voss",
    "Copyrighted by Harbour Voss",
    "SPDX Harbour Voss",
  ]) {
    assert.deepEqual(scanText(s, entries), [1], s);
  }
});

test("the owner in a package.json repository link is let through, and nowhere else", () => {
  const entries = parseNames(LIST);
  const pkg = [
    "{",
    '  "name": "@made-up/thing",',
    '  "repository": {',
    '    "type": "git",',
    '    "url": "git+https://github.com/harbourvoss/made-up-repo.git"',
    "  },",
    '  "homepage": "https://github.com/harbourvoss/made-up-repo#readme",',
    '  "author": "Harbour Voss"',
    "}",
  ].join("\n");
  assert.deepEqual([...repositoryLines(pkg)], [3, 4, 5, 6]);
  assert.deepEqual(scanText(pkg, entries, repositoryLines(pkg)), [7, 8], "the homepage and author fields still hit");
  const dir = tmp();
  writeFileSync(join(dir, "package.json"), pkg);
  writeFileSync(join(dir, "README.md"), "git+https://github.com/harbourvoss/made-up-repo.git\n");
  const r = scanFiles(dir, ["package.json", "README.md"], entries);
  assert.deepEqual(r.findings.map((f) => `${f.file}:${f.line}`), ["package.json:7", "package.json:8", "README.md:1"]);
  const same = (url) => scanText(`  "repository": "${url}",`, entries, new Set([1]));
  assert.deepEqual(same("https://github.com/harbourvoss/made-up-repo"), [], "the short form of the field works too");
  assert.deepEqual(same("https://github.com/someone/harbour-voss"), [1], "only the owner part is let through");
  assert.deepEqual(same("https://github.com/plinth-orrery/made-up-repo"), [], "for an entry without the allowance too");
  assert.deepEqual(same("https://github.com/harbourvoss/made-up-repo by Zelda Quimby"), [1], "the rest of the line is checked");
  assert.deepEqual(same("https://example.org/harbourvoss/made-up-repo"), [1], "only in a GitHub link");
  const other = '{\n  "notRepository": {\n    "url": "https://github.com/harbourvoss/x.git"\n  }\n}';
  assert.deepEqual(scanText(other, entries, repositoryLines(other)), [3], "only in the repository field");
});

test("a file name that holds a name is a hit", () => {
  const entries = parseNames(LIST);
  assert.equal(pathHasName("docs/zelda-quimby/notes.md", entries), true);
  assert.equal(pathHasName("docs/notes.md", entries), false);
});

test("scanFiles reports file and line only, hides a path that holds a name, and skips binary files", () => {
  const dir = tmp();
  mkdirSync(join(dir, "sub"));
  writeFileSync(join(dir, "clean.txt"), "nothing here\n");
  writeFileSync(join(dir, "sub", "a.txt"), "ok\nplinth-orrery\n");
  writeFileSync(join(dir, "zelda_quimby.txt"), "fine\n");
  writeFileSync(join(dir, "blob.bin"), Buffer.from([0, 1, 2, 0x7a, 0x65, 0x6c, 0x64, 0x61]));
  const files = ["clean.txt", "sub/a.txt", "zelda_quimby.txt", "blob.bin"];
  const r = scanFiles(dir, files, parseNames(LIST));
  assert.deepEqual(r.findings, [
    { file: "sub/a.txt", line: 2, kind: "name in text" },
    { file: "(path hidden)", line: 0, kind: "name in file name" },
  ]);
  assert.equal(r.textFiles, 3);
  assert.equal(r.skipped, 1);
});

test("loadNames fails closed when the list is missing or empty", () => {
  const dir = tmp();
  assert.throws(() => loadNames(join(dir, "nope.txt")), ListError);
  assert.throws(() => loadNames(undefined), ListError);
  writeFileSync(join(dir, "empty.txt"), "");
  assert.throws(() => loadNames(join(dir, "empty.txt")), ListError);
  assert.throws(() => loadNames(dir), ListError, "a folder is not a list");
});

test("the list's path comes from WB_NAMES_LIST only; unset or empty is a ListError", () => {
  assert.equal(listPathFromEnv({ WB_NAMES_LIST: "/some/where/list.txt" }), "/some/where/list.txt");
  assert.throws(() => listPathFromEnv({}), ListError);
  assert.throws(() => listPathFromEnv({ WB_NAMES_LIST: "" }), ListError);
  assert.throws(() => listPathFromEnv({ WB_NAMES_LIST: "   " }), ListError);
  assert.throws(() => listPathFromEnv({ CARRY_NAMES_FILE: "/some/where/list.txt" }), ListError, "no other variable counts");
});

// `listPath` null leaves WB_NAMES_LIST unset. The caller's own value is always removed first, so a real list
// on the machine running the tests can never leak into them.
function run(args, listPath, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  delete env.WB_NAMES_LIST;
  if (listPath !== null) env.WB_NAMES_LIST = listPath;
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8", env, cwd: tmp() });
}

test("command line: exit 0 when clean, 1 when found, 2 when the list is missing; no name is ever printed", () => {
  const dir = tmp();
  const list = join(dir, "list.txt");
  writeFileSync(list, LIST);
  const clean = join(dir, "clean");
  const dirty = join(dir, "dirty");
  mkdirSync(clean);
  mkdirSync(dirty);
  writeFileSync(join(clean, "a.txt"), "hello\n");
  writeFileSync(join(dirty, "a.txt"), "hello\nZelda Quimby\n");
  writeFileSync(join(dirty, "plinth-orrery.txt"), "x\n");

  const ok = run([clean], list);
  assert.equal(ok.status, 0);

  const bad = run([dirty], list);
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /a\.txt:2: name in text/);
  assert.match(bad.stdout, /\(path hidden\): name in file name/);

  const missing = run([clean], join(dir, "gone.txt"));
  assert.equal(missing.status, 2);

  const unset = run([clean], null);
  assert.equal(unset.status, 2);
  assert.match(unset.stderr, /WB_NAMES_LIST is not set/);

  // The old variable name is ignored: with only it set, the scan still fails closed.
  const oldName = run([clean], null, { CARRY_NAMES_FILE: list });
  assert.equal(oldName.status, 2);

  for (const r of [ok, bad, missing, unset, oldName]) {
    const all = (r.stdout + r.stderr).toLowerCase();
    for (const secret of ["zelda", "quimby", "plinth", "orrery", "40417", "harbour", "voss"]) {
      assert.equal(all.includes(secret), false, `output must not contain "${secret}"`);
    }
  }
});

test("command line: the list is never looked for in the home folder", () => {
  const dir = tmp();
  const clean = join(dir, "clean");
  mkdirSync(clean);
  writeFileSync(join(clean, "a.txt"), "hello\n");
  const home = join(dir, "home");
  mkdirSync(home);
  writeFileSync(join(home, "list.txt"), LIST);
  const r = run([clean], null, { HOME: home, USERPROFILE: home });
  assert.equal(r.status, 2, "a list sitting in the home folder is not found");
});

test("command line: a folder is scanned whole, built output included, as in an unpacked package", () => {
  const dir = tmp();
  const list = join(dir, "list.txt");
  writeFileSync(list, LIST);
  const pkg = join(dir, "package");
  mkdirSync(join(pkg, "dist"), { recursive: true });
  mkdirSync(join(pkg, "node_modules"));
  writeFileSync(join(pkg, "README.md"), "hello\n");
  writeFileSync(join(pkg, "dist", "engine.js"), "// by Zelda Quimby\n");
  writeFileSync(join(pkg, "node_modules", "x.js"), "// by Zelda Quimby\n");
  const r = run([pkg], list);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /dist[\\/]engine\.js:1: name in text/);
  assert.doesNotMatch(r.stdout, /node_modules/);
});

test("command line: a missing folder to scan is a failed run, not a pass", () => {
  const dir = tmp();
  const list = join(dir, "list.txt");
  writeFileSync(list, LIST);
  assert.equal(run([join(dir, "no-such-folder")], list).status, 2);
});
