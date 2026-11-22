# How this repo works

This repo is public and licensed Apache 2.0. Anyone can read every file, commit and pull request.

The rules live in three pages at the root of this repo, and nowhere else in it:

- `RULINGS.md`: how the whole site behaves, and how the sessions work.
- `FAMILY_OPEN_CLOSE.md`: how each family of work opens and closes.
- `AGENT_RULES.md`: the foundational rules every agent reads, rules 1 to 21, and notes for builders.

Each module's own rules are in its `RULINGS.md`: `packages/calvin`, `packages/violet` and `packages/core`. Rules 1 to 21
reach the agents from one file, `packages/core/src/agent-rules.md`, which a test keeps the same as the page. Each
agent's own files, in `src/agents/<agent>/`, hold only what is different for that agent. Only the maintainer changes
any of these. The masters of the three root pages are in the handoff folder.

## The packages

- npm workspaces: `core`, `calvin`, `violet`, and two stubs, `phoebe` and `bridget`.
- Node 24.20.0 exactly, TypeScript 7.0.2, vitest 5.0.5.
- `npm ci`, then `npm run typecheck`, `npm test` and `npm run build`. `npm test` also runs the package, seed, entry
  and paid-code checks in `scripts/`.
- Strict typing is on. `tsconfig.base.json` sets `strict` and extra checks, and every package extends it.
  `packages/calvin/tsconfig.json` leaves two of the extra checks off until the seed's code is brought up to them.
- Every package is marked `private`. Nothing goes to npm yet. `scripts/check-packages.mjs` keeps each package
  private and licensed, with one copyright line and Node pinned.
- Seeded files keep their line endings (`.gitattributes`). `scripts/check-seed.mjs` proves the seed against the
  commit it landed in. `SEEDS.md` records the seed and each release's fingerprints.
- Source documents sit in `sources-local/`, which git ignores. They never enter the repo.

## The handoff folder

- The folder is `%USERPROFILE%\GitHub\handoff\`.
- Session C reads its pastes from `pastes\C.md`. It writes each report to `reports\C.md`, over the last one. It opens
  no other session's files there.
- A carry: check each file's SHA-256 fingerprint, run the name scan on what it carries, and log it in `BUILD_LOG.md`.

## The name scan

- `node scripts/check-names.mjs <folder>` scans a folder. It reads the private list through the `WB_NAMES_LIST`
  variable and stops if that is not set. It never prints the list.
- Check its exit code before posting anything. Do not pipe it into another command that hides the code.
- In CI it runs on every pull request and on `main`. It reads the list from the `NAMES_TO_BLOCK` secret.

## Lanes

The lane label job picks each pull request's lane from its files. The rule is in `.github/lanes/lane-rule.mjs`.

- Lane 1: only `BUILD_PLAN.md`, `BUILD_LOG.md` and `docs/**/*.md`.
- Lane 2: `README.md`.
- Lane 3: every other file.
- A pull request takes the highest lane of any file it touches.

## Commits and pull requests

- Commit with the GitHub no-reply address only.
- Push a branch with `git push -q origin <branch>`, as a command of its own.
- When a force-push would be needed, push a new branch and open a new pull request. Say which one it replaces.
- A pull request's description starts with a block for the maintainer.

## Releases

1. Pack each package twice from `main`, into the handoff folder. Both packs give the same fingerprints. Write
   `SHA256SUMS.txt`.
2. Unpack each packed file into an empty folder. Run the name scan on every file inside, `.map` files included.
3. GitHub's checks pass on the commit being released.
4. Make the annotated tag locally. After "release it", push that one tag by name, never all tags. Then publish the
   GitHub release with the packed files and `SHA256SUMS.txt`.

## Waiting for the maintainer

These rules are not on the rulings page. They stay here until the maintainer places or drops them.

- Every commit ends with a `Grant:` line, above any attribution lines: `open` for the open modules (steps M1 to M9),
  `neither` for planning only, `paid` for paid-layer work, which does not belong here. A commit that mixes kinds of
  work is split in two.
- The engine does every sum. The screen computes nothing.
- Three kinds of value. Project facts come from the project record and are never guessed. Method defaults are
  filled in from cited sources, chosen by the project facts. Anticipated performance starts at a value labelled
  "assumed".
