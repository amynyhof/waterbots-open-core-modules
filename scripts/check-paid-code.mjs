// Paid-code scan. This repo holds the open modules only, so nothing in it may reach for the paid site.
//
//   node scripts/check-paid-code.mjs [folder ...]      (default: packages)
//
// It looks for six things. Each finding names the file, the line and the kind, and nothing else.
//   paid import             an import that leaves the scanned folder, or goes through a folder called paid
//   unlisted import         an import that is not relative, React, one of our own packages, or (in tests only) the
//                           test runner and a short list of Node's own modules
//   server or network code  a fetch, a socket, a server action, or one of Node's server modules
//   environment variable    process.env, import.meta.env and the like
//   database code           a database client, or the browser's own database
//   paid-only word          a word that belongs to the paid site's money side
//
// Comments are skipped for the code checks. Words are checked everywhere, comments included.
// Exit codes: 0 nothing found, 1 something found, 2 the scan could not run.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "checks"]);
const CODE_FILE = /\.(?:[mc]?[jt]sx?)$/;
const TEST_FILE = /\.test\.[mc]?[jt]sx?$/;

const OWN_OR_REACT = /^(?:react|react-dom)(?:\/[\w.-]+)*$|^@waterbots\/(?:core|calvin|phoebe|bridget)(?:\/[\w.-]+)*$/;
const TEST_ONLY = new Set(["vitest", "node:fs", "node:path", "node:url", "node:assert", "node:assert/strict", "node:test"]);
const SERVER_MODULES = /^(?:node:)?(?:http|https|http2|net|dgram|dns|tls|child_process|cluster|worker_threads|express|koa|fastify|next(?:\/.*)?)$/;
const DATABASE_MODULES = /^(?:pg|mysql2?|sqlite3|better-sqlite3|mongodb|mongoose|redis|ioredis|knex|drizzle-orm(?:\/.*)?|@prisma\/client|prisma|firebase(?:\/.*)?|@supabase\/.*|@neondatabase\/.*)$/;
const PAID_SEGMENT = /(?:^|\/)(?:_paid|paid)(?:\/|$)|^@waterbots\/paid/;

const CODE_PATTERNS = [
  [/\bfetch\s*\(/, "server or network code"],
  [/\b(?:XMLHttpRequest|WebSocket|EventSource)\b/, "server or network code"],
  [/\bsendBeacon\b/, "server or network code"],
  [/["']use server["']/, "server or network code"],
  [/\b(?:process|Deno|Bun)\.env\b|\bimport\.meta\.env\b/, "environment variable"],
  [/\bindexedDB\b/, "database code"],
];

const PAID_WORDS = ["paywall", "subscription", "subscriber", "billing", "invoice", "checkout", "stripe"];
const WORD_PATTERN = new RegExp(`(?<![A-Za-z0-9])(?:${PAID_WORDS.join("|")})(?![A-Za-z0-9])`, "i");

const IMPORT_PATTERNS = [
  /\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];

function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("/*") || t.startsWith("*");
}

/** Judges one import. `file` and `root` are absolute paths. Returns a kind, or null when the import is fine. */
export function judgeImport(spec, file, root) {
  if (PAID_SEGMENT.test(spec)) return "paid import";
  if (spec.startsWith(".")) {
    const target = resolve(dirname(file), spec);
    const inside = target === root || target.startsWith(root + sep);
    return inside ? null : "paid import";
  }
  if (SERVER_MODULES.test(spec)) return "server or network code";
  if (DATABASE_MODULES.test(spec)) return "database code";
  if (OWN_OR_REACT.test(spec)) return null;
  if (TEST_FILE.test(file) && TEST_ONLY.has(spec)) return null;
  return "unlisted import";
}

/** Scans one file's text. `file` and `root` are absolute. Returns [{ line, kind }]. */
export function scanSource(file, text, root) {
  const hits = [];
  const isCode = CODE_FILE.test(file);
  text.split(/\r?\n/).forEach((line, i) => {
    const n = i + 1;
    const kinds = new Set();
    if (WORD_PATTERN.test(line)) kinds.add("paid-only word");
    if (isCode && !isCommentLine(line)) {
      for (const re of IMPORT_PATTERNS) {
        for (const m of line.matchAll(re)) {
          const kind = judgeImport(m[1], file, root);
          if (kind) kinds.add(kind);
        }
      }
      for (const [re, kind] of CODE_PATTERNS) if (re.test(line)) kinds.add(kind);
    }
    for (const kind of kinds) hits.push({ line: n, kind });
  });
  return hits;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP_DIRS.has(e.name)) return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

/** Scans every text file under `root`. Returns findings (file path relative to root) and a file count. */
export function scanTree(root) {
  const abs = resolve(root);
  const findings = [];
  let files = 0;
  for (const f of walk(abs)) {
    const buf = readFileSync(f);
    if (buf.subarray(0, 8000).includes(0)) continue;
    files++;
    for (const h of scanSource(f, buf.toString("utf8"), abs)) {
      findings.push({ file: relative(abs, f).split(sep).join("/"), ...h });
    }
  }
  return { findings, files };
}

export function main(argv, cwd = process.cwd(), out = console.log, err = console.error) {
  const targets = argv.length ? argv : ["packages"];
  let total = 0;
  let files = 0;
  for (const t of targets) {
    const abs = resolve(cwd, t);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) {
      err("paid-code scan: a folder to scan does not exist. No result.");
      return 2;
    }
    const r = scanTree(abs);
    files += r.files;
    total += r.findings.length;
    for (const f of r.findings) out(`${t}/${f.file}:${f.line}: ${f.kind}`);
  }
  out(`paid-code scan: ${files} file(s): ${total} finding(s)`);
  return total === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = main(process.argv.slice(2));
}
