import { describe, expect, it } from "vitest";
import { carbonShowsBeside, handsBackTo, readsProjectRecord, WATER_ALWAYS_SHOWS } from "./doors.js";

describe("Violet's doors", () => {
  it("shows carbon beside water only when Phoebe reads it as likely or not enough known (ruling 2026-10-01)", () => {
    expect(carbonShowsBeside("likely")).toBe(true);
    expect(carbonShowsBeside("not enough known")).toBe(true);
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
