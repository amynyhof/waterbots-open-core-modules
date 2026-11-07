// Number gate. Fails if a real project figure appears in what this repo makes public.
//
//   node scripts/check-figures.mjs                    every tracked file, as it is on disk
//   node scripts/check-figures.mjs <file-or-folder>   those files, read whole (an unpacked release, `dist` included)
//   node scripts/check-figures.mjs --push             what a push sends (the pre-push hook passes the refs on stdin)
//   node scripts/check-figures.mjs --ci               in CI, where the private lists are absent: says plainly that the
//                                                     gate ran only locally
//
// THE LISTS. Two private lists outside every repo, read in place, never copied, never printed, never logged:
//   - the figures list, whose full path is in the WB_FIGURES_LIST variable;
//   - the name list, whose full path is in WB_NAMES_LIST (the name scan's list). Only its all-digit entries are used
//     here, as registry numbers.
// There is no default path in the code. An unset variable stops the run.
//
// THE RULE. It matches the paid site's number gate, entry for entry (BUILD_LOG.md, 2026-11-06):
//   - Figures list: UTF-8, one entry per line, each line trimmed. Blank lines and lines starting with # are skipped.
//     One marker line splits it: lines above are kept by hand, lines below are built from the real filings. The code
//     holds only the marker's SHA-256 fingerprint (a scrambled code made from the line), never its text. A list with
//     no marker, or nothing below it, stops the run.
//   - Options follow a `|`: "allowed in <path ending>" (no hit in a file whose path ends with that text; it belongs to
//     the value, so it applies wherever the value is listed) and "from <ids>" (neutral ids shown with a hit). Any
//     other option stops the run.
//   - A figure is an entry made of an optional minus, a digit, digits or commas, then optionally a point and digits.
//     Any other entry is a word.
//   - Significant digits: every digit in the entry, less the leading zeros (zeros just after the point included).
//     Trailing zeros count. Only figures with 3 or more are hunted. Shorter ones are counted, never printed.
//   - A figure is matched by its text, not its value. It is hunted as written, without its commas, and, at 1000 or
//     more, as its value printed with US thousands commas (up to 12 decimals). A hit needs no digit and no point just
//     before it, and no digit just after it. Letters may touch it.
//   - Not matched: scientific notation, spaces as thousands separators, an added ".0", rounding, a decimal comma.
//   - A word matches anywhere on a line, any case. A registry number matches its exact digits, with no digit on
//     either side, and has no minimum length.
//   - A hit on a published value in ALLOWED is reported as allowed, not as a hit.
// The paid gate reads only some file types. This gate reads every text file, whatever its name, so source maps and
// files with no extension are read too. It also reads file names, and, on a push, commit and tag messages.
//
// WHAT IS CHECKED, BY MODE:
//   - files: every line of every text file, and every file name.
//   - push: every file in every commit being pushed (so a figure added in one commit and taken out in the next still
//     fails), every file at the tip of each pushed ref, every file and folder name, and every commit and tag message.
//
// Fails closed: an unset variable, a missing, unreadable or empty list, no marker or nothing below it, or an unknown
// option stops the run with exit code 2 and no result. Only --ci treats an unset WB_FIGURES_LIST differently: it says
// the gate ran only locally, as a warning, and exits 0. Nothing else does that.
// Output is file, line and kind only, never the figure. A name that holds a figure is shown as "(path hidden)".
//
// Exit codes: 0 nothing found, 1 something found, 2 the gate could not run.
import { readFileSync, readdirSync, statSync, existsSync, appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, sep, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * The SHA-256 fingerprint of the figures list's marker line, trimmed. The text itself stays private. Empty means the
 * maintainer has not supplied it yet, and the gate cannot run on a real list.
 */
export const MARKER_FINGERPRINT = "";

/** Figures hunted only from this many significant digits. */
export const MIN_SIGNIFICANT = 3;

/**
 * Published method values that may appear in this repo, each with its source (document, section, page). A hit on one
 * is reported as allowed. Compared on the entry with its commas removed. Empty for now (ruling 2026-11-06).
 */
export const ALLOWED = [];

const SKIP_DIRS = new Set([".git", "node_modules"]);
const FIGURE = /^-?\d[\d,]*(?:\.\d+)?$/;

export class ListError extends Error {}

export const fingerprint = (text) => createHash("sha256").update(text, "utf8").digest("hex");

/** The text forms a figure is hunted in, and its significant digits. */
export function figureForms(entry) {
  const plain = entry.replace(/,/g, "");
  const significant = entry.replace(/\D/g, "").replace(/^0+/, "").length;
  const forms = new Set([entry, plain]);
  const value = Number(plain);
  if (Math.abs(value) >= 1000) forms.add(value.toLocaleString("en-US", { maximumFractionDigits: 12 }));
  return { forms: [...forms], significant, plain };
}

function parseOptions(parts, lineNo) {
  const allowedIn = [];
  let from = null;
  for (const raw of parts) {
    const opt = raw.trim();
    let m;
    if ((m = /^allowed in\s+(.+)$/i.exec(opt))) allowedIn.push(m[1].trim().replace(/\\/g, "/"));
    else if ((m = /^from\s+(.+)$/i.exec(opt))) from = m[1].trim();
    else throw new ListError(`the option on list line ${lineNo} is not recognised`);
  }
  return { allowedIn, from };
}

/**
 * Turns the figures list into what to hunt. `marker` is the fingerprint of the marker line. Throws ListError when the
 * list cannot be trusted: no marker, nothing below it, nothing to hunt, or an unknown option.
 */
export function parseFigures(text, marker = MARKER_FINGERPRINT) {
  if (!marker) throw new ListError("the marker's fingerprint is not set in the code yet");
  const entries = [];
  const allowances = new Map();
  let short = 0;
  let built = false;
  let builtEntries = 0;
  text.replace(/^﻿/, "").split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!built && line !== "" && fingerprint(line) === marker) {
      built = true;
      return;
    }
    if (line === "" || line.startsWith("#")) return;
    const [value, ...options] = line.split("|");
    const entry = value.trim();
    if (entry === "") throw new ListError(`list line ${i + 1} has options but no entry`);
    const { allowedIn, from } = parseOptions(options, i + 1);
    let item;
    if (FIGURE.test(entry)) {
      const { forms, significant, plain } = figureForms(entry);
      if (significant < MIN_SIGNIFICANT) {
        short++;
        return;
      }
      item = { kind: "figure", forms, key: `figure:${plain}`, plain, from };
    } else {
      item = { kind: "word", forms: [entry.toLowerCase()], key: `word:${entry.toLowerCase()}`, from };
    }
    if (built) builtEntries++;
    entries.push(item);
    if (allowedIn.length) allowances.set(item.key, [...(allowances.get(item.key) ?? []), ...allowedIn]);
  });
  if (!built) throw new ListError("the figures list has no marker line, so no built part");
  if (builtEntries === 0) throw new ListError("the figures list has nothing below its marker line");
  for (const e of entries) e.allowedIn = allowances.get(e.key) ?? [];
  return { entries, short };
}

