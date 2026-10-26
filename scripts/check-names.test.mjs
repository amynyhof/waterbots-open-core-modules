// Tests for the name scan. Every name here is invented. Run by `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseNames, loadNames, scanText, pathHasName, scanFiles, ListError } from "./check-names.mjs";

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

function run(args, listPath) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, CARRY_NAMES_FILE: listPath },
  });
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

  for (const r of [ok, bad, missing]) {
    const all = (r.stdout + r.stderr).toLowerCase();
    for (const secret of ["zelda", "quimby", "plinth", "orrery", "40417", "harbour", "voss"]) {
      assert.equal(all.includes(secret), false, `output must not contain "${secret}"`);
    }
  }
});

test("command line: a missing folder to scan is a failed run, not a pass", () => {
  const dir = tmp();
  const list = join(dir, "list.txt");
  writeFileSync(list, LIST);
  assert.equal(run([join(dir, "no-such-folder")], list).status, 2);
});
