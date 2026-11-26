// Her packs travel exactly as they came: each card file, tool file and pack README is held to the SHA-256 the carry's
// packing list gives it (25 Nov 2026), and every card set is checked a second way, independently of cards.ts (the open
// site's scripts/check-cards.mjs). Line endings are made LF first: on Windows, git may write the files with CRLF.
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import * as CARDS from "./generated/cards.generated";
import { CARD_SOURCES } from "./generated.test";

const here = (path: string): string => new URL(path, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (path: string): string => readFileSync(here(path), "utf8").replace(/\r\n/g, "\n");
const sha = async (path: string): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(read(path))))].map((b) => b.toString(16).padStart(2, "0")).join("");

/** The packing list's fingerprints, for every file that travels byte for byte. */
const CARRIED: Record<string, string> = {
  "packs/vwba-2.0/README.md": "79afc574a024a99bba5e19e1509c89583bd5d4a5a134cd3bf3888a8a14bf0297",
  "packs/vwba-2.0/cards/applies-cards-vwba.md": "3895687a57b04feaa00acda6c69a6558be949185979a64e0e8fede15ee8410a4",
  "packs/vwba-2.0/cards/eligibility-cards-vwba.md": "08f41ad22f8b8cc8e6d7818e216e147c1f20df61a6dde202964ebe046a3fe885",
  "packs/vwba-2.0/cards/feasibility-cards-vwba.md": "5ab8aacc4e266f81391ff2d3e9c2319f09a2e7cca14a1b66a432c65768df295f",
  "packs/vwba-2.0/cards/routes-cards-vwba.md": "f0a30d386aaba85fb09463e732c8d611a016d1e1e1cd60dafd4525e80e113fa6",
  "packs/vwba-2.0/tool/eligibility-worksheet.yaml": "8478261e6745aec923abd9d7a016597fbcebd8a75325e032e80f2a6cb8b05d71",
  "packs/gs-paa-v2.0/README.md": "b0bcbc5dcaf2be808d0cb560ccb9e6fa632745fe8773c6c5ba8bf0903a7ad1ae",
  "packs/gs-paa-v2.0/cards/applies-cards-gs.md": "44987332d870288d8a4f2743e971801636ecaec4952cd67741d8f4619d5c4831",
  "packs/gs-paa-v2.0/cards/eligibility-cards-gs.md": "25478309e7579b068a21ba32ab2a715efdef1a318ee11be58d97c708bcbffbdc",
  "packs/gs-paa-v2.0/cards/routes-cards-gs.md": "0a2157b4f282f63e635b9c6762962fcff71eda86e69967c381560f8bec346bef",
  "packs/gs-paa-v2.0/tool/eligibility-worksheet.yaml": "989139c45f25811e21ee80e721c7c9939d45a43bdc037f06c934c1005963389f",
  // Made by the open site from the two tool files above and its roster. Pinned together, so neither can drift alone.
  "generated/tool.generated.ts": "7bb988f547f4f9d08939057e05b8e21bd7cdfbb547767ed14809e001666c86e2",
  "generated/worksheet.generated.ts": "01ef8460978ebc933d167984a6d71ae737cd4d65fe8054e8f9847b4c86fdfe2e",
};

describe("her packs, byte for byte", () => {
  test.each(Object.entries(CARRIED))("%s is the carried file", async (path, fingerprint) => {
    expect(await sha(path)).toBe(fingerprint);
  });
  test("every carried card file and pack README is in the made module, word for word", () => {
    for (const [name, path] of CARD_SOURCES) expect((CARDS as Record<string, string>)[name], path).toBe(read(path));
    expect(CARD_SOURCES.filter(([, path]) => path in CARRIED)).toHaveLength(9);
  });
});

// ── Every card set, read a second way ────────────────────────────────────────────────────────────────────────────

const FIXABLE = ["yes", "no", "depends"];
const PHASES = ["Eligibility", "Partners", "Quantify", "Plan", "Monitor", "Communicate", "To remain eligible"];
const EVIDENCE = "What a project owner would be asked to show.";
const range = (prefix: string, from: number, to: number): string[] => Array.from({ length: to - from + 1 }, (_, i) => `${prefix}${from + i}`);

interface CardSetSpec {
  name: string;
  file: string;
  word: "Card" | "Route";
  ids: string[];
  text: string[];
  head?: string[];
  bullets?: string;
  fixable?: boolean;
  phase?: boolean;
  mustInclude?: string;
  appendix?: RegExp;
}

const PACKS: { dir: string; sets: CardSetSpec[] }[] = [
  {
    dir: "packs/vwba-2.0",
    sets: [
      { name: "water applies", file: "cards/applies-cards-vwba.md", word: "Card", ids: ["W1", "W2"], text: ["The test in plain words.", "Applies to."], head: ["If the answer is"], bullets: EVIDENCE },
      { name: "water eligibility", file: "cards/eligibility-cards-vwba.md", word: "Card", ids: range("", 1, 6), text: ["The rule in plain words."], bullets: EVIDENCE, fixable: true, phase: true, appendix: /Appendix A/ },
      {
        name: "water feasibility",
        file: "cards/feasibility-cards-vwba.md",
        word: "Card",
        ids: range("B-", 1, 10),
        text: ["The consideration in plain words.", "Why it matters."],
        bullets: "How to weigh it",
        mustInclude: "guidance, not a gate",
        appendix: /Appendix B/,
      },
      { name: "water routes", file: "cards/routes-cards-vwba.md", word: "Route", ids: range("R-", 1, 9), text: ["The gap.", "The route in plain words.", "What it does not promise."] },
    ],
  },
  {
    dir: "packs/gs-paa-v2.0",
    sets: [
      { name: "carbon applies", file: "cards/applies-cards-gs.md", word: "Card", ids: range("T", 1, 4), text: ["The test in plain words.", "Applies to."], head: ["If the answer is"], bullets: EVIDENCE },
      {
        name: "carbon eligibility",
        file: "cards/eligibility-cards-gs.md",
        word: "Card",
        ids: [...range("M", 1, 17), ...range("P", 1, 2), ...range("G", 1, 13)],
        text: ["The rule in plain words.", "Applies to.", "External standard."],
        bullets: EVIDENCE,
        fixable: true,
        phase: true,
      },
      { name: "carbon routes", file: "cards/routes-cards-gs.md", word: "Route", ids: range("R-", 1, 19), text: ["The gap.", "The route in plain words.", "What it does not promise."] },
    ],
  },
];

