/**
 * HOW A READING IS WORKED OUT, and what Phoebe adds to the shared project record. Carried from the open site
 * (`pathwayReading` and her part of `projectRecord` in `src/lib/projectRecord.ts`, commit 0f16957) with its rules
 * unchanged: unlikely as soon as a test says the path does not apply or a row is Blocked; likely once every row she asks
 * is Met; more to learn once her part is done and some of it is still open. Until then there is no reading: an absence is
 * never one. A reading is one of rule 14's three words.
 *
 * She never writes the project's kind or technology. Under today's rules core works the kind out from the source and the
 * treatment (2026-11-25), and her class sort only sorts her own rows.
 */
import { kindFactsOf, workOutKind } from "@waterbots/core/projectKinds";
import { addGivenFacts, setAgentResults, underTodaysRules, type PathwayReading, type ProjectRecord, type Source } from "@waterbots/core/record";
import type { StandardId } from "@waterbots/core/standards";
import { cardFor, routeFor } from "./cards.js";
import { HER_PACKS, pathwayRows, section, verdictRows } from "./generated/worksheet.generated.js";
import { contextFor, nothingLeftToAsk, packDone, pathwayState, phoebeDone, readiness, stateOf, touched, withSheet, type Sheet } from "./worksheet.js";

/** The funding pathway each section of her worksheet is, in core's word. */
const PATHWAY_OF: Record<string, StandardId> = { water: "vwba", carbon: "carbon" };

/** The pathways she reads: one for each pack. */
export const READ_HERE: readonly StandardId[] = HER_PACKS.map((pack) => PATHWAY_OF[section(pack)?.sectionId ?? ""]).filter((p): p is StandardId => p !== undefined);

/** The pathway one of her packs is. */
export function pathwayForPack(pack: string): StandardId | undefined {
  return PATHWAY_OF[section(pack)?.sectionId ?? ""];
}

/** The pack behind a pathway, or undefined when she reads none for it. */
export function packFor(pathway: StandardId): string | undefined {
  return HER_PACKS.find((pack) => PATHWAY_OF[section(pack)?.sectionId ?? ""] === pathway);
}

/**
 * The carbon class the record gives, in her packs' own word, for sorting her rows: "cws", "cwt", "hwt" or "iwt", or ""
 * when it does not say one. Under today's rules it comes from the kind core works out from the source and the treatment; a
 * supply combined with treatment names no single class, so no row is hidden. A screening made before these rules keeps
 * the class it was saved with.
 */
export function classFor(record: Pick<ProjectRecord, "facts">): string {
  if (!underTodaysRules(record.facts)) return record.facts.technologyClass?.value.toLowerCase() ?? "";
  const facts = kindFactsOf(record.facts);
  const worked = workOutKind(facts);
  switch (worked.kind) {
    case "K1":
      return "cws";
    case "K3":
      return facts.treatment === "none" ? "cws" : "";
    case "K4":
      return "cwt";
    case "K5":
      return "iwt";
    case "K6":
      return "hwt";
    default:
      return "";
  }
}

/** Whether her own test says the project already earns credits under V1.0; undefined until it is settled. */
export function creditedUnderV1(sheet: Sheet): boolean | undefined {
  const sorts = Object.values(sheet.sorts).flat();
  if (sorts.includes("transitioning")) return true;
  if (sorts.includes("new")) return false;
  return undefined;
}

function titleOf(pack: string, row: { id: string; card: string; title: string }): string {
  return cardFor(pack, row.card)?.title ?? row.title;
}

/** Up to four titles, then how many more there are. */
function listed(titles: string[]): string {
  return titles.length <= 4 ? titles.join("; ") : `${titles.slice(0, 4).join("; ")}; and ${titles.length - 4} more`;
}

function sourceOf(pack: string): Source {
  return { by: "phoebe", note: `Worked out from her worksheet rows, ${section(pack)?.sectionName ?? pack}, pack ${pack} ${section(pack)?.version ?? ""}`.trim() };
}

