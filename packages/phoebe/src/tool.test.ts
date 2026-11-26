// Her tool rows are held to the cards they cite (the open site's scripts/check-tool.mjs). The tool files are read here
// as the open site's generator read them (`generated/worksheet.generated.ts`, pinned with them in packs.test.ts), because
// this repo has no YAML reader. The cards are read a second way, independently of cards.ts.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { TOOL_SECTIONS } from "./generated/worksheet.generated";

const here = (path: string): string => new URL(path, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (path: string): string => readFileSync(here(path), "utf8").replace(/\r\n/g, "\n");

const KINDS = ["state", "yesno", "choice", "number", "text", "date-past", "date-future"];
const PHASES = ["eligibility", "partners", "quantify", "plan", "monitor", "communicate", "to-remain-eligible"];
const FIXABLE = ["yes", "no", "depends"];
const FROM_WORDS = ["conversation", "typed"];
const RECORD_FIELDS = ["does", "name", "place", "type", "stage", "pin"];

const TOOLS: Record<string, { dir: string; sets: Record<string, string>; routes: string }> = {
  "vwba-2.0": { dir: "packs/vwba-2.0", sets: { applies: "cards/applies-cards-vwba.md", eligibility: "cards/eligibility-cards-vwba.md" }, routes: "cards/routes-cards-vwba.md" },
  "gs-paa-v2.0": { dir: "packs/gs-paa-v2.0", sets: { applies: "cards/applies-cards-gs.md", eligibility: "cards/eligibility-cards-gs.md" }, routes: "cards/routes-cards-gs.md" },
};

function labelledLine(body: string, label: string): string | null {
  const at = body.indexOf(`**${label}**`);
  if (at < 0) return null;
  const rest = body.slice(at + label.length + 4);
  const end = rest.indexOf("\n\n");
  return (end < 0 ? rest : rest.slice(0, end)).replace(/\s+/g, " ").trim();
}
function labelledWord(body: string, label: string): string | null {
  const match = body.match(new RegExp(String.raw`\*\*${label}\s*(?:\*\*)?\s*([^.*,:;]+)`));
  return match ? match[1]!.trim().toLowerCase().replace(/\s+/g, "-") : null;
}
/** Which projects a card's row exists for, from its "Applies to" line, by the open site's mechanical rule. */
function appliesTo(body: string): string[] | null {
  const line = labelledLine(body, "Applies to.");
  if (line === null || /^(All\b|Every project\b)/.test(line)) return ["all"];
  const found: string[] = [];
  for (const m of line.matchAll(/\b(HWT|IWT|CWT|CWS)\b/g)) if (!found.includes(m[1]!.toLowerCase())) found.push(m[1]!.toLowerCase());
  for (const [pattern, token] of [
    [/\btransitioning project\b/, "transitioning"],
    [/\bnew project\b/, "new"],
  ] as const) {
    if (pattern.test(line) && !found.includes(token)) found.push(token);
  }
  return found.length ? found : null;
}
function readCards(text: string, word: string): { id: string; title: string; fixable: string | null; phase: string | null; applies: string[] | null }[] {
  const heads = [...text.matchAll(new RegExp(String.raw`^## ${word} (\S+)\s+—\s+(.+)$`, "gm"))];
  return heads.map((h, i) => {
    const body = text.slice(h.index! + h[0].length, heads[i + 1]?.index ?? text.length);
    return { id: h[1]!, title: h[2]!.trim(), fixable: labelledWord(body, String.raw`Can it be fixed\?`), phase: labelledWord(body, String.raw`Phase\.`), applies: appliesTo(body) };
  });
}

describe("every tool row matches its card and its pack", () => {
  for (const part of TOOL_SECTIONS) {
    const tool = TOOLS[part.pack]!;
    test(`${part.pack}: the pack's version is the README's`, () => {
      expect(read(`${tool.dir}/README.md`).match(/\*\*Version (\d+\.\d+\.\d+)\b/)?.[1]).toBe(part.version);
    });
    test(`${part.pack}: each row's title, fixable value, phase and classes are its card's; each route has a card; every card has one row`, () => {
      const sets = Object.fromEntries(Object.entries(tool.sets).map(([name, file]) => [name, new Map(readCards(read(`${tool.dir}/${file}`), "Card").map((c) => [c.id, c]))]));
      const routeIds = readCards(read(`${tool.dir}/${tool.routes}`), "Route").map((c) => c.id);
      const classes = part.appliesTo.map((w) => w.id);
      const problems: string[] = [];
      const cited: Record<string, string[]> = {};
      for (const row of part.rows) {
        const where = `${part.pack} row ${row.id}`;
        if (!PHASES.includes(row.asked)) problems.push(`${where}: phase ${row.asked}`);
        if (!KINDS.includes(row.takes.kind)) problems.push(`${where}: takes ${row.takes.kind}`);
        if (!FIXABLE.includes(row.fixable)) problems.push(`${where}: fixable ${row.fixable}`);
        for (const from of row.from) {
          const [key, rest] = from.split(": ");
          if (rest === undefined ? !FROM_WORDS.includes(from) : key === "record" ? !RECORD_FIELDS.includes(rest) : key !== "documents") problems.push(`${where}: from ${from}`);
        }
        for (const id of row.routes) if (!routeIds.includes(id)) problems.push(`${where}: route ${id} has no card`);
        if (row.fixable === "no" && row.routes.length > 0) problems.push(`${where}: cannot be fixed and names a route`);
        for (const value of row.applies ?? []) if (value === "all" || !classes.includes(value)) problems.push(`${where}: applies ${value}`);
        const [setName = "", cardId = ""] = row.card.split("/");
        const card = sets[setName]?.get(cardId);
        if (!card) {
          problems.push(`${where}: cites ${row.card}, which is not a card`);
          continue;
        }
        (cited[setName] ??= []).push(cardId);
        if (row.title !== card.title) problems.push(`${where}: title`);
        if (card.fixable !== null && row.fixable !== card.fixable) problems.push(`${where}: fixable is ${row.fixable}, card says ${card.fixable}`);
        if (card.phase !== null && row.asked !== card.phase) problems.push(`${where}: asked ${row.asked}, card says ${card.phase}`);
        const wanted = card.applies === null || card.applies.includes("all") ? null : card.applies;
        if (card.applies === null) problems.push(`${where}: the card's Applies to line names nothing this check can read`);
        else if ((row.applies?.join(" ") ?? null) !== (wanted?.join(" ") ?? null)) problems.push(`${where}: applies ${JSON.stringify(row.applies)}, card gives ${JSON.stringify(wanted)}`);
      }
      for (const [name, cards] of Object.entries(sets)) {
        const mirrored = cited[name] ?? [];
        if (mirrored.length !== cards.size) problems.push(`${part.pack}: ${mirrored.length} rows cite ${name}, which holds ${cards.size} cards`);
        if (new Set(mirrored).size !== mirrored.length) problems.push(`${part.pack}: a card in ${name} is cited twice`);
      }
      expect(problems).toEqual([]);
    });
  }
});
