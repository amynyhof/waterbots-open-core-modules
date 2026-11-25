// Violet's agent files. Read as text; nothing here runs a model.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Line endings are set aside: one copy of the repo may give a file CRLF and another LF.
const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8").replace(/\r\n/g, "\n");

describe("Violet's agent files", () => {
  it("name her tool and her colour", () => {
    const config = read("./agents/violet/config.yaml");
    expect(config).toMatch(/calc\/vwba-d3\.computeD3/);
    expect(config).toMatch(/#A457D4/);
  });

  // SWITCHED OFF 2026-11-24, never deleted: it expects no colleague's name in her file. The maintainer asked that each
  // calculator agent say Wellington comes next when its part is done. The test after it holds the rest.
  it.skip("keep only what is hers: her tool, the facts it needs and her method's limits", () => {
    const prompt = read("./agents/violet/prompt.md");
    expect(prompt).toMatch(/computeD3/);
    expect(prompt).toMatch(/people or households/);
    expect(prompt).toMatch(/Draft — pending\s+expert review/);
    // Who the rest of the crew are belongs to Wellington, not to her file.
    expect(prompt).not.toMatch(/Wellington|Calvin|Phoebe|Bridget/);
  });

  it("keep only what is hers, and say that Wellington comes next", () => {
    const prompt = read("./agents/violet/prompt.md");
    expect(prompt).toMatch(/computeD3/);
    expect(prompt).toMatch(/people or households/);
    expect(prompt).toMatch(/Draft — pending\s+expert review/);
    expect(prompt).toMatch(/Wellington comes next/);
    // Who the rest of the crew are belongs to Wellington, not to her file.
    expect(prompt).not.toMatch(/Calvin|Phoebe|Bridget/);
  });
});
