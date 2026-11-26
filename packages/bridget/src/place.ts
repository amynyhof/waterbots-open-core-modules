/**
 * A MORE EXACT PLACE, IN THE VISITOR'S OWN WORDS TO BRIDGET (the maintainer, 2026-11-24). Carried from the open site
 * (`placedContext` in `src/lib/visit.ts`, `countryIsoFor` in `src/lib/calvinProject.ts`, `foldPlace` in
 * `src/lib/placeBox.ts`, commit 0f16957) as functions that need no visit of the site's own.
 *
 * The typed place goes in front of what Wellington heard, so the country they gave is kept: "Kitui" beside "Kenya" is
 * "Kitui, Kenya". Words that name a country themselves stand alone. A place the visitor typed in the site's own box is
 * never overwritten, and a place the pin wrote gives way.
 *
 * It calls no model and has no dependency. The list of countries is the site's: it is passed in.
 */

/** Where the place a site holds came from: typed in its own box, said in a chat, written by the pin, or nothing. */
export type PlaceFrom = "" | "typed" | "chat" | "pin";

export interface HeldPlace {
  text: string;
  from: PlaceFrom;
}

/** The place with the more exact one in front, or the place as it was. */
export function placedPlace(held: HeldPlace, place: string, namesACountry: (text: string) => boolean): HeldPlace {
  const text = place.trim();
  if (text === "" || held.from === "typed") return held;
  const had = held.from === "pin" ? "" : held.text.trim();
  if (had.toLowerCase().includes(text.toLowerCase())) return held;
  return { text: had === "" || namesACountry(text) ? text : `${text}, ${had}`, from: "chat" };
}

/** How a place's words are folded before they are matched: no accents, lower case, letters and numbers only. */
export function foldPlace(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A country as a site lists it: its ISO 3166-1 alpha-3 code and its name. */
export interface Country {
  iso: string;
  name: string;
}

/** The code of the one country the place names, word for word, or null when it names none or more than one. */
export function countryIsoFor(place: string, countries: readonly Country[]): string | null {
  const text = ` ${foldPlace(place)} `;
  if (text.trim() === "") return null;
  const hits: { iso: string; start: number; end: number }[] = [];
  for (const country of countries) {
    const name = foldPlace(country.name);
    if (!name) continue;
    for (let at = text.indexOf(` ${name} `); at !== -1; at = text.indexOf(` ${name} `, at + 1)) {
      hits.push({ iso: country.iso, start: at + 1, end: at + 1 + name.length });
    }
  }
  // A name inside a longer name that also matched gives way to it.
  const standing = hits.filter((h) => !hits.some((o) => o !== h && o.start <= h.start && o.end >= h.end && o.end - o.start > h.end - h.start));
  const found = new Set(standing.map((h) => h.iso));
  return found.size === 1 ? [...found][0]! : null;
}
