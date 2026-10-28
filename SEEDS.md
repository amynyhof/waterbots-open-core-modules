# Seeds

A seed is a one-time copy of finished code, carried into this repo by Amy. Each seed gets one row here. Rows are only ever added. Never rewrite a row.

Before a seed lands, Session C checks this file. If the module already has a row, the seed is refused.

## The ledger

| Module | Packages | Seal tag | Commit | Date | Fingerprint of `carry-hashes.sha256` |
|---|---|---|---|---|---|
| calvin | `calvin`, `core` | `calculator-seal-2026-10-25` | `c94ccc1` | 2026-10-25 | `c334ec8988ed3ecb23c87d67862d5d10b559f227733309b9f2e4b7d3c0d41aac` |

A seal tag is a permanent, named marker on one commit in the private repo. It says which version may be carried. The tag covers both the engine (gs4gg-carbon, version 0.19.0) and the module.

A fingerprint is a scrambled code that changes if even one byte of the file changes. The seed came with a list of 67 of them, one per file. That list is kept here, exactly as it arrived, in `seeds/calvin/carry-hashes.sha256`.

## Calvin: what was checked

Seed built by Session A on 2026-10-25. It was read from the handoff folder and nothing was written there.

| # | Check | Result | Where |
|---|---|---|---|
| 1 | Seal check: the tag exists and holds the engine and the module | Cited, not rerun. The tag is on the private side. Session A: pass. | Session A's `checks/1-seal-check-and-match.log` |
| 2 | Ledger check: calvin was not already listed in this file | Pass. There was no `SEEDS.md` before this one. | This pull request |
| 3 | Number gate | **Not run here. Known gap.** Session A: pass. | `checks/3-number-gate.log` |
| 4 | Name scan | Pass. 75 files, 38 entries, no finding. Session A: pass. The script finds the private list through the `WB_NAMES_LIST` variable and stops if it is unset. | `scripts/check-names.mjs`; `checks/4-name-scan.log` |
| 5 | Copied-text check | **Not run here. Known gap.** Session A: pass. | `checks/5-copied-text.log` |
| 6 | Paid-code scan | Pass. 68 files, no finding. Session A: pass. | `scripts/check-paid-code.mjs`; `checks/6-paid-code.log` |
| 7 | File fingerprints | Pass. 67 of 67 files match the list. The folder holds exactly the 68 files `MANIFEST.md` lists, no more and no fewer. | `checks/7-hashes.log` |
| 8 | Rights check | Pass. See below. | `checks/8-rights.log` |

Rights, as read here: none of the 12 sources in the filtered index is `permission-required` or `undetermined`, and every source a data file cites has a row. The table of fallback factors holds exactly 6 rows. The baseline-mix file is the labelled stub with no country data.

Proving the numbers, under TypeScript 7.0.2, vitest 5.0.5 and Node 24.20.0:

| Proof | Result |
|---|---|
| Typecheck | Passes |
| The seed's own tests | 13 files, 84 tests, all pass |
| Prove the numbers: re-run every case in `expected-outputs.json` | 48 of 48 match |

This shows nothing broke. It does **not** show the numbers match real filings. That check runs privately, outside this repo.

Session A's output for checks 1 and 3 to 8 sits in the `checks/` folder of the seed, in the handoff folder. It is cited here, not copied.

## Known gaps

1. **Number gate and copied-text check were not run here.** Both need inputs that never leave the private side (the private reference cases, and the standards PDFs). Until the private number list exists and the real gate is built (M1.2), these two rest on Session A's results. Lane 3 review is the cover meanwhile.
2. **Session A's logs hold counts, not fingerprints.** They say "67 files" and "all 67 hashes OK". They name no digest. That the same bytes were checked is shown by the matching counts and by the one fingerprint of the list, not by a digest in the log.
3. **Typecheck settings are looser for `calvin`.** The seed was typechecked with `strict` only. Two of this repo's extra checks (unchecked indexed access, exact optional properties) flag 95 places in the seed's code, so they are off in `packages/calvin/tsconfig.json`. `core` keeps all of them. Seed files were not edited to fit when the seed landed. **To be fixed here,** in this repo, by a normal pull request: Session C brings the code up to both checks, then turns them back on for `calvin`. There is no new seal and no new seed.
4. **No reviewed-version ledger came with the seed.** The folder held no such file. The seal tag above is the only version record. If one exists on the private side, Amy hands it over and it is added as it arrives.
5. **Some comments in the seed use words the repo's word rules restrict** (see `CLAUDE.md`, "Words"). They are in comments, not in names. They were left as they came when the seed landed. They can be changed here by a normal pull request: the seed check reads the seed commit, not today's files. Amy decides whether they are fixed.

## What is not byte for byte

Of the 67 files on the seed's list, 65 are installed, and all 65 match the list. `README.md` and `MANIFEST.md` were written for the person carrying the seed and are not installed.

Added by this repo, not part of the seed: six small files in `packages/calvin/src/modules/core/` that pass the seed's shared imports on to `@waterbots/core`; `prove-expected-outputs.test.ts` (the test printed in the seed's README); the package entries and manifests; and the `.gitattributes` that keeps line endings as they are.

## After the seed: Calvin's home is this repo

Amy ruled on 2026-10-27: since the seed landed, Calvin's home is this repo. Every later change to Calvin (fixes, new features, the screens) is made here, by Session C, through a normal pull request. Nothing is changed in the private repo and carried over. There is no new seal and no new seed for Calvin.

The seed landed on `main` in commit `50fe2f6e4ca6c718757a230c037fb30a7c56c95d` (pull request #5). That commit is the lasting record of what arrived.

`scripts/check-seed.mjs` runs on every `npm test`. It proves the record, and leaves later changes free:

- The seed commit must be in the branch's history.
- Every installed file, as it stood in that commit, must match its fingerprint on the list.
- The list must be unchanged, and its fingerprint must be the one in the ledger above.

It also counts how many seeded files later pull requests have changed. That count is information, not a failure.
