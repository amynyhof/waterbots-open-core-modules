/**
 * NUMBERS AS A PERSON WRITES THEM (2026-11-25). Reads the numbers in a visitor's message: digits with group marks, decimal
 * commas, scale words such as thousand, English number words, and percent.
 *
 * Some writing can be read two ways: "1,200" is twelve hundred to one person and one point two to another. Each number
 * keeps every reading it could have, the likeliest first. Nothing here decides a project fact: it only says which numbers
 * the visitor gave.
 */

/** One number in a message. */
export interface WrittenNumber {
  /** As it was written. */
  text: string;
  /** Every number it could be, the likeliest first. A percent is also read as its fraction. */
  readings: readonly number[];
  percent: boolean;
}

const SCALE: Record<string, number> = {
  hundred: 100, hundreds: 100, dozen: 12, dozens: 12, k: 1e3, thousand: 1e3, thousands: 1e3, lakh: 1e5, lakhs: 1e5, lac: 1e5,
  mn: 1e6, million: 1e6, millions: 1e6, crore: 1e7, crores: 1e7, bn: 1e9, billion: 1e9, billions: 1e9,
};

const UNITS: Record<string, number> = {
  zero: 0, nil: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};

const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

/** A tidy sum: 4.6 thousand is 4,600, not 4,599.999. */
const times = (a: number, b: number): number => Number((a * b).toPrecision(12));

