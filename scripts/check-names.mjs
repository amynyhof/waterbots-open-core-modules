// Name scan. Checks every file name and every line of text against a private list of names.
//
//   node scripts/check-names.mjs [file-or-folder ...]
//
// The list lives outside this repo and is read in place. It is never copied, never printed and never logged.
// Where the list is: the WB_NAMES_LIST variable holds its full path. There is no default path in the code.
// If the variable is unset or empty, or the path points at nothing readable, the scan stops (see below).
//
// One entry per line. `#` starts a comment. Blank lines are skipped. An entry may end in
// `| allowed on copyright and licence lines only`: it is then let through on lines that say
// copyright, licence or SPDX, and nowhere else.
//
// Matching is by whole word, upper or lower case. A space, dot, dash or underscore inside an entry matches any
// of those, or nothing. So `Ada Lovelace` also finds `ada_lovelace` and `AdaLovelace`.
//
// Fails closed: an unset variable, or a missing, unreadable or empty list, stops the run with exit code 2 and no result.
// Output is file, line and kind only. A file whose own name is a hit is shown as "(path hidden)".
//
// Exit codes: 0 nothing found, 1 something found, 2 the scan could not run.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SKIP_DIRS = new Set([".git", "node_modules", "dist"]);
const COPYRIGHT_LINE = /copyright|licen[cs]e|©|\(c\)|SPDX/i;
const ALLOW_MARK = /\|\s*allowed on copyright and licence lines only\s*$/i;

export class ListError extends Error {}

/** Turns the text of the list into entries. Throws ListError when nothing usable is in it. */
export function parseNames(text) {
  const entries = [];
  for (const raw of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const copyrightOnly = ALLOW_MARK.test(line);
    const name = line.replace(ALLOW_MARK, "").trim();
    const parts = name.split(/[\s_.\-]+/).filter(Boolean).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (parts.length === 0) continue;
    const pattern = new RegExp(`(?<![A-Za-z0-9])${parts.join("[\\s_.\\-]*")}(?![A-Za-z0-9])`, "i");
    entries.push({ pattern, copyrightOnly });
  }
  if (entries.length === 0) throw new ListError("the names list holds no entries");
  return entries;
}

/** Reads the list in place. Fails closed: any problem is a ListError. */
export function loadNames(path) {
  if (!path || !existsSync(path)) throw new ListError("the names list is missing");
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    throw new ListError("the names list cannot be read");
  }
  return parseNames(text);
}

/** The list's path, from the WB_NAMES_LIST variable only. Unset or empty is a ListError: there is no default. */
export function listPathFromEnv(env = process.env) {
  const path = (env.WB_NAMES_LIST ?? "").trim();
  if (path === "") throw new ListError("WB_NAMES_LIST is not set");
  return path;
}

/** Lines of `text` that hold a listed name. Returns line numbers only. */
export function scanText(text, entries) {
  const hits = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const isCopyrightLine = COPYRIGHT_LINE.test(line);
    if (entries.some((e) => e.pattern.test(line) && !(e.copyrightOnly && isCopyrightLine))) hits.push(i + 1);
  });
  return hits;
}

/** True when the path itself holds a listed name. */
export function pathHasName(path, entries) {
  return entries.some((e) => e.pattern.test(path.split(sep).join("/")));
}

function isBinary(buf) {
  return buf.subarray(0, 8000).includes(0);
}

/** Scans files under `root`. `files` are paths relative to `root`. Returns findings and counts, never text. */
export function scanFiles(root, files, entries) {
  const findings = [];
  let textFiles = 0;
  let skipped = 0;
  for (const f of files) {
    const shown = pathHasName(f, entries) ? "(path hidden)" : f.split(sep).join("/");
    if (shown === "(path hidden)") findings.push({ file: shown, line: 0, kind: "name in file name" });
    const buf = readFileSync(join(root, f));
    if (isBinary(buf)) {
      skipped++;
      continue;
    }
    textFiles++;
    for (const line of scanText(buf.toString("utf8"), entries)) findings.push({ file: shown, line, kind: "name in text" });
  }
  return { findings, files: files.length, textFiles, skipped };
}

function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP_DIRS.has(e.name)) return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [relative(base, p)];
  });
}

/** The files to scan: tracked files by default, or everything under the folders and files named. */
export function listFiles(targets, cwd) {
  if (targets.length === 0) {
    const out = execFileSync("git", ["ls-files", "-z"], { cwd, encoding: "utf8" });
    return [{ root: cwd, files: out.split("\0").filter(Boolean) }];
  }
  return targets.map((t) => {
    const abs = resolve(cwd, t);
    if (!existsSync(abs)) throw new ListError("a folder or file to scan does not exist");
    return statSync(abs).isDirectory() ? { root: abs, files: walk(abs) } : { root: resolve(abs, ".."), files: [relative(resolve(abs, ".."), abs)] };
  });
}

export function main(argv, env = process.env, cwd = process.cwd(), out = console.log, err = console.error) {
  let entries;
  let sets;
  try {
    entries = loadNames(listPathFromEnv(env));
    sets = listFiles(argv, cwd);
  } catch (e) {
    if (!(e instanceof ListError)) throw e;
    err(`name scan: cannot run (${e.message}). No result.`);
    return 2;
  }
  let total = 0;
  let files = 0;
  let textFiles = 0;
  for (const { root, files: list } of sets) {
    const r = scanFiles(root, list, entries);
    files += r.files;
    textFiles += r.textFiles;
    total += r.findings.length;
    for (const f of r.findings) out(`${f.file}${f.line ? `:${f.line}` : ""}: ${f.kind}`);
  }
  out(`name scan: ${files} file(s), ${textFiles} read as text, ${entries.length} entr${entries.length === 1 ? "y" : "ies"} (never printed): ${total} finding(s)`);
  return total === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}
