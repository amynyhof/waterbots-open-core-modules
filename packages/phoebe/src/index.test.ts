import { expect, test } from "vitest";
import { moduleName } from "./index.js";

test("phoebe is an empty stub that builds", () => {
  expect(moduleName).toBe("phoebe");
});
