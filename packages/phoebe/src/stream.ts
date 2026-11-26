/**
 * HER REPLY, READ OUT OF HER ANSWER WHILE IT IS STILL BEING WRITTEN. Carried from the open site (`api/_replyStream.ts`,
 * commit 0f16957). A site that streams her answer shows only the `reply` field as it grows; nothing read here is ever
 * recorded or trusted. The whole answer is still read with `readPhoebeAnswer` once it is finished. A site passes what
 * this gives through core's `showable`, so a promise of a look-up is held back until an answer follows it, and shows
 * nothing of a pass whose `needCards` names a set.
 */
const ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", '"': '"', "\\": "\\", "/": "/" };

/** The reply's text so far, decoded, or null while the reply has not started. Stops short of a half-written escape. */
export function replySoFar(partial: string): string | null {
  const key = /"reply"\s*:\s*"/.exec(partial);
  if (!key) return null;
  let i = key.index + key[0].length;
  let out = "";
  while (i < partial.length) {
    const ch = partial[i] ?? "";
    if (ch === '"') return out;
    if (ch === "\\") {
      const next = partial[i + 1];
      if (next === undefined) break;
      if (next === "u") {
        const hex = partial.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) break;
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      out += ESCAPES[next] ?? next;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** The value of `needCards` once it is written, or null before then. */
export function needCardsSoFar(partial: string): string | null {
  return /"needCards"\s*:\s*"([^"\\]*)"/.exec(partial)?.[1] ?? null;
}