/** One pathway's reading, or undefined while she is still on it. */
export function pathwayReading(pack: string, sheet: Sheet, gsClass: string, herPartDone: boolean): PathwayReading | undefined {
  const context = contextFor(sheet, pack, gsClass);
  const source = sourceOf(pack);
  const stops = [
    ...pathwayRows(pack, context).filter((row) => (stateOf(sheet, pack, row.id).state as string) === "does-not-apply"),
    ...verdictRows(pack, context).filter((row) => stateOf(sheet, pack, row.id).state === "blocked"),
  ];
  if (pathwayState(sheet, pack, context) === "does-not-apply" || readiness(sheet, pack, context) === "likely-not") {
    return {
      reading: "unlikely",
      reason: stops
        .map((row) => {
          const because = stateOf(sheet, pack, row.id).because;
          return because ? `${titleOf(pack, row)}: ${because}` : `${titleOf(pack, row)}.`;
        })
        .join(" "),
      wouldChange: `A different answer on: ${listed(stops.map((row) => titleOf(pack, row)))}.`,
      source,
    };
  }
  if (readiness(sheet, pack, context) === "likely-eligible") {
    return { reading: "likely", reason: "Every question Phoebe asks about it here is in place.", wouldChange: "A different answer to any of those questions.", source };
  }
  if (!packDone(sheet, pack, context) && !herPartDone) return undefined;
  const rows = verdictRows(pack, context);
  const fixable = rows.filter((row) => stateOf(sheet, pack, row.id).state === "fixable");
  const open = rows.filter((row) => ["unknown", "unchecked"].includes(stateOf(sheet, pack, row.id).state));
  const met = rows.length - fixable.length - open.length;
  const routes = [...new Set(fixable.flatMap((row) => stateOf(sheet, pack, row.id).routes ?? []))].map((id) => routeFor(pack, id)?.title).filter((t): t is string => t !== undefined);
  const missing = open.map((row) => titleOf(pack, row));
  return {
    reading: "more to learn",
    reason: touched(sheet, pack, context) === 0 ? "Phoebe has not asked about it yet." : `${met} of ${rows.length} questions are in place so far.`,
    wouldChange: [missing.length ? `Finding out: ${listed(missing)}.` : "", fixable.length ? `Fixing: ${listed(routes.length ? routes : fixable.map((row) => titleOf(pack, row)))}.` : ""].filter(Boolean).join(" "),
    ...(missing.length ? { missing } : {}),
    source,
  };
}

/**
 * HER PART OF THE SHARED RECORD: each pathway's reading, her worksheet, whether the project was already credited under
 * V1.0, and whether her step is done. `handedOn` is true once she has handed the visitor on with a path done or closed,
 * so nobody is sent back to a step she has ended. A site calls it after her turn: it also clears the mark that a fact her
 * readings rest on changed. Returns a new record.
 */
export function addPhoebeResults(record: ProjectRecord, sheet: Sheet, options: { handedOn?: boolean } = {}): ProjectRecord {
  const gsClass = classFor(record);
  const credited = creditedUnderV1(sheet);
  let out = credited === undefined ? record : addGivenFacts(record, "phoebe", { creditedUnderV1: credited }).record;
  const done = phoebeDone(sheet, gsClass) || options.handedOn === true;
  out = structuredClone(out);
  for (const pack of HER_PACKS) {
    const pathway = pathwayForPack(pack);
    const read = pathway ? pathwayReading(pack, sheet, gsClass, done) : undefined;
    if (pathway && read) out.pathways[pathway] = read;
  }
  out = withSheet(out, sheet);
  out = setAgentResults(out, "phoebe", {
    done: READ_HERE.every((p) => out.pathways[p] !== undefined) && (options.handedOn === true || nothingLeftToAsk(sheet, gsClass)),
  });
  // Her answer after a fact changed has worked the readings out again from the facts as they stand (2026-11-26).
  delete out.agents.phoebe?.factsChanged;
  return out;
}
