# WaterBots rulings — the one page

Only the maintainer changes this page. The master is in the handoff folder; each repo carries an exact copy.

This page is for the three repos and what the sessions build in them. It does not limit the maintainer's own work, such as her emails, contacts, applications and chats.

Rulings live in two places only: this page, for how the whole site behaves; and each module's own short file, for that module. Nothing else in a repo is a ruling.

In force from 22 Nov 2026.

## 1. Private things stay private
- Never put a real person, partner or project name, or a project ID, in code, comments, commits, pull requests or anything public, unless the maintainer says so. The name scan is the check.
- Real filings never enter any repo.
- No secrets, keys or passwords anywhere. No usernames or personal folder paths.
- For all three lines above: titles and messages never name what is being removed.
- WaterBots respects copyright in letter and in spirit. Standards text is cited and linked, never copied. Every release is checked for copied text before it goes out.
- When a new private name comes up, such as a person, partner or project, stop and ask the maintainer to add it to the block list before going on.

## 2. Numbers and values
- No real project's numbers are written into the calculator's code. Nothing made up is ever shown to a visitor as real.
- Source your facts. When an agent gives a fact or a number, it must come from a source that can be found.
- A project fact is never guessed. If it is missing, the box is blank, it never counts as zero, and no figure is shown until it is given.
- Water and carbon are shown side by side, each on its own. WaterBots is still working out whether a developer can claim both together.

## 3. Words
- Call real filings "reference projects" and anything made up "tests", so the maintainer always knows which is which.
- WaterBots never says it validates anything.
- Reading words: likely, more to learn, unlikely. Never "ruled out".
- Public copy is written in 6th grade English. Sources go at the end, marked (ref).

## 4. Agents
- We are guides, not gates.
- Which agents are called is worked out from the project facts. An "unlikely" pathway's agent is not called in the screening; the visitor is told what would change it and may browse it in the Agent Commons.
- When a fact changes, every reading is worked out again from the facts as they stand.
- How agents behave is set in the agent rules, which every agent reads.

## 5. Saving and records
- A project saves only when the user chooses, and only to their own account. The site warns a user before unsaved work is lost.
- Every save reports what the database really did.
- The evidence log is locked. Nothing deletes on its own.
- Every published report pins its exact inputs and versions.

## 6. Two sites, one product
- The paid site and the open site behave the same. A console change goes into the shared spec first, then both sites build it together.
- Both sites install the agents from the open core as a pinned release. The paid site may add more precise data; any difference must be explainable.

## 7. How we work
- One family at a time, across all sessions, until it is closed.
- One session per repo. Sessions never read each other's repos. Pastes, reports and carries travel through the handoff folder. A carry starts only when the maintainer names it.
- Merging. Docs-only changes merge on their own (lane 1). If a visitor can see the change, the maintainer looks at the preview first (lane 2). Everything else is lane 3. Nothing except docs merges without the maintainer's word, naming the pull request. On her word, the session merges it, but only after it confirms that every check has finished and passed, including the secret scans and the name scan. A check that skips on purpose is fine. If any check failed or has not reported, the session does not merge and tells her. Sessions never push straight to main or force-push.
- A release goes out only after the maintainer says "release it". Version tags are never moved or deleted.
- A session stops for anything touching rules, real data, names, money, security or site wording. For anything else it takes the choice it recommends and lists it.
- No new check, gate or approval step without the maintainer's yes.
- Never build, plan or propose a shortcut as if this were a demo. We are building a secure, reliable, production-ready site.
- Keep it light: short pull requests; log only carries, releases and one line for each finished item; delete dead rules and dead code without making an archive copy, because GitHub's history already keeps them.
- Aim for one pull request per session per family, and one release per family. Avoid a pull request or a release for a single small change. Use judgement when that does not fit.
- Sessions do every step they can themselves. The maintainer only gives the word.
- Every family starts and ends the way the "Opening and closing a family" page says. At the close, every session lists the rules that slowed it down and proposes which to retire.
