# Working rules for this repo

REFERENCE PROJECTS — SETTLED, DO NOT ASK AGAIN (ruled 21 Nov 2026)

Never put a reference project's name, ID or documents into code, comments, tests or anything public. The name scan on the private names-to-block list (names and project IDs) is the only check. There is no rule or check on calculation figures. Every older rule about project numbers, figures or a number gate is retired. Do not raise this topic again; if anything seems to conflict, this rule wins. When a new reference project is used, stop and tell the maintainer to add its name and ID to names-to-block and update the three secrets.

This repo is public and licensed Apache 2.0. Anyone can read every file, every commit message and every pull request.
Write as if a stranger is reading — because one will.

## Who does what

| Who | Does | Never does |
|---|---|---|
| **The maintainer** | Decides. Merges every pull request in lanes 2 and 3. Says "release it" for each release. Owns the repo settings, the GitHub secrets and the npm scope. | — |
| **Session C** (the Claude session that owns this repo) | Builds here: code, tests, CI, docs. Works on a branch and opens a pull request. Packs and checks each release. After the maintainer says "release it", pushes that release's tag and publishes it. | Merges. Pushes to `main`. Changes repo settings. Works in any other repo. |
| **The private session** | Installs the **published** packages and runs its own real-filing tests against them. | Reads or works in this repo. |
| **Outside AI review** | Reviews lane 3 pull requests (see below). | Merges. |

