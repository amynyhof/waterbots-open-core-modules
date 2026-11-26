/**
 * WHAT HER ANSWER RESTS ON, as a site shows it. She names a card by a token, `section:set/id`, and never writes a
 * citation herself: the label, the plain words and the citation are read here from the card files. A token for a card
 * that does not exist is dropped rather than shown. Carried from the open site (`resolveEvidence` in
 * `src/lib/phoebeClient.ts`, commit 0f16957).
 */
import { cardFor, routeFor, type Citation } from "./cards.js";
import { TOOL_SECTIONS } from "./generated/worksheet.generated.js";

export interface Evidence {
  /** The token itself, so a marker and its evidence can never differ. */
  id: string;
  label: string;
  citation: Citation;
  plainEnglish: string;
}

function setWord(set: string): string {
  if (set === "eligibility") return "Criterion";
  if (set === "feasibility") return "Consideration";
  if (set === "applies") return "Does this apply —";
  return "Card";
}

/** The evidence for each token she cited, in her order. */
export function evidenceFor(tokens: readonly string[]): Evidence[] {
  const out: Evidence[] = [];
  const seen = new Set<string>();
  for (const raw of tokens) {
    const token = raw.trim();
    if (seen.has(token)) continue;
    const match = token.match(/^([a-z][a-z0-9-]*):([a-z]+)\/(.+)$/);
    if (!match) continue;
    const [, sectionId = "", set = "", id = ""] = match;
    const pack = TOOL_SECTIONS.find((part) => part.sectionId === sectionId)?.pack;
    if (!pack) continue;
    if (set === "routes") {
      const route = routeFor(pack, id);
      if (!route) continue;
      seen.add(token);
      out.push({ id: token, label: `Route ${route.id} — ${route.title}`, citation: route.citation, plainEnglish: route.route });
      continue;
    }
    const card = cardFor(pack, `${set}/${id}`);
    if (!card) continue;
    seen.add(token);
    out.push({ id: token, label: `${setWord(set)} ${card.id} — ${card.title}`, citation: card.citation, plainEnglish: card.plain });
  }
  return out;
}