/** The readings of a run of digits with marks in it, the likeliest first. */
function readDigits(raw: string): number[] {
  const s = raw.replace(/[\s  '’]/g, "");
  const dots = s.split(".").length - 1;
  const commas = s.split(",").length - 1;
  const plain = (t: string): number => Number(t.replace(/,/g, ""));
  if (dots === 0 && commas === 0) return [Number(s)];
  if (dots > 0 && commas > 0) {
    // The last mark is the decimal one; the other groups.
    const decimal = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
    const group = decimal === "." ? "," : ".";
    const t = s.split(group).join("");
    return t.split(decimal).length === 2 ? [Number(t.replace(decimal, "."))] : [];
  }
  const mark = dots > 0 ? "." : ",";
  const parts = s.split(mark);
  if (parts.length > 2) return parts.slice(1).every((p) => p.length === 3 || p.length === 2) ? [Number(parts.join(""))] : [];
  const [whole, rest] = parts as [string, string];
  const asDecimal = Number(`${whole}.${rest}`);
  if (rest.length !== 3 || whole === "0" || whole.length > 3) return [asDecimal];
  const asGroups = Number(whole + rest);
  return mark === "," ? [plain(s), asDecimal] : [asDecimal, asGroups];
}

const DIGITS = /\d{1,3}(?:[   '’]\d{3})+(?:[.,]\d+)?|\d(?:[\d.,]*\d)?/g;
const AFTER = /^\s*-?\s*(k|thousands?|hundreds?|dozens?|lakhs?|lac|millions?|mn|crores?|billions?|bn)\b/i;
const PERCENT = /^\s*-?\s*(?:%|per\s?cent(?:age)?\b|pct\b)/i;

interface Found extends WrittenNumber {
  at: number;
}

function withPercent(readings: number[]): number[] {
  return readings.flatMap((r) => [r, Number((r / 100).toPrecision(12))]);
}

function inDigits(text: string): Found[] {
  const out: Found[] = [];
  for (const m of text.matchAll(DIGITS)) {
    const at = m.index;
    const before = text.slice(0, at);
    const prev = before.slice(-1);
    // A digit joined to a letter before it is part of a name, such as V2 or CO2.
    if (/[A-Za-z_]/.test(prev)) continue;
    let after = text.slice(at + m[0].length);
    if (/^(?:st|nd|rd|th)\b/i.test(after)) continue;
    const minus = /(?:^|[\s(])(?:[-−–]\s?|(?:minus|negative)\s+)$/i.test(before) && !/\d\s*[-−–]\s?$/.test(before);
    let written = m[0];
    let readings = readDigits(m[0]);
    for (let scale = AFTER.exec(after); scale !== null; scale = AFTER.exec(after)) {
      const by = SCALE[scale[1]!.toLowerCase()]!;
      readings = readings.map((r) => times(r, by));
      written += scale[0];
      after = after.slice(scale[0].length);
    }
    const percent = PERCENT.exec(after);
    if (percent !== null) written += percent[0];
    if (minus) readings = readings.map((r) => -r);
    if (readings.length === 0) continue;
    out.push({ at, text: (minus ? "-" : "") + written.trim(), readings: percent !== null ? withPercent(readings) : readings, percent: percent !== null });
    // "12 500" may be one number or two.
    if (/\d \d/.test(m[0])) for (const part of m[0].split(" ")) out.push({ at, text: part, readings: readDigits(part), percent: false });
  }
  return out;
}

/** Number words, such as "two and a half thousand" or "twelve hundred". */
function inWords(text: string): Found[] {
  const out: Found[] = [];
  const words = [...text.matchAll(/[A-Za-z]+/g)].map((m) => ({ w: m[0].toLowerCase(), at: m.index, end: m.index + m[0].length }));
  let i = 0;
  while (i < words.length) {
    const start = i;
    let total = 0;
    let cur = 0;
    let seen = false;
    let last: "none" | "unit" | "ten" | "scale" | "half" = "none";
    while (i < words.length) {
      const { w, at } = words[i]!;
      const next = words[i + 1]?.w;
      const after = words[i + 2]?.w;
      // A full stop, a comma or a digit between two words ends a number.
      if (seen && /[^\s-]/.test(text.slice(words[i - 1]!.end, at))) break;
      if (w === "a" && next !== undefined && SCALE[next] !== undefined && next !== "k" && !seen) {
        cur = 1;
        last = "unit";
        seen = true;
      } else if (w === "half" && ((next === "a" && after !== undefined && SCALE[after] !== undefined) || !seen)) {
        cur += 0.5;
        last = "half";
        seen = true;
        if (next === "a" && after !== undefined && SCALE[after] !== undefined) i += 1;
      } else if (w === "and" && next === "a" && after === "half" && seen) {
        cur += 0.5;
        last = "half";
        i += 2;
      } else if (w === "and" && seen && last === "scale" && next !== undefined && (UNITS[next] !== undefined || TENS[next] !== undefined)) {
        // "one hundred and twenty"
      } else if (w === "point" && seen && next !== undefined && UNITS[next] !== undefined && UNITS[next] < 10) {
        let decimals = "";
        while (words[i + 1] !== undefined && UNITS[words[i + 1]!.w] !== undefined && UNITS[words[i + 1]!.w]! < 10) {
          decimals += String(UNITS[words[i + 1]!.w]);
          i += 1;
        }
        cur = Number(`${cur}.${decimals}`);
        last = "half";
      } else if (UNITS[w] !== undefined && (last === "none" || last === "scale" || (last === "ten" && UNITS[w] > 0 && UNITS[w] < 10))) {
        cur += UNITS[w];
        last = "unit";
        seen = true;
      } else if (TENS[w] !== undefined && (last === "none" || last === "scale")) {
        cur += TENS[w];
        last = "ten";
        seen = true;
      } else if (SCALE[w] !== undefined && w !== "k" && seen && last !== "none") {
        if (w.startsWith("hundred") || w.startsWith("dozen")) cur = times(cur === 0 ? 1 : cur, SCALE[w]);
        else {
          total += times(cur === 0 ? 1 : cur, SCALE[w]);
          cur = 0;
        }
        last = "scale";
      } else break;
      i += 1;
    }
    if (!seen) {
      i += 1;
      continue;
    }
    const first = words[start]!;
    const end = words[i - 1]!.end;
    // "2 million" and "two 5s" are read with their digits.
    const digitBefore = /\d[\s-]*$/.test(text.slice(0, first.at)) && SCALE[first.w] !== undefined;
    if (digitBefore) continue;
    const minus = /\b(?:minus|negative)\s+$/i.test(text.slice(0, first.at));
    const n = (minus ? -1 : 1) * (total + cur);
    const percent = PERCENT.test(text.slice(end));
    out.push({ at: first.at, text: text.slice(first.at, end), readings: percent ? withPercent([n]) : [n], percent });
  }
  return out;
}

/** The numbers in a message, in the order they were written. */
export function readNumbers(text: string): WrittenNumber[] {
  return [...inDigits(text), ...inWords(text)].sort((a, b) => a.at - b.at).map(({ at: _at, ...n }) => n);
}

/** The same number, give or take a computer's stray decimals. */
export function sameNumber(a: number, b: number): boolean {
  return a === b || Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
}
