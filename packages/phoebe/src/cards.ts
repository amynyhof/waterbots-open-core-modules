/**
 * PHOEBE'S KNOWLEDGE, READ FROM HER CARD FILES. Carried from the open site (`src/lib/phoebeCards.ts`, commit 0f16957)
 * with its parsing unchanged. The card files are the only source: the worksheet, her Tool tab and every citation read
 * them, so a card edit lands everywhere and nothing can drift from what the maintainer approved.
 *
 * The files travel byte for byte in `src/packs/`, and `generated/cards.generated.ts` holds their text so this runs in
 * Node and in a browser alike. Parsing fails loudly: a card whose formatting has drifted throws when this module loads,
 * because a silently empty worksheet would tell a reader that no criteria exist.
 */
import type { Citation } from "./citation.js";
import {
  CARBON_APPLIES_MD,
  CARBON_ELIGIBILITY_MD,
  CARBON_README_MD,
  CARBON_ROUTES_MD,
  WATER_APPLIES_MD,
  WATER_ELIGIBILITY_MD,
  WATER_FEASIBILITY_MD,
  WATER_README_MD,
  WATER_ROUTES_MD,
} from "./generated/cards.generated.js";

export type { Citation };

/* The sets' own counts, asserted rather than assumed. */
const CRITERIA_EXPECTED = 6;
const CONSIDERATIONS_EXPECTED = 10;
const WATER_APPLIES_EXPECTED = 2;
const WATER_ROUTES_EXPECTED = 9;
const CARBON_APPLIES_EXPECTED = 4;
const CARBON_ELIGIBILITY_EXPECTED = 32;
const CARBON_ROUTES_EXPECTED = 19;

/** The card's own "Can it be fixed?" line: the only place the word Blocked can come from. */
export interface Fixable {
  value: "yes" | "no" | "depends";
  text: string;
}

/** The card's Phase line: where the row is acted on, and the "Kept up by" clause where there is one. */
export interface Phase {
  phase: string;
  keptUp?: string;
}

export interface Criterion {
  number: number;
  title: string;
  rule: string;
  citation: Citation;
  evidence: string[];
  fixable: Fixable;
  phase: Phase;
  moreLinks: string[];
}

export interface Consideration {
  number: number;
  title: string;
  summary: string;
  why: string;
  citation: Citation;
  weigh: string[];
  group: "success" | "value";
}

/** One "does this apply" question: W1, W2 on the water pack; T1 to T4 on carbon. */
export interface AppliesCard {
  id: string;
  title: string;
  test: string;
  appliesTo: string;
  evidence: string[];
  ifNo: { heading: string; text: string };
  citation: Citation;
  moreLinks: string[];
}

/** One carbon eligibility row: M1 to M17, P1 to P2, G1 to G13. */
export interface CarbonCard {
  id: string;
  part: "M" | "P" | "G";
  title: string;
  rule: string;
  fixable: Fixable;
  phase: Phase;
  appliesTo: string;
  external: string;
  evidence: string[];
  citation: Citation;
  moreLinks: string[];
}

/** One cited fix: R-1 to R-9 on the water pack; R-1 to R-19 on carbon. */
export interface RouteCard {
  id: string;
  title: string;
  gap: string;
  route: string;
  notPromise: string;
  citation: Citation;
  moreLinks: string[];
}

/** What a pack says about itself: its version and the document it cites. */
export interface PackInfo {
  key: string;
  version: string;
  source: { document: string; publisher: string };
}

function fail(what: string, where: string): never {
  throw new Error(
    `phoebe cards: could not read ${what} from ${where}. The card files are the only source for the worksheet, so this ` +
      `is a build error rather than an empty state. Check that the card's formatting still matches the parser.`,
  );
}

function splitCards(source: string, file: string, word: "Card" | "Route" = "Card"): { heading: string; body: string }[] {
  const parts = source.split(new RegExp(`^## ${word} `, "m")).slice(1);
  if (parts.length === 0) fail("any cards", file);
  return parts.map((part) => {
    const newline = part.indexOf("\n");
    return { heading: part.slice(0, newline).trim(), body: part.slice(newline + 1) };
  });
}

