// Tests for the paid-code scan. Every input here is invented. Run by `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { judgeImport, scanSource, scanTree } from "./check-paid-code.mjs";

const script = fileURLToPath(new URL("./check-paid-code.mjs", import.meta.url));
const root = resolve(tmpdir(), "paid-scan-root");
const file = join(root, "modules", "thing", "a.ts");
const testFile = join(root, "modules", "thing", "a.test.ts");
const kinds = (text, f = file) => scanSource(f, text, root).map((h) => `${h.line}:${h.kind}`);

test("imports that stay inside the folder, React and our own packages are fine", () => {
  assert.equal(judgeImport("./b", file, root), null);
  assert.equal(judgeImport("../../core/agent", file, root), null);
  assert.equal(judgeImport("react", file, root), null);
  assert.equal(judgeImport("react-dom/client", file, root), null);
  assert.equal(judgeImport("@waterbots/core/agent", file, root), null);
});

test("an import that leaves the folder is a paid import", () => {
  assert.equal(judgeImport("../../../../elsewhere/x", file, root), "paid import");
});

test("an import through a folder called paid is a paid import, near or far", () => {
  assert.equal(judgeImport("./_paid/x", file, root), "paid import");
  assert.equal(judgeImport("../paid/x", file, root), "paid import");
  assert.equal(judgeImport("@waterbots/paid-site", file, root), "paid import");
});

test("any other package is an unlisted import", () => {
  assert.equal(judgeImport("lodash", file, root), "unlisted import");
  assert.equal(judgeImport("@/lib/thing", file, root), "unlisted import");
});

test("the test runner and a few Node modules are fine in tests only", () => {
  assert.equal(judgeImport("vitest", testFile, root), null);
  assert.equal(judgeImport("node:fs", testFile, root), null);
  assert.equal(judgeImport("vitest", file, root), "unlisted import");
  assert.equal(judgeImport("node:fs", file, root), "unlisted import");
});

test("server, network and database modules are named as such, even in tests", () => {
  assert.equal(judgeImport("node:http", testFile, root), "server or network code");
  assert.equal(judgeImport("express", file, root), "server or network code");
  assert.equal(judgeImport("node:child_process", testFile, root), "server or network code");
  assert.equal(judgeImport("pg", file, root), "database code");
  assert.equal(judgeImport("@supabase/supabase-js", file, root), "database code");
});

test("all four import shapes are read", () => {
  assert.deepEqual(kinds('import x from "lodash";'), ["1:unlisted import"]);
  assert.deepEqual(kinds('import "lodash";'), ["1:unlisted import"]);
  assert.deepEqual(kinds('const m = await import("lodash");'), ["1:unlisted import"]);
  assert.deepEqual(kinds('const m = require("lodash");'), ["1:unlisted import"]);
  assert.deepEqual(kinds('export * from "lodash";'), ["1:unlisted import"]);
});

test("network, server and environment code is found", () => {
  assert.deepEqual(kinds("const r = await fetch(url);"), ["1:server or network code"]);
  assert.deepEqual(kinds("new WebSocket(u)"), ["1:server or network code"]);
  assert.deepEqual(kinds("navigator.sendBeacon(u)"), ["1:server or network code"]);
  assert.deepEqual(kinds('"use server";'), ["1:server or network code"]);
  assert.deepEqual(kinds("const k = process.env.SOMETHING;"), ["1:environment variable"]);
  assert.deepEqual(kinds("const k = import.meta.env.SOMETHING;"), ["1:environment variable"]);
  assert.deepEqual(kinds("indexedDB.open('x')"), ["1:database code"]);
});

test("comments do not trip the code checks, but words are checked everywhere", () => {
  assert.deepEqual(kinds("// no fetch( here, no process.env either"), []);
  assert.deepEqual(kinds("/**\n * uses process.env in the story\n */"), []);
  assert.deepEqual(kinds("// the paywall lives elsewhere"), ["1:paid-only word"]);
});

test("paid-only words are whole words, any case", () => {
  assert.deepEqual(kinds("const Subscription = 1;"), ["1:paid-only word"]);
  assert.deepEqual(kinds("a stripe of paint"), ["1:paid-only word"]);
  assert.deepEqual(kinds("subscriptions are fine in this test"), []);
  assert.deepEqual(kinds("nothing to see"), []);
});

test("words are checked in files that are not code, code checks are not", () => {
  const yaml = join(root, "agents", "x.yaml");
  assert.deepEqual(kinds("note: see the billing page", yaml), ["1:paid-only word"]);
  assert.deepEqual(kinds("fetch( is just text in a yaml file", yaml), []);
});

function tree() {
  const dir = mkdtempSync(join(tmpdir(), "paid-scan-"));
  mkdirSync(join(dir, "src"));
  mkdirSync(join(dir, "checks"));
  mkdirSync(join(dir, "node_modules"));
  writeFileSync(join(dir, "src", "ok.ts"), 'import { useState } from "react";\nexport const a = 1;\n');
  writeFileSync(join(dir, "src", "bad.ts"), 'import x from "lodash";\nconst k = process.env.A;\n');
  writeFileSync(join(dir, "checks", "log.txt"), "the paywall\n");
  writeFileSync(join(dir, "node_modules", "n.ts"), "fetch(1)\n");
  writeFileSync(join(dir, "src", "blob.bin"), Buffer.from([0, 1, 2, 3]));
  return dir;
}

test("scanTree reads text files, skips binaries, checks/ and node_modules", () => {
  const r = scanTree(tree());
  assert.equal(r.files, 2);
  assert.deepEqual(r.findings, [
    { file: "src/bad.ts", line: 1, kind: "unlisted import" },
    { file: "src/bad.ts", line: 2, kind: "environment variable" },
  ]);
});

test("command line: exit 0 when clean, 1 when found, 2 when the folder is missing", () => {
  const dirty = tree();
  const clean = mkdtempSync(join(tmpdir(), "paid-scan-clean-"));
  writeFileSync(join(clean, "a.ts"), "export const a = 1;\n");
  const run = (p) => spawnSync(process.execPath, [script, p], { encoding: "utf8" });
  assert.equal(run(clean).status, 0);
  const bad = run(dirty);
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /src\/bad\.ts:1: unlisted import/);
  assert.equal(run(join(clean, "missing")).status, 2);
});
