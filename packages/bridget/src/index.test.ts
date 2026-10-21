import { expect, test } from "vitest";
import { moduleName } from "./index.js";

test("bridget is an empty stub that builds", () => {
  expect(moduleName).toBe("bridget");
});