/** Collapses wrapped lines and strips markdown emphasis and link syntax. */
function flatten(text: string): string {
  return text
    .replace(/\s*\n\s*/g, " ")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*/g, "$1$2")
    .replace(/<(https?:[^>]+)>/g, "$1")
    .trim();
}

function labelledText(body: string, label: string, file: string): string {
  const match = body.match(new RegExp(`\\*\\*${label}[^*]*\\*\\*\\s*([\\s\\S]*?)(?=\\n\\n|$)`));
  if (!match) fail(`the "${label}" section`, file);
  return flatten(match[1] ?? "");
}

function labelledHead(body: string, label: string, file: string): { head: string; text: string } {
  const match = body.match(new RegExp(`\\*\\*${label}([^*]*)\\*\\*\\s*([\\s\\S]*?)(?=\\n\\n|$)`));
  if (!match) fail(`the "${label}" section`, file);
  return { head: flatten(match[1] ?? ""), text: flatten(match[2] ?? "") };
}

/** The bullet list after a bold-labelled heading. It ends at a rule, the next card, or a bold paragraph after the first bullet. */
function labelledBullets(body: string, label: string, file: string): string[] {
  const match = body.match(new RegExp(`\\*\\*${label}[^*]*\\*\\*\\s*\\n\\n([\\s\\S]*?)(?=\\n---|\\n## |$)`));
  if (!match) fail(`the "${label}" list`, file);
  const block = match[1] ?? "";
  const firstBullet = block.search(/^- /m);
  if (firstBullet < 0) fail(`any bullets under "${label}"`, file);
  const trailing = block.slice(firstBullet).search(/\n\n\*\*/);
  const list = trailing < 0 ? block.slice(firstBullet) : block.slice(firstBullet, firstBullet + trailing);
  const items = list
    .split(/^- /m)
    .slice(1)
    .map((item) => flatten(item))
    .filter(Boolean);
  if (items.length === 0) fail(`any bullets under "${label}"`, file);
  return items;
}

/** The four-part citation, and any further canonical links, from a card's Source and Canonical link lines. */
function readCitation(body: string, file: string): { citation: Citation; moreLinks: string[] } {
  const full = labelledText(body, "Source\\.", file);
  const link = labelledText(body, "Canonical link\\.", file);
  const hrefs = (link.match(/https?:\/\/\S+/g) ?? []).map((h) => h.replace(/[.,;]+$/, ""));
  const href = hrefs[0];
  if (!href) fail("a canonical link", file);
  const version = full.match(/\(((?:Version|v\d)[^)]*)\)/)?.[1];
  if (!version) fail("a version in the citation", file);
  const document = full
    .slice(0, full.indexOf(`(${version})`))
    .replace(/\*/g, "")
    .replace(/[,\s]+$/, "")
    .trim();
  if (!document) fail("a document name in the citation", file);
  const page = full.match(/\bp{1,2}\.\s*\d+(?:–\d+)?/)?.[0];
  if (!page) fail("a page in the citation", file);
  const afterVersion = full.slice(full.indexOf(version) + version.length + 1);
  const section = (afterVersion.split(/\s—\s|,\s*p{1,2}\./)[0] ?? "")
    .replace(/^[,\s]+/, "")
    .replace(/[,\s]+$/, "")
    .replace(/,\s*/g, " · ")
    .trim();
  if (!section) fail("a section in the citation", file);
  return { citation: { document, version, section, page, full, href }, moreLinks: hrefs.slice(1) };
}

function readFixable(body: string, file: string): Fixable {
  const { head, text } = labelledHead(body, "Can it be fixed\\?", file);
  const value = head.match(/^\s*(yes|no|depends)\b/i)?.[1]?.toLowerCase() as Fixable["value"] | undefined;
  if (!value) fail(`a yes, no or depends on the "Can it be fixed?" line ("${head}")`, file);
  return { value, text: `${head} ${text}`.trim() };
}

function readPhase(body: string, file: string): Phase {
  const line = labelledText(body, "Phase\\.", file);
  const stop = line.indexOf(".");
  const phase = (stop < 0 ? line : line.slice(0, stop)).trim();
  if (!phase) fail("a phase word on the Phase line", file);
  const keptUp = stop < 0 ? "" : line.slice(stop + 1).trim();
  return keptUp ? { phase, keptUp } : { phase };
}

