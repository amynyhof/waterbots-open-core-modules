# Working rules for this repo

This repo is public and licensed Apache 2.0. Anyone can read every file, every commit message and every pull request.
Write as if a stranger is reading — because one will.

## Who does what

| Who | Does | Never does |
|---|---|---|
| **Amy** | Decides. Merges every pull request. Owns the repo settings, the GitHub secrets and the npm scope. | — |
| **Session C** (the Claude session that owns this repo) | Builds here: code, tests, CI, docs. Works on a branch and opens a pull request. | Merges. Pushes to `main`. Changes repo settings. Works in any other repo. |
| **The private session** | Installs the **published** packages and runs its own real-filing tests against them. | Reads or works in this repo. |
| **Outside AI review** | Reviews lane 3 pull requests (see below). | Merges. |

Nothing crosses between this repo and the private side except by Amy's hand: the seed once, then version numbers and
pass-or-fail results with a reference line — **never a figure.**

## Hard rules

1. **Rule Zero — stay in this repo.** Never open, read or search the private WaterBots repos, the harness repo or the
   carry folder on this machine. The only outside file Session C may read is the brief Amy hands over, read-only.
2. **Nothing private goes in.** No real project figures, no real project names, no reviewer or partner names or
   organisations, no secrets or keys. Not in code, tests, fixtures, comments, presets, commit messages or PR text.
   Fixtures are **invented** projects only.
3. **No standards text.** No standards PDFs, no copied passages, no context packs or retrieval indexes. Cite and link
   instead. Rule cards are **our own wording**, each with its citation and link.
4. **Never merge, never push to `main`, never force-push, never change repo settings.** These are also denied in
   Session C's local settings (`.claude/settings.local.json`, not committed).
5. **Archive, never delete** the reviewed calculator. When the seed arrives with its reviewed-version ledger, keep the
   ledger exactly as it arrives and only add rows. Never rewrite a row. The ledger, tag names and tag messages never
   name a reviewer or their organisation.
6. **The engine does every sum; the screen computes nothing.**
7. **Do not seed calculator code by hand.** It arrives once, by Amy's carry (step M2).

## Merge lanes

Every pull request gets a lane. **A CI job picks the lane from the files changed — never the session.** The rule lives
in `.github/lanes/lane-rule.mjs`.

| Lane | Files | How it merges |
|---|---|---|
| **1** | Only `BUILD_PLAN.md`, `BUILD_LOG.md`, `docs/**/*.md` | All checks green. Amy merges with one click. Auto-merge is built but **off** until the keyed-fingerprint number gate is real. |
| **2** | What visitors see or read: `README.md` for now; screens and copy when they exist | Amy merges, then checks the live site. |
| **3** | Everything else: calculator, engine, data, tests, packages, CI, rules files, the lane rule itself, and anything that could leak a real figure | Amy reviews, plus outside AI review. |

- A file on no list → lane 3.
- A pull request touching more than one lane takes the highest.
- A pull request that changes the lane rule, CI or a rules file (`CLAUDE.md`, `.claude/**`) → lane 3.

## The grant line

Every commit ends with a `Grant:` trailer on its own line, above any attribution lines:

- `Grant: open` — work whose product is the open modules (all of steps M1 to M9).
- `Grant: neither` — planning only (for example, editing `BUILD_PLAN.md` or `BUILD_LOG.md`).
- `Grant: paid` — paid-layer work. It should not appear in this repo.

A commit that mixes kinds of work is split into two commits. Every pull request's **For Amy** block names its bucket.

## Pull requests

- One step, or one coherent part of a step, per pull request: something Amy can check in one sitting and undo in one
  motion.
- Start the description with a **For Amy** block in plain words: what changed, what to check, the lane, the grant
  bucket, and anything that needs her decision.
- Update `BUILD_LOG.md` with what was done; tick items in `BUILD_PLAN.md`.

## Plain-English public copy

Everything here is public: README, docs, cards, screen text, commit messages, PR descriptions.

- Short sentences. One idea per sentence.
- Explain a technical word the first time it appears ("a keyed fingerprint — a scrambled code that can only be made or
  checked with a secret key").
- Say who does what: "Amy merges", not "it is merged".
- Opening values are either cited or labelled "starting point". Notes say which way credits move; they hold no
  computed number.
- Keep the **default** and the **cap** of the litres slider as two separate things, in code and on screen.

### Never write

- A real project's name or figure, or a reviewer's or partner's name or organisation.
- Standards text, quoted or paraphrased closely. Cite it instead.
- A credit price. It was removed from the module and appears nowhere.
- Any key, token or password.

### Words (Amy, 19 Oct 2026)

- **"golden" is banned.** Always say "reference" instead (a reference case, a reference value).
- **WaterBots never says it validates.** "Validate" and "validation" may appear only when explaining what validation
  is and who does it: external auditors.
- **Never call the site or any module a demo.** It is the real thing.
- No other words are banned.
