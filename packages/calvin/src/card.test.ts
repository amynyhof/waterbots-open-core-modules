// calvin's card: its version is the package's own, the same in every file that names it.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AGENT_CARD, VERSION } from "./card.js";

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("calvin's card for the Agent Commons", () => {
  it("gives the package's own version, as package.json and config.yaml do", () => {
    const pkg = JSON.parse(read("../package.json")) as { version: string };
    expect(VERSION).toBe(pkg.version);
    expect(AGENT_CARD.version).toBe(pkg.version);
    const configVersion = /^version: (\S+)/m.exec(read("./agents/calvin/config.yaml"))?.[1];
    expect(configVersion).toBe(pkg.version);
  });
  it("names itself", () => {
    expect(AGENT_CARD.id).toBe("calvin");
  });
});