function readHeading(heading: string, pattern: RegExp, file: string): { id: string; title: string } {
  const parsed = heading.match(pattern);
  if (!parsed) fail(`the card id and title in "${heading}"`, file);
  return { id: parsed[1] ?? "", title: parsed[2] ?? "" };
}

const EVIDENCE = "What a project owner would be asked to show\\.";

const WATER_DIR = "packs/vwba-2.0";
const ELIGIBILITY_FILE = `${WATER_DIR}/cards/eligibility-cards-vwba.md`;
const FEASIBILITY_FILE = `${WATER_DIR}/cards/feasibility-cards-vwba.md`;
const WATER_ROUTES_FILE = `${WATER_DIR}/cards/routes-cards-vwba.md`;
const WATER_APPLIES_FILE = `${WATER_DIR}/cards/applies-cards-vwba.md`;
const WATER_README = `${WATER_DIR}/README.md`;

export const CRITERIA: Criterion[] = splitCards(WATER_ELIGIBILITY_MD, ELIGIBILITY_FILE).map(({ heading, body }) => {
  const { id, title } = readHeading(heading, /^(\d+)\s+—\s+(.+)$/, ELIGIBILITY_FILE);
  const { citation, moreLinks } = readCitation(body, ELIGIBILITY_FILE);
  return {
    number: Number(id),
    title,
    rule: labelledText(body, "The rule in plain words\\.", ELIGIBILITY_FILE),
    citation,
    evidence: labelledBullets(body, EVIDENCE, ELIGIBILITY_FILE),
    fixable: readFixable(body, ELIGIBILITY_FILE),
    phase: readPhase(body, ELIGIBILITY_FILE),
    moreLinks,
  };
});

export const CONSIDERATIONS: Consideration[] = splitCards(WATER_FEASIBILITY_MD, FEASIBILITY_FILE).map(({ heading, body }) => {
  const { id, title } = readHeading(heading, /^B-(\d+)\s+—\s+(.+)$/, FEASIBILITY_FILE);
  const number = Number(id);
  return {
    number,
    title,
    summary: labelledText(body, "The consideration in plain words\\.", FEASIBILITY_FILE),
    why: labelledText(body, "Why it matters\\.", FEASIBILITY_FILE),
    citation: readCitation(body, FEASIBILITY_FILE).citation,
    weigh: labelledBullets(body, "How to weigh it", FEASIBILITY_FILE),
    // Appendix B's own split, stated in its introduction.
    group: number <= 5 ? "success" : "value",
  };
});

function readApplies(raw: string, file: string, idPattern: RegExp): AppliesCard[] {
  return splitCards(raw, file).map(({ heading, body }) => {
    const { id, title } = readHeading(heading, idPattern, file);
    const { citation, moreLinks } = readCitation(body, file);
    const ifNo = labelledHead(body, "If the answer is", file);
    return {
      id,
      title,
      test: labelledText(body, "The test in plain words\\.", file),
      appliesTo: labelledText(body, "Applies to\\.", file),
      evidence: labelledBullets(body, EVIDENCE, file),
      ifNo: { heading: `If the answer is ${ifNo.head.replace(/\.$/, "")}`, text: ifNo.text },
      citation,
      moreLinks,
    };
  });
}

function readRoutes(raw: string, file: string): RouteCard[] {
  return splitCards(raw, file, "Route").map(({ heading, body }) => {
    const { id, title } = readHeading(heading, /^(R-\d+)\s+—\s+(.+)$/, file);
    const { citation, moreLinks } = readCitation(body, file);
    return {
      id,
      title,
      gap: labelledText(body, "The gap\\.", file),
      route: labelledText(body, "The route in plain words\\.", file),
      notPromise: labelledText(body, "What it does not promise\\.", file),
      citation,
      moreLinks,
    };
  });
}

export const WATER_APPLIES: AppliesCard[] = readApplies(WATER_APPLIES_MD, WATER_APPLIES_FILE, /^(W\d)\s+—\s+(.+)$/);
export const WATER_ROUTES: RouteCard[] = readRoutes(WATER_ROUTES_MD, WATER_ROUTES_FILE);

