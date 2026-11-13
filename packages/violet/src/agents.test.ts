// Violet's agent files. Read as text; nothing here runs a model.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("Violet's agent files", () => {
  it("carry the same base rules as Calvin, word for word", () => {
    expect(read("./agents/_base-rules.md")).toBe(read("../../calvin/src/agents/_base-rules.md"));
  });

  it("name her tool, her colour and both doors", () => {
    const config = read("./agents/violet/config.yaml");
    expect(config).toMatch(/calc\/vwba-d3\.computeD3/);
    expect(config).toMatch(/#A457D4/);
    expect(config).toMatch(/agent-commons:/);
    expect(config).toMatch(/hands back to Wellington/);
  });

  it("tell her to work alone in the Commons and never add water to carbon", () => {
    const prompt = read("./agents/violet/prompt.md");
    expect(prompt).toMatch(/In the Agent Commons, you work alone/);
    expect(prompt).toMatch(/Never send the person to another agent/);
    expect(prompt).toMatch(/Never add a water benefit to a carbon figure/);
  });
});