function cards(text: string, word: string): { heading: string; body: string }[] {
  return text
    .split(new RegExp(`^## ${word} `, "m"))
    .slice(1)
    .map((part) => {
      const nl = part.indexOf("\n");
      return { heading: part.slice(0, nl).trim(), body: part.slice(nl + 1) };
    });
}
function paragraph(body: string, label: string): string | null {
  const start = body.indexOf(`**${label}`);
  if (start < 0) return null;
  const afterLabel = body.indexOf("**", start + 2 + label.length);
  if (afterLabel < 0) return null;
  const end = body.indexOf("\n\n", afterLabel + 2);
  return body.slice(afterLabel + 2, end < 0 ? undefined : end).replace(/\s+/g, " ").trim();
}
function head(body: string, label: string): string | null {
  const start = body.indexOf(`**${label}`);
  if (start < 0) return null;
  const afterLabel = body.indexOf("**", start + 2 + label.length);
  return afterLabel < 0 ? null : body.slice(start + 2 + label.length, afterLabel).replace(/\s+/g, " ").trim();
}
function bulletsAfter(body: string, label: string): string[] {
  const start = body.indexOf(`**${label}`);
  if (start < 0) return [];
  const rest = body.slice(start);
  const stop = rest.search(/\n---|\n## /);
  const block = stop < 0 ? rest : rest.slice(0, stop);
  const firstBullet = block.search(/^- /m);
  if (firstBullet < 0) return [];
  const trailing = block.slice(firstBullet).search(/\n\n\*\*/);
  const list = trailing < 0 ? block.slice(firstBullet) : block.slice(firstBullet, firstBullet + trailing);
  return list.split(/^- /m).slice(1).map((b) => b.replace(/\s+/g, " ").trim());
}
const links = (text: string): string[] => (text.match(/https?:\/\/[^\s<>)|\]]+/g) ?? []).map((h) => h.replace(/[.,;]+$/, ""));

describe("every card is complete (the open site's check-cards, read a second way)", () => {
  for (const pack of PACKS) {
    const readme = read(`${pack.dir}/README.md`);
    test(`${pack.dir}: the README carries its version`, () => expect(readme).toMatch(/\*\*Version \d+\.\d+\.\d+\b/));
    const readmeLinks = new Set(links(readme));
    for (const set of pack.sets) {
      test(`${set.name}: ${set.ids.length} cards, each complete, citing a page and a publisher's page the pack names`, () => {
        const text = read(`${pack.dir}/${set.file}`);
        const firstCard = text.search(new RegExp(`^## ${set.word} `, "m"));
        const headText = firstCard < 0 ? text : text.slice(0, firstCard);
        const allowed = new Set([...readmeLinks, ...links(headText)]);
        expect(headText).toMatch(/\*\*Status: approved by the maintainer, \d{1,2} \w{3} \d{4}/);
        const found = cards(text, set.word);
        expect(found.map((c) => c.heading.match(/^([A-Z]?-?\d+)\s+—\s+(.+)$/)?.[1])).toEqual(set.ids);
        const problems: string[] = [];
        for (const card of found) {
          const label = `${set.name} ${card.heading.split(" ")[0]}`;
          for (const t of set.text) if (!paragraph(card.body, t)) problems.push(`${label}: no "${t}"`);
          for (const h of set.head ?? []) if (!head(card.body, h)) problems.push(`${label}: no "${h} …"`);
          if (set.bullets && bulletsAfter(card.body, set.bullets).length === 0) problems.push(`${label}: no bullets`);
          if (set.mustInclude && !card.body.includes(set.mustInclude)) problems.push(`${label}: no "${set.mustInclude}"`);
          if (set.fixable && !FIXABLE.includes(head(card.body, "Can it be fixed?")?.match(/^(yes|no|depends)\b/i)?.[1]?.toLowerCase() ?? "")) problems.push(`${label}: fixable`);
          if (set.phase && !PHASES.includes((paragraph(card.body, "Phase.") ?? "").split(".")[0]!.trim())) problems.push(`${label}: phase`);
          const source = paragraph(card.body, "Source.");
          if (!source || !/\((?:Version|v\d)[^)]*\)/.test(source) || !/\bp{1,2}\.\s*\d+/.test(source)) problems.push(`${label}: citation`);
          if (source && set.appendix && !set.appendix.test(source)) problems.push(`${label}: appendix`);
          const hrefs = links(paragraph(card.body, "Canonical link.") ?? "");
          if (hrefs.length === 0) problems.push(`${label}: no link`);
          for (const h of hrefs) if (!allowed.has(h)) problems.push(`${label}: ${h} is not a page the pack names`);
        }
        expect(problems).toEqual([]);
      });
    }
  }
});
