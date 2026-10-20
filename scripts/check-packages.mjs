// Guards the package boxes. Run by `npm test` and so by CI.
//   - every package is marked private (nothing goes to npm yet) and Apache-2.0
//   - every package carries a copy of the root LICENSE, a NOTICE and a README that says it is empty
//   - names are the four from the plan, and nothing else sits in packages/
// When a package is first released, Amy rules on it and this file changes in the same lane 3 pull request.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED = ["bridget", "calvin", "core", "phoebe"];
const root = fileURLToPath(new URL("..", import.meta.url));
const licence = readFileSync(join(root, "LICENSE"), "utf8");
const errors = [];

const found = readdirSync(join(root, "packages"), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();
if (found.join() !== EXPECTED.join()) errors.push(`packages/ holds [${found}], expected [${EXPECTED}]`);

for (const name of found) {
  const dir = join(root, "packages", name);
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  if (pkg.name !== `@waterbots/${name}`) errors.push(`${name}: name is ${pkg.name}`);
  if (pkg.private !== true) errors.push(`${name}: must be "private": true until Amy rules on its first release`);
  if (pkg.license !== "Apache-2.0") errors.push(`${name}: license must be Apache-2.0`);
  for (const f of ["LICENSE", "NOTICE", "README.md"]) {
    if (!existsSync(join(dir, f))) errors.push(`${name}: missing ${f}`);
  }
  if (existsSync(join(dir, "LICENSE")) && readFileSync(join(dir, "LICENSE"), "utf8") !== licence) {
    errors.push(`${name}: LICENSE differs from the root LICENSE`);
  }
  if (existsSync(join(dir, "README.md")) && !/empty for now/i.test(readFileSync(join(dir, "README.md"), "utf8"))) {
    errors.push(`${name}: README must say it is empty for now`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `check-packages: ${e}`).join("\n"));
  process.exit(1);
}
console.log(`check-packages: ok (${found.length} packages)`);