const CARBON_DIR = "packs/gs-paa-v2.0";
const CARBON_APPLIES_FILE = `${CARBON_DIR}/cards/applies-cards-gs.md`;
const CARBON_ELIGIBILITY_FILE = `${CARBON_DIR}/cards/eligibility-cards-gs.md`;
const CARBON_ROUTES_FILE = `${CARBON_DIR}/cards/routes-cards-gs.md`;
const CARBON_README = `${CARBON_DIR}/README.md`;

export const CARBON_APPLIES: AppliesCard[] = readApplies(CARBON_APPLIES_MD, CARBON_APPLIES_FILE, /^(T\d)\s+—\s+(.+)$/);

export const CARBON_ELIGIBILITY: CarbonCard[] = splitCards(CARBON_ELIGIBILITY_MD, CARBON_ELIGIBILITY_FILE).map(({ heading, body }) => {
  const { id, title } = readHeading(heading, /^([MPG]\d+)\s+—\s+(.+)$/, CARBON_ELIGIBILITY_FILE);
  const { citation, moreLinks } = readCitation(body, CARBON_ELIGIBILITY_FILE);
  return {
    id,
    part: id[0] as CarbonCard["part"],
    title,
    rule: labelledText(body, "The rule in plain words\\.", CARBON_ELIGIBILITY_FILE),
    fixable: readFixable(body, CARBON_ELIGIBILITY_FILE),
    phase: readPhase(body, CARBON_ELIGIBILITY_FILE),
    appliesTo: labelledText(body, "Applies to\\.", CARBON_ELIGIBILITY_FILE),
    external: labelledText(body, "External standard\\.", CARBON_ELIGIBILITY_FILE),
    evidence: labelledBullets(body, EVIDENCE, CARBON_ELIGIBILITY_FILE),
    citation,
    moreLinks,
  };
});

export const CARBON_ROUTES: RouteCard[] = readRoutes(CARBON_ROUTES_MD, CARBON_ROUTES_FILE);

/** What a row's card gives a reader, whichever set it came from. */
export interface RowCard {
  id: string;
  title: string;
  /** The rule, the test or the question, in the card's own plain words. */
  plain: string;
  citation: Citation;
  evidence: string[];
  fixable?: Fixable;
}

/** The card behind a tool row, named as the tool file names it: "set/id". Undefined when there is none. */
export function cardFor(pack: string, cite: string): RowCard | undefined {
  const [set, id] = cite.split("/");
  if (!set || !id) return undefined;
  if (pack === "vwba-2.0") {
    if (set === "applies") {
      const card = WATER_APPLIES.find((c) => c.id === id);
      return card && { id: card.id, title: card.title, plain: card.test, citation: card.citation, evidence: card.evidence };
    }
    if (set === "eligibility") {
      const card = CRITERIA.find((c) => String(c.number) === id);
      return card && { id: String(card.number), title: card.title, plain: card.rule, citation: card.citation, evidence: card.evidence, fixable: card.fixable };
    }
    if (set === "feasibility") {
      // Headed "Card B-1" in its file; a bare number resolves too.
      const number = id.replace(/^[A-Za-z]+-/, "");
      const card = CONSIDERATIONS.find((c) => String(c.number) === number);
      return card && { id: String(card.number), title: card.title, plain: card.summary, citation: card.citation, evidence: card.weigh };
    }
  }
  if (pack === "gs-paa-v2.0") {
    if (set === "applies") {
      const card = CARBON_APPLIES.find((c) => c.id === id);
      return card && { id: card.id, title: card.title, plain: card.test, citation: card.citation, evidence: card.evidence };
    }
    if (set === "eligibility") {
      const card = CARBON_ELIGIBILITY.find((c) => c.id === id);
      return card && { id: card.id, title: card.title, plain: card.rule, citation: card.citation, evidence: card.evidence, fixable: card.fixable };
    }
  }
  return undefined;
}

/** A route card by its id, within one pack. */
export function routeFor(pack: string, id: string): RouteCard | undefined {
  const set = pack === "vwba-2.0" ? WATER_ROUTES : pack === "gs-paa-v2.0" ? CARBON_ROUTES : [];
  return set.find((route) => route.id === id);
}