Nothing crosses between this repo and the private side except by the maintainer's hand. It crosses as a carry, through the
handoff folder (`%USERPROFILE%\GitHub\handoff\`), and a carry starts only when the maintainer names it (see "Carries" below).

## Hard rules

1. **Rule Zero — stay in this repo.** Never open, read or search the private WaterBots repos, the harness repo or the
   carry folder on this machine. Outside this repo, Session C uses only the handoff folder, and there only what a carry
   or a release needs: it reads a file the maintainer names, read-only, and writes release packs. The one other
   exception: the name scan may read the private name list in place, through the `WB_NAMES_LIST` variable, and
   nothing else in that place.
2. **Nothing private goes in.** No reviewer or partner names or organisations, no secrets or keys. Not in code, tests,
   fixtures, comments, presets, commit messages or PR text. Fixtures are **invented** projects only. Reference projects:
   the rule at the top. The name scan runs on every pull request, on `main`, and on every file inside each packed release.
3. **No standards text.** No standards PDFs, no copied passages, no context packs or retrieval indexes. Cite and link
   instead. Rule cards are **our own wording**, each with its citation and link.
4. **Never merge, never push to `main`, never force-push, never change repo settings.** These are also denied in
   Session C's local settings (`.claude/settings.local.json`, not committed). Lane 1's auto-merge is GitHub's, not
   Session C's. When a force-push would be needed, push to a new branch and open a replacement pull request instead,
   without asking; say which pull request it replaces.
5. **Archive, never delete** the reviewed calculator. When the seed arrives with its reviewed-version ledger, keep the
   ledger exactly as it arrives and only add rows. Never rewrite a row. The ledger, tag names and tag messages never
   name a reviewer or their organisation.
6. **The engine does every sum; the screen computes nothing.**
7. **Do not seed calculator code by hand.** It arrives once, by the maintainer's carry (step M2).
8. **Push a release tag and publish a release only after the maintainer says "release it"** for that release. One tag
   at a time, by name. Never push all tags at once.

## Merge lanes

Every pull request gets a lane. **A CI job picks the lane from the files changed — never the session.** The rule lives
in `.github/lanes/lane-rule.mjs`.

| Lane | Files | How it merges |
|---|---|---|
| **1** | Only `BUILD_PLAN.md`, `BUILD_LOG.md`, `docs/**/*.md` | GitHub merges it on its own once every required check is green (auto-merge). Nobody clicks. A draft never auto-merges. |
| **2** | What visitors see or read: `README.md` for now; screens and copy when they exist | The maintainer merges, then checks the live site. |
| **3** | Everything else: calculator, engine, data, tests, packages, CI, rules files, the lane rule itself, and anything that could leak a real name | Outside AI review, then the maintainer reviews and merges. |

- A file on no list → lane 3.
- A pull request touching more than one lane takes the highest.
- A pull request that changes the lane rule, CI or a rules file (`CLAUDE.md`, `.claude/**`) → lane 3.

**How lane 1 auto-merges.** The lane label job arms GitHub's auto-merge on a lane 1 pull request that is not a draft, and
disarms it on every other pull request. GitHub then merges once every required check is green. It needs two repo settings,
both the maintainer's: "Allow auto-merge" on, and every check that matters on the `main` ruleset's required list.

## Carries

A carry is anything that crosses between this repo and the private side. It goes through the handoff folder
(`%USERPROFILE%\GitHub\handoff\`). A carry starts only when the maintainer names it. For each carry, Session C checks its fingerprints (each
file's SHA-256), runs the name scan on what it carries, and logs it in `BUILD_LOG.md` at the session's close.

## Releases

Session C packs each release from `main` into the handoff folder, with `SHA256SUMS.txt`. Session A no longer re-checks
releases (ruling 2026-11-21). The release check is:

1. Pack twice; both packs give the same fingerprints.
2. Unpack each packed file into an empty folder and run the name scan on every file inside, `.map` files included.
3. GitHub's checks pass on the commit being released.

Then Session C makes the annotated tag and tells the maintainer the title, the notes and the files. After the maintainer
says "release it", Session C pushes that one tag and publishes the GitHub release with the packed files and `SHA256SUMS.txt`.

## The grant line

Every commit ends with a `Grant:` trailer on its own line, above any attribution lines:

- `Grant: open` — work whose product is the open modules (all of steps M1 to M9).
- `Grant: neither` — planning only (for example, editing `BUILD_PLAN.md` or `BUILD_LOG.md`).
- `Grant: paid` — paid-layer work. It should not appear in this repo.

A commit that mixes kinds of work is split into two commits. Every pull request's **For the maintainer** block names its bucket.

## Pull requests

- One step, or one coherent part of a step, per pull request: something the maintainer can check in one sitting and undo in one
  motion.
- Start the description with a **For the maintainer** block in plain words: what changed, what to check, the lane, the grant
  bucket, and anything that needs the maintainer's decision.
- Update `BUILD_LOG.md` with what was done; tick items in `BUILD_PLAN.md`.
- A pull request title, commit message or description never names what is being removed. Say what the change does in
  plain words ("Tidy paths and comments"), not what it takes out.

## Close-out

At each family close (the close of work on one of the nine families in `BUILD_PLAN.md`), tidy what you touched (dead code, stale notes, duplicate logic) as part of close-out.

## Plain-English public copy

Everything here is public: README, docs, cards, screen text, commit messages, PR descriptions.

- Short sentences. One idea per sentence.
- Explain a technical word the first time it appears ("a keyed fingerprint — a scrambled code that can only be made or
  checked with a secret key").
- Say who does what: "The maintainer merges", not "it is merged".
- Credit a ruling by its date, not by a person: "ruling 2026-10-27", not "the maintainer ruled on 2026-10-27".
- Opening values are either cited or labelled "starting point". Notes say which way credits move; they hold no
  computed number.
- Keep the **default** and the **cap** of the litres slider as two separate things, in code and on screen.

### Where a value comes from

Every value shown to a user says where it came from. It never credits a ruling or a person.
- Entered: the user typed it. The source is the user.
- Default: the site filled it in from a published source (document, section, page). The user's own local value replaces it.
- Calculated: worked out from other values. It shows the source of its formula. (Called "derived" until ruling 2026-11-16.)
- Assumed: expected project performance, labelled 'assumed'. Calvin encourages the user to adjust it to their planned project.

Three kinds of value (Calvin carbon modules):
- Project facts (the project record): the user gives them at intake, and Wellington collects them. Until then, the field shows 'awaiting user project input'. Never guessed.
- Method defaults: at screening, the site fills them in from cited sources, chosen by the user's project facts.
- Anticipated performance (screening and ex-ante): starts at a labelled 'assumed' value. Calvin encourages the user to adjust it to their planned project.

This is settled. Do not raise it again.

Stove and fuel presets: do not raise their sources with the maintainer until the pending permission replies arrive.

### Never write

- A reviewer's or partner's name or organisation. (Reference projects: the rule at the top.)
- Standards text, quoted or paraphrased closely. Cite it instead.
- A credit price. It was removed from the module and appears nowhere.
- Any key, token or password.
- A person's folder path or Windows username. Use a path that names no user, such as `%USERPROFILE%\GitHub\...`.

### Words (ruling 19 Oct 2026)

- **"golden" is banned.** Always say "reference" instead (a reference case, a reference value).
- **WaterBots never says it validates.** "Validate" and "validation" may appear only when explaining what validation
  is and who does it: external auditors. This covers code names too: `checkInput`, not `validateInput`.
- **Never call the site or any module a demo.** It is the real thing.
- No other words are banned.
