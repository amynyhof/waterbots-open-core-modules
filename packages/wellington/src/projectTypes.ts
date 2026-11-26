/**
 * THE PROJECT TYPES WELLINGTON MATCHES A PROJECT TO, as he reads them. The words are core's one copy
 * (`@waterbots/core/projectWords`), which both sites read; this file only lays them out for his instructions, the way the
 * open site's list does, with the page cites left out.
 *
 * NO CLASSES (the maintainer, 2026-11-25). The four safe-water technology classes are not on his list: he learns the source,
 * the treatment and the water's safety as plain facts, and core works out how a project is counted.
 */
import { PROJECT_TYPE_WORDS, type NamedWords } from "@waterbots/core/projectWords";
import type { ProjectTypeId } from "@waterbots/core/record";

/** The list as he reads it: an id, the standard's own name and one plain sentence each. */
export function projectTypesText(): string {
  const line = (t: NamedWords<ProjectTypeId>): string => `- ${t.id} — ${t.name}: ${t.plain}`;
  return [
    "## Water stewardship activity types — the VWBA guidebook",
    "",
    ...PROJECT_TYPE_WORDS.filter((t) => t.id !== "NONE").map(line),
    "",
    "## None of these",
    "",
    ...PROJECT_TYPE_WORDS.filter((t) => t.id === "NONE").map(line),
    "",
  ].join("\n");
}