/** The all-digit entries of the name list, as registry numbers. */
export function parseRegistry(text) {
  const entries = [];
  for (const raw of text.replace(/^﻿/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const entry = line.split("|")[0].trim();
    if (/^\d+$/.test(entry)) entries.push({ kind: "registry", forms: [entry], key: `registry:${entry}`, from: null, allowedIn: [] });
  }
  return entries;
}

function readList(path, what) {
  if (!path || !existsSync(path)) throw new ListError(`the ${what} is missing`);
  try {
    const text = readFileSync(path, "utf8");
    if (text.trim() === "") throw new ListError(`the ${what} is empty`);
    return text;
  } catch (e) {
    if (e instanceof ListError) throw e;
    throw new ListError(`the ${what} cannot be read`);
  }
}

/** The list paths, from WB_FIGURES_LIST and WB_NAMES_LIST only. Either unset is a ListError: there is no default. */
export function listPathsFromEnv(env = process.env) {
  const figures = (env.WB_FIGURES_LIST ?? "").trim();
  const names = (env.WB_NAMES_LIST ?? "").trim();
  if (figures === "") throw new ListError("WB_FIGURES_LIST is not set");
  if (names === "") throw new ListError("WB_NAMES_LIST is not set");
  return { figures, names };
}

/** Reads both lists in place. Fails closed: any problem is a ListError. */
export function loadLists(paths, marker = MARKER_FINGERPRINT) {
  const { entries, short } = parseFigures(readList(paths.figures, "figures list"), marker);
  const registry = parseRegistry(readList(paths.names, "name list"));
  return { entries: [...entries, ...registry], short, counts: count([...entries, ...registry]) };
}

function count(entries) {
  const c = { figure: 0, word: 0, registry: 0 };
  for (const e of entries) c[e.kind]++;
  return c;
}

const isDigit = (ch) => ch !== undefined && ch >= "0" && ch <= "9";

/** True when `form` appears in `line` with the boundaries its kind needs. */
export function entryHits(entry, line) {
  if (entry.kind === "word") return line.toLowerCase().includes(entry.forms[0]);
  for (const form of entry.forms) {
    for (let at = line.indexOf(form); at !== -1; at = line.indexOf(form, at + 1)) {
      const before = line[at - 1];
      const after = line[at + form.length];
      const beforeOk = entry.kind === "figure" ? !isDigit(before) && before !== "." : !isDigit(before);
      if (beforeOk && !isDigit(after)) return true;
    }
  }
  return false;
}

/** True when a hit on this entry, in a file at `path`, is let through. Returns the reason, or null. */
export function allowedReason(entry, path) {
  if (entry.kind === "figure" && ALLOWED.some((a) => a.value.replace(/,/g, "") === entry.plain)) return "published value";
  if (path && entry.allowedIn.some((end) => path.endsWith(end))) return "allowed in this file";
  return null;
}

/**
 * Lines of `text` that hold an entry. Returns { line, from, allowed } only, never the entry. `path` is used for the
 * "allowed in" option; it is null for a commit or tag message.
 */
export function scanText(text, lists, path = null) {
  const hits = [];
  text.split(/\r?\n/).forEach((line, i) => {
    let found = null;
    for (const e of lists.entries) {
      if (!entryHits(e, line)) continue;
      const allowed = allowedReason(e, path);
      if (!allowed) {
        found = { line: i + 1, from: e.from, allowed: null };
        break;
      }
      found ??= { line: i + 1, from: e.from, allowed };
    }
    if (found) hits.push(found);
  });
  return hits;
}

/** True when the path itself holds an entry. */
export function pathHasEntry(path, lists) {
  return lists.entries.some((e) => entryHits(e, path) && !allowedReason(e, path));
}

const isBinary = (buf) => buf.subarray(0, 8000).includes(0);

function record(findings, file, hit, kind) {
  findings.push({ file, line: hit.line, kind: hit.allowed ? `${kind}, allowed (${hit.allowed})` : kind, from: hit.from, allowed: Boolean(hit.allowed) });
}

/** Checks one file's content under its path. Adds findings; returns false when it was skipped as binary. */
function checkContent(path, buf, lists, findings) {
  const hidden = pathHasEntry(path, lists);
  const shown = hidden ? "(path hidden)" : path;
  if (hidden) findings.push({ file: shown, line: 0, kind: "listed value in file name", from: null, allowed: false });
  if (isBinary(buf)) return false;
  for (const hit of scanText(buf.toString("utf8"), lists, path)) record(findings, shown, hit, "listed value in text");
  return true;
}

/** Checks files under `root`. `files` are paths relative to `root`. Returns findings and counts, never text. */
export function scanFiles(root, files, lists) {
  const findings = [];
  let textFiles = 0;
  for (const f of files) {
    if (checkContent(f.split(sep).join("/"), readFileSync(join(root, f)), lists, findings)) textFiles++;
  }
  return { findings, items: files.length, textFiles };
}

function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP_DIRS.has(e.name)) return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [relative(base, p)];
  });
}

