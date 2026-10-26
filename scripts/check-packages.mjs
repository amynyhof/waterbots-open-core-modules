// Guards the package boxes. Run by `npm test` and so by CI.
//   - every package is marked private (nothing goes to npm yet) and Apache-2.0
//   - every package carries a copy of the root LICENSE, a NOTICE and a README. An empty package says so; a seeded
//     package points to SEEDS.md, which must have a row for it
//   - the copyright line is in the root LICENSE and every NOTICE; root engines.node is one exact version
//   - names are the four from the plan, and nothing else sits in packages/
// When a package is first released, Amy rules on it and this file changes in the same lane 3 pull request.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED = ["bridget", "calvin", "core", "phoebe"];
// Packages that have received a seed. Each one is recorded in SEEDS.md. The rest stay empty for now.
const SEEDED = ["calvin", "core"];
const root = fileURLToPath(new URL("..", import.meta.url));
const licence = readFileSync(join(root, "LICENSE"), "utf8");
const errors = [];
const seeds = existsSync(join(root, "SEEDS.md")) ? readFileSync(join(root, "SEEDS.md"), "utf8") : "";
const COPYRIGHT = "Copyright 2026 WaterBots AI, LLC";
if (!licence.includes(COPYRIGHT)) errors.push(`root LICENSE must carry "${COPYRIGHT}"`);
const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (!/^\d+\.\d+\.\d+$/.test(rootPkg.engines?.node ?? "")) errors.push("root engines.node must be one exact version");

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
  if (existsSync(join(dir, "NOTICE")) && !readFileSync(join(dir, "NOTICE"), "utf8").includes(COPYRIGHT)) {
    errors.push(`${name}: NOTICE must carry "${COPYRIGHT}"`);
  }
  if (existsSync(join(dir, "README.md"))) {
    const readme = readFileSync(join(dir, "README.md"), "utf8");
    if (SEEDED.includes(name)) {
      if (!readme.includes("SEEDS.md")) errors.push(`${name}: README must point to SEEDS.md, which records the seed`);
    } else if (!/empty for now/i.test(readme)) {
      errors.push(`${name}: README must say it is empty for now`);
    }
  }
  if (SEEDED.includes(name) && !seeds.includes(`\`${name}\``)) errors.push(`${name}: SEEDS.md has no row for it`);
}

if (errors.length) {
  console.error(errors.map((e) => `check-packages: ${e}`).join("\n"));
  process.exit(1);
}
console.log(`check-packages: ok (${found.length} packages)`);
