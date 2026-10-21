import { expect, test } from "vitest";
import { moduleName } from "./index.js";

test("core is an empty stub that builds", () => {
  expect(moduleName).toBe("core");
});