/** The files to check: tracked files by default, or everything under the folders and files named. */
export function listFiles(targets, cwd) {
  if (targets.length === 0) {
    const out = execFileSync("git", ["ls-files", "-z"], { cwd, encoding: "utf8" });
    return [{ root: cwd, files: out.split("\0").filter(Boolean) }];
  }
  return targets.map((t) => {
    const abs = resolve(cwd, t);
    if (!existsSync(abs)) throw new ListError("a folder or file to check does not exist");
    return statSync(abs).isDirectory() ? { root: abs, files: walk(abs) } : { root: resolve(abs, ".."), files: [relative(resolve(abs, ".."), abs)] };
  });
}

const git = (cwd, args, input) => execFileSync("git", args, { cwd, input, maxBuffer: 1024 * 1024 * 1024 });

/** The local commits named on the pre-push hook's stdin. A deleted ref (all zeros) sends nothing and is left out. */
export function pushedTips(stdin) {
  return stdin
    .split(/\r?\n/)
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p.length === 4 && !/^0+$/.test(p[1]))
    .map((p) => p[1]);
}

/** Reads many objects at once with `git cat-file --batch`. Returns a map from id to { type, body }. */
function readObjects(cwd, ids) {
  const out = git(cwd, ["cat-file", "--batch"], ids.join("\n") + "\n");
  const objects = new Map();
  let at = 0;
  while (at < out.length) {
    const nl = out.indexOf(10, at);
    const [id, type, size] = out.subarray(at, nl).toString("utf8").split(" ");
    if (type === "missing" || size === undefined) throw new ListError("git could not read an object being pushed");
    const start = nl + 1;
    objects.set(id, { type, body: out.subarray(start, start + Number(size)) });
    at = start + Number(size) + 1;
  }
  return objects;
}

