// Every class Calvin's screens (and the core parts they use) put on the page is defined in the base styles
// (`@waterbots/core/base.css`) or in Calvin's own stylesheet, so a site without its own design system sees them styled.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pkgs = fileURLToPath(new URL("../../../../../", import.meta.url));
const base = readFileSync(join(pkgs, "core/src/base.css"), "utf8");
const calvin = readFileSync(join(pkgs, "calvin/src/modules/calvin/styles.css"), "utf8");

/** Class names used in the screens' markup: plain strings, template text and string parts of expressions. */
function usedClasses(): Set<string> {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".tsx") && !e.name.includes(".test.")) files.push(p);
    }
  };
  walk(join(pkgs, "calvin/src"));
  walk(join(pkgs, "core/src"));
  const found = new Set<string>();
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/className=(?:"([^"]*)"|\{([^}]*)\})/g)) {
      // In an expression, a string that is only compared against (`tab === "report"`) is not a class.
      const expr = m[2]?.replace(/[!=]==\s*("[^"]*"|'[^']*'|`[^`]*`)/g, "");
      const parts = m[1] !== undefined ? [m[1]] : (expr!.match(/"[^"]*"|`[^`]*`|'[^']*'/g) ?? []).map((s) => s.slice(1, -1));
      for (const part of parts) for (const c of part.replace(/\$\{[^}]*\}/g, " ").split(/\s+/)) if (c) found.add(c);
    }
  }
  return found;
}

/** True when a stylesheet has a rule for the class (a variant such as `hover:x` is written `.hover\:x`). */
const defined = (css: string, c: string) => {
  const selector = "." + c.replace(/:/g, "\\:");
  let at = css.indexOf(selector);
  while (at !== -1) {
    if (!/[\w-]/.test(css[at + selector.length] ?? "")) return true; // a whole class name, not the start of a longer one
    at = css.indexOf(selector, at + 1);
  }
  return false;
};

describe("the base styles", () => {
  const used = usedClasses();
  it("find the screens' classes", () => {
    expect(used.size).toBeGreaterThan(50);
  });
  it("define every class the screens use", () => {
    expect([...used].filter((c) => !defined(base, c) && !defined(calvin, c)).sort()).toEqual([]);
  });
  it("set every token the screens read, with no weight, so a site's own value wins", () => {
    const tokens = new Set<string>();
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name) && !e.name.includes(".test.")) for (const m of readFileSync(p, "utf8").matchAll(/var\((--[a-z0-9-]+)/g)) tokens.add(m[1]!);
      }
    };
    walk(join(pkgs, "calvin/src"));
    walk(join(pkgs, "core/src"));
    expect([...tokens].filter((t) => !base.includes(`${t}:`)).sort()).toEqual([]);
    expect(base).toContain(":where(:root)");
  });
});
