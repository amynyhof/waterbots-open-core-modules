// The four doors of agent rule 21, and the lobby chat.
import { expect, test } from "vitest";
import { DOORS, PLACES, hasProjectRecord, isDoor } from "./places";

test("there are four doors, and the lobby chat is a fifth place that is not a door", () => {
  expect(DOORS).toEqual(["free-site", "paid-site", "agent-commons", "mcp"]);
  expect(PLACES).toEqual([...DOORS, "lobby-chat"]);
  expect(isDoor("lobby-chat")).toBe(false);
  for (const d of DOORS) expect(isDoor(d)).toBe(true);
});

test("only the two sites keep a project record", () => {
  expect(PLACES.filter(hasProjectRecord)).toEqual(["free-site", "paid-site"]);
});