/** The message of a commit or tag: everything after its header. */
function messageOf(body) {
  const s = body.toString("utf8");
  const gap = s.indexOf("\n\n");
  return gap === -1 ? "" : s.slice(gap + 2);
}

/**
 * Checks what a push sends: every object not yet on any remote (so every commit on the way, not only the last), every
 * file at each pushed tip, and every commit and tag message being pushed.
 */
export function scanPush(cwd, tips, lists) {
  const findings = [];
  if (tips.length === 0) return { findings, items: 0, textFiles: 0 };
  const paths = new Map();
  const add = (id, path) => {
    if (!paths.has(id) || (paths.get(id) === null && path !== null)) paths.set(id, path);
  };
  for (const line of git(cwd, ["rev-list", "--objects", ...tips, "--not", "--remotes"]).toString("utf8").split("\n")) {
    if (!line) continue;
    const space = line.indexOf(" ");
    add(space === -1 ? line : line.slice(0, space), space === -1 ? null : line.slice(space + 1));
  }
  for (const tip of tips) {
    for (const entry of git(cwd, ["ls-tree", "-r", "-z", "--full-tree", tip]).toString("utf8").split("\0")) {
      const m = /^\d+ (\w+) ([0-9a-f]+)\t(.*)$/s.exec(entry);
      if (m && m[1] === "blob") add(m[2], m[3]);
    }
  }
  const objects = readObjects(cwd, [...paths.keys()]);
  let textFiles = 0;
  for (const [id, path] of paths) {
    const { type, body } = objects.get(id);
    if (type === "blob") {
      if (checkContent(path ?? `(file ${id.slice(0, 7)})`, body, lists, findings)) textFiles++;
    } else if (type === "tree") {
      if (path && pathHasEntry(path, lists)) findings.push({ file: "(path hidden)", line: 0, kind: "listed value in folder name", from: null, allowed: false });
    } else if (type === "commit" || type === "tag") {
      for (const hit of scanText(messageOf(body), lists)) record(findings, `${type} ${id.slice(0, 7)} message`, hit, "listed value in text");
    }
  }
  return { findings, items: paths.size, textFiles };
}

/** What --ci says when the figures list is absent, which is always in CI. Plain words and a warning, never a quiet pass. */
export const CI_NOTICE = [
  "Number gate: ran only locally. It did not run in CI.",
  "The private figures list never leaves the maintainer's machine, so CI cannot check for real figures.",
  "The gate runs on that machine before every push (the pre-push hook) and on every release build (npm run pack-release).",
  "This green tick says nothing about figures. Lane 3 review still reads every pull request.",
];

function ciNotice(env, out) {
  for (const l of CI_NOTICE) out(l);
  if (env.GITHUB_ACTIONS === "true") {
    out(`::warning title=Number gate ran only locally::${CI_NOTICE[0]} ${CI_NOTICE[1]}`);
    if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `## Number gate: ran only locally\n\n${CI_NOTICE.map((l) => `- ${l}`).join("\n")}\n`);
  }
}

export function main(argv, env = process.env, cwd = process.cwd(), out = console.log, err = console.error, stdin = () => readFileSync(0, "utf8"), marker = MARKER_FINGERPRINT) {
  const ci = argv[0] === "--ci";
  const push = argv[0] === "--push";
  if (ci && (env.WB_FIGURES_LIST ?? "").trim() === "") {
    ciNotice(env, out);
    return 0;
  }
  let lists;
  let results;
  try {
    lists = loadLists(listPathsFromEnv(env), marker);
    if (push) results = [scanPush(cwd, pushedTips(stdin()), lists)];
    else results = listFiles(ci ? [] : argv, cwd).map(({ root, files }) => scanFiles(root, files, lists));
  } catch (e) {
    const why = e instanceof ListError ? e.message : String(e.message ?? e).split("\n")[0];
    err(`number gate: cannot run (${why}). No result.`);
    return 2;
  }
  let hits = 0;
  let allowed = 0;
  let items = 0;
  let textFiles = 0;
  for (const r of results) {
    items += r.items;
    textFiles += r.textFiles;
    for (const f of r.findings) {
      if (f.allowed) allowed++;
      else hits++;
      out(`${f.file}${f.line ? `:${f.line}` : ""}: ${f.kind}${f.from ? ` (from ${f.from})` : ""}`);
    }
  }
  const { figure, word, registry } = lists.counts;
  out(
    `number gate: ${items} ${push ? "object(s) being pushed" : "file(s)"}, ${textFiles} read as text; ` +
      `hunted ${figure} figure(s), ${word} word(s), ${registry} registry number(s); ${lists.short} figure(s) too short to hunt (never printed): ` +
      `${hits} finding(s), ${allowed} allowed`,
  );
  return hits === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}
