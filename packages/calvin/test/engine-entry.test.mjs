// The engine-only entry, `@waterbots/calvin/engine`, checked in place:
//   1. Nothing it imports reaches React, the screens, the agent code or `@waterbots/core`.
//   2. It gives the same answers as `expected-outputs.json`: 48 of 48.
// `scripts/check-engine-entry.mjs` checks the built entry, installed in a folder with no React.
// Like `src/prove-expected-outputs.test.ts`, this shows nothing broke. It does not show a match to real filings.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as engine from "../src/engine";
import { runTestCases } from "../src/test-cases";

const pkgDir = fileURLToPath(new URL("..", import.meta.url));
const srcDir = join(pkgDir, "src");
const doc = JSON.parse(readFileSync(join(srcDir, "expected-outputs.json"), "utf8"));
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const corePkg = JSON.parse(readFileSync(join(pkgDir, "..", "core", "package.json"), "utf8"));

describe("the engine-only entry", () => {
  it("imports only the engine's own files and data", () => {
    const seen = new Set();
    const todo = [join(srcDir, "engine.ts")];
    while (todo.length) {
      const file = todo.pop();
      if (seen.has(file)) continue;
      seen.add(file);
      if (file.endsWith(".json")) continue;
      for (const [, spec] of readFileSync(file, "utf8").matchAll(/(?:import|export)\s[^;]*?from\s+["']([^"']+)["']/g)) {
        expect(spec.startsWith("."), `${file} imports "${spec}"`).toBe(true);
        const next = resolve(dirname(file), spec.replace(/\.js$/, ""));
        todo.push(next.endsWith(".json") ? next : existsSync(`${next}.ts`) ? `${next}.ts` : `${next}.tsx`);
      }
    }
    const files = [...seen].map((f) => f.slice(srcDir.length + 1).replaceAll("\\", "/"));
    expect(files.length).toBeGreaterThan(1);
    for (const f of files) {
      expect(f === "engine.ts" || f.startsWith("calculators/"), f).toBe(true);
      expect(f.endsWith(".tsx"), f).toBe(false);
    }
  });

  it("is in the package's exports", () => {
    expect(pkg.exports["./engine"]).toEqual({ types: "./dist/engine.d.ts", default: "./dist/engine.js" });
  });

  it("does not need React: React is an optional peer of calvin and core", () => {
    for (const p of [pkg, corePkg]) {
      expect(p.peerDependenciesMeta?.react?.optional, p.name).toBe(true);
      expect(p.dependencies?.react, p.name).toBeUndefined();
    }
  });
});

describe("the engine-only entry gives the same answers as expected-outputs.json", () => {
  const got = runTestCases(engine, doc);

  it("was made by this engine version", () => {
    expect(got.engineVersion).toBe(doc.engineVersion);
  });

  for (const c of doc.cases) {
    it(`${c.id}: the same outputs`, () => {
      expect(got.cases[c.id].held).toEqual([]);
      expect(got.cases[c.id].outputs).toEqual(c.outputs);
    });
  }

  for (const c of doc.fnrbCases) {
    it(`${c.id}: the same fNRB result`, () => {
      expect(got.fnrbCases[c.id]).toEqual(c.outputs);
    });
  }

  it("covers 48 checks: the version and every case", () => {
    expect(1 + doc.cases.length + doc.fnrbCases.length).toBe(48);
  });
});
