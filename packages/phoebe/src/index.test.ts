import { expect, test } from "vitest";
import { moduleName } from "./index.js";

test("the package names itself phoebe", () => {
  expect(moduleName).toBe("phoebe");
});
