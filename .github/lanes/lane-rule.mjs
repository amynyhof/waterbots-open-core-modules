// The merge-lane rule. Changing this file puts the pull request in lane 3.
//
// Lane 1: plain-writing files only (BUILD_PLAN.md, BUILD_LOG.md, docs/**/*.md).
// Lane 2: what visitors see or read (README.md for now).
// Lane 3: everything else. A file on no list is lane 3.
// A pull request takes the highest lane of any file it touches,
// counting both the old and the new path of a renamed file.

const LANE_1 = [/^BUILD_PLAN\.md$/, /^BUILD_LOG\.md$/, /^docs\/(?:[^/]+\/)*[^/]+\.md$/];
const LANE_2 = [/^README\.md$/];

// GitHub lists at most 3000 files for a pull request. At that size we cannot
// see every file, so the pull request is lane 3.
export const MAX_FILES = 3000;

export function laneForPath(path) {
  if (typeof path !== "string" || path === "" || path.includes("..") || path.startsWith("/")) return 3;
  if (LANE_1.some((re) => re.test(path))) return 1;
  if (LANE_2.some((re) => re.test(path))) return 2;
  return 3;
}

// files: [{ filename, previous_filename? }] as the GitHub API returns them.
export function laneForFiles(files) {
  if (!Array.isArray(files) || files.length === 0 || files.length >= MAX_FILES) return 3;
  let lane = 1;
  for (const f of files) {
    const paths = [f?.filename];
    if (f?.previous_filename != null) paths.push(f.previous_filename);
    for (const p of paths) lane = Math.max(lane, laneForPath(p));
  }
  return lane;
}

// CLI: node lane-rule.mjs <files.json>  → prints 1, 2 or 3.
const { pathToFileURL } = await import("node:url");
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { readFileSync } = await import("node:fs");
  let files;
  try {
    files = JSON.parse(readFileSync(process.argv[2], "utf8"));
  } catch {
    files = null;
  }
  process.stdout.write(String(laneForFiles(files)));
}