/** The three parts of the carbon eligibility file, in the file's order. */
export const CARBON_ELIGIBILITY_PARTS: { key: CarbonCard["part"]; label: string; range: string }[] = [
  { key: "M", label: "The methodology's own gate", range: "M1–M17" },
  { key: "P", label: "The Paris-alignment framework", range: "P1–P2" },
  { key: "G", label: "The rules for every Gold Standard project", range: "G1–G13" },
];

function assertCount(name: string, got: number, expected: number): void {
  if (got !== expected) throw new Error(`phoebe cards: expected ${expected} ${name}, parsed ${got}.`);
}
assertCount("eligibility criteria", CRITERIA.length, CRITERIA_EXPECTED);
assertCount("feasibility considerations", CONSIDERATIONS.length, CONSIDERATIONS_EXPECTED);
assertCount("water applies cards", WATER_APPLIES.length, WATER_APPLIES_EXPECTED);
assertCount("water routes", WATER_ROUTES.length, WATER_ROUTES_EXPECTED);
assertCount("carbon applies cards", CARBON_APPLIES.length, CARBON_APPLIES_EXPECTED);
assertCount("carbon eligibility cards", CARBON_ELIGIBILITY.length, CARBON_ELIGIBILITY_EXPECTED);
assertCount("carbon routes", CARBON_ROUTES.length, CARBON_ROUTES_EXPECTED);

/** Appendix B's two halves, labelled as the manual labels them. */
export const CONSIDERATION_GROUPS = [
  { key: "success" as const, label: "Likelihood of success", note: "Considerations 1 to 5 — whether the project will work, and go on working." },
  { key: "value" as const, label: "Added impact or value", note: "Considerations 6 to 10 — beyond working, what else the project brings." },
];

function readApproval(raw: string, file: string): string {
  const match = raw.match(/\*\*Status: approved by the maintainer, (\d{1,2} \w{3} \d{4})/);
  if (!match) fail("an approval date in the status line", file);
  return (match[1] ?? "").trim();
}

/** Each set's approval date, read from the file's own status line. */
export const APPROVED_ON = {
  waterApplies: readApproval(WATER_APPLIES_MD, WATER_APPLIES_FILE),
  waterEligibility: readApproval(WATER_ELIGIBILITY_MD, ELIGIBILITY_FILE),
  waterFeasibility: readApproval(WATER_FEASIBILITY_MD, FEASIBILITY_FILE),
  waterRoutes: readApproval(WATER_ROUTES_MD, WATER_ROUTES_FILE),
  carbonApplies: readApproval(CARBON_APPLIES_MD, CARBON_APPLIES_FILE),
  carbonEligibility: readApproval(CARBON_ELIGIBILITY_MD, CARBON_ELIGIBILITY_FILE),
  carbonRoutes: readApproval(CARBON_ROUTES_MD, CARBON_ROUTES_FILE),
};

function readVersion(readme: string, file: string): string {
  const match = readme.match(/\*\*Version (\d+\.\d+\.\d+)\b/);
  if (!match) fail("a Version line", file);
  return match[1] ?? "";
}

function readSourceTable(raw: string, file: string): PackInfo["source"] {
  const document = raw.match(/^\| \*\*Document\*\* \| (.+?) \|\s*$/m)?.[1];
  const publisher = raw.match(/^\| \*\*(?:Authors \/ publisher|Publisher)\*\* \| (.+?) \|\s*$/m)?.[1];
  if (!document) fail("the Document row of the source table", file);
  if (!publisher) fail("the publisher row of the source table", file);
  return { document: flatten(document), publisher: flatten(publisher) };
}

export const WATER_PACK: PackInfo = { key: "vwba-2.0", version: readVersion(WATER_README_MD, WATER_README), source: readSourceTable(WATER_ELIGIBILITY_MD, ELIGIBILITY_FILE) };
export const CARBON_PACK: PackInfo = { key: "gs-paa-v2.0", version: readVersion(CARBON_README_MD, CARBON_README), source: readSourceTable(CARBON_ELIGIBILITY_MD, CARBON_ELIGIBILITY_FILE) };
