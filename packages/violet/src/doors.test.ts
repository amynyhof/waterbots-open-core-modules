import { describe, expect, it } from "vitest";
import { agentMap } from "@waterbots/core/agentMap";
import { emptyRecord } from "@waterbots/core/record";
import { carbonShowsBeside, handsBackTo, readsProjectRecord, violetCall, WATER_ALWAYS_SHOWS } from "./doors.js";

describe("Violet's doors", () => {
  it("shows carbon beside water only when Phoebe reads it as likely or more to learn (ruling 2026-10-01)", () => {
    expect(carbonShowsBeside("likely")).toBe(true);
    expect(carbonShowsBeside("more to learn")).toBe(true);
    expect(carbonShowsBeside("unlikely")).toBe(false);
    expect(carbonShowsBeside(undefined)).toBe(false);
    expect(WATER_ALWAYS_SHOWS).toBe(true);
  });

  it("in the Agent Commons, works alone: reads no record and hands to no one", () => {
    expect(readsProjectRecord("agent-commons")).toBe(false);
    expect(handsBackTo("agent-commons")).toBeNull();
  });

  it("on the sites, reads the record and hands back to Wellington", () => {
    expect(readsProjectRecord("site")).toBe(true);
    expect(handsBackTo("site")).toBe("Wellington");
  });
});

describe("Violet takes her place from the host (J2)", () => {
  it("on the Free site and the Paid site, reads the record and hands back to Wellington", () => {
    for (const place of ["free-site", "paid-site"] as const) {
      expect(readsProjectRecord(place)).toBe(true);
      expect(handsBackTo(place)).toBe("Wellington");
    }
  });

  it("in the Agent Commons and at MCP, works alone: no record, and she hands to no one", () => {
    for (const place of ["agent-commons", "mcp", "lobby-chat"] as const) {
      expect(readsProjectRecord(place)).toBe(false);
      expect(handsBackTo(place)).toBeNull();
    }
  });
});

describe("the agent map decides whether Violet is called (W2)", () => {
  const read = (reading: "likely" | "unlikely") => {
    const r = emptyRecord();
    r.facts.technology = { label: "Community water supply", code: "CWS", source: { by: "site intake", note: "made up" } };
    r.place.country = { value: "LSO", source: { by: "site intake", note: "made up" } };
    r.pathways.vwba = { reading, reason: "made up", wouldChange: "made up", source: { by: "phoebe", note: "made up" } };
    return r;
  };

  it("on a likely water pathway she is called", () => {
    expect(violetCall(agentMap({ place: "free-site", record: read("likely") }))).toEqual({ agent: "violet", called: true, introduce: true });
  });

  it("on an unlikely water pathway she is not: water no longer always shows", () => {
    expect(violetCall(agentMap({ place: "free-site", record: read("unlikely") }))).toEqual({ agent: "violet", called: false, because: "pathway unlikely" });
  });

  it("opened in the Agent Commons she works alone, and introduces herself", () => {
    expect(violetCall(agentMap({ place: "agent-commons", opened: "violet" }))).toEqual({ agent: "violet", called: true, introduce: true });
  });
});
