// Release build. Packs the release and checks it before it can leave this machine.
//
//   npm run pack-release
//
// In order, stopping at the first problem:
//   1. The number gate and the name scan read every committed file.
//   2. `core` and `calvin` are built, then packed with `npm pack` into `release/` (not committed).
//   3. Each packed file is unpacked into an empty folder outside the repo. The number gate and the name scan read it
//      there, whole, `dist` included (ruling 2026-11-02 for the name scan; 2026-11-06 for the number gate).
//   4. `release/SHA256SUMS.txt` gets each packed file's fingerprint (a scrambled code that changes if one byte of the
//      file changes).
// A finding, or a check that cannot run, deletes the packed files: nothing half-checked is left to attach.
// Both checks read the private lists in place, through WB_FIGURES_LIST and WB_NAMES_LIST. Without them, no release.
//
// Exit codes: 0 packed and checked, 1 a check found something, 2 a check or a step could not run.
import { execFileSync, execSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "release");
export const PACKAGES = ["@waterbots/core", "@waterbots/calvin"];

/** Runs one check script with the given arguments. Its own output is shown as it is. Returns its exit code. */
function check(script, args) {
  const r = spawnSync(process.execPath, [join(root, "scripts", script), ...args], { cwd: root, stdio: "inherit" });
  return r.status ?? 2;
}

/** Both checks on the same targets. Returns the worst exit code: 2 over 1 over 0. */
function bothChecks(args) {
  return Math.max(check("check-figures.mjs", args), check("check-names.mjs", args));
}

/** Removes only what an earlier run of this script left: packed files and the fingerprint list. */
function clearOut() {
  if (!existsSync(out)) return mkdirSync(out);
  for (const f of readdirSync(out)) if (f.endsWith(".tgz") || f === "SHA256SUMS.txt") rmSync(join(out, f));
}

function main() {
  const stop = (code, why) => {
    clearOut();
    console.error(`pack-release: ${why}. No release files are left.`);
    return code;
  };

  console.log("pack-release: 1 of 4, checking committed files");
  let code = bothChecks([]);
  if (code !== 0) return stop(code, "a check on the committed files did not pass");

  console.log("pack-release: 2 of 4, building and packing");
  clearOut();
  try {
    execSync(`npm run build -w ${PACKAGES[0]} && npm run build ${PACKAGES.slice(1).map((p) => `-w ${p}`).join(" ")}`, { cwd: root, stdio: "inherit" });
    execSync(`npm pack ${PACKAGES.map((p) => `-w ${p}`).join(" ")} --pack-destination "${out}"`, { cwd: root, stdio: "inherit" });
  } catch (e) {
    return stop(2, `the build or the pack failed (${String(e.message).split("\n")[0]})`);
  }
  const packed = readdirSync(out).filter((f) => f.endsWith(".tgz")).sort();
  if (packed.length !== PACKAGES.length) return stop(2, `expected ${PACKAGES.length} packed files, found ${packed.length}`);

  console.log("pack-release: 3 of 4, checking the packed files");
  const work = mkdtempSync(join(tmpdir(), "pack-release-"));
  try {
    for (const file of packed) {
      const into = join(work, file.replace(/\.tgz$/, ""));
      mkdirSync(into);
      // Copied next to the folder and unpacked by a relative path, so `tar` works the same on every system.
      copyFileSync(join(out, file), join(work, file));
      execFileSync("tar", ["-xzf", join("..", file)], { cwd: into });
      code = Math.max(code, bothChecks([join(into, "package")]));
    }
  } catch (e) {
    code = 2;
    console.error(`pack-release: could not unpack (${String(e.message).split("\n")[0]})`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  if (code !== 0) return stop(code, "a check on the packed files did not pass");

  console.log("pack-release: 4 of 4, writing fingerprints");
  const sums = packed.map((f) => `${createHash("sha256").update(readFileSync(join(out, f))).digest("hex")}  ${f}`).join("\n") + "\n";
  writeFileSync(join(out, "SHA256SUMS.txt"), sums);
  process.stdout.write(sums);
  console.log("pack-release: packed and checked. The files are in release/.");
  return 0;
}

process.exitCode = main();
