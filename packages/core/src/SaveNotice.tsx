"use client";

import type { SaveNotice as Notice } from "./saveOutcome";

/**
 * The one way a save reports what happened, on every surface that saves (#98, sub-bite 2b).
 *
 * WHY IT IS A COMPONENT AND NOT COPIED MARKUP. The project-record editor grew this box for
 * #88 part (6); the calculator, the transition checklist and the standards toggle now need
 * the same thing, and four copies of "how a failed save looks" is four places for the voice
 * to drift and three places to forget the `role="alert"`. `build global, consume locally` —
 * the record editor is simply the first consumer rather than the owner.
 *
 * THE TEXT IS NOT DECIDED HERE. `saveNotice()` in `saveOutcome.ts` owns the
 * sentences and is unit-tested on its own; this only paints them. Keeping the words in a
 * pure module is what let them be tested without mounting anything, and that stays true.
 *
 * COLOURS COME FROM THE BRAND SEMANTIC STATE TAXONOMY, never hand-picked — pending → amber,
 * ok → mint, fail → coral, as tokens.
 */
const NOTICE_COLOR: Record<"pending" | "ok" | "fail", string> = {
  pending: "var(--state-pending)",
  ok: "var(--state-approved)",
  fail: "var(--state-warn)",
};

/** The same states as TYPE (BRAND V4.1 §2.5, Amy 2026-08-31). A state colour as a dot is
 *  not the same colour as a state colour as text — the dot, the keyline and the wash keep
 *  NOTICE_COLOR above; only the words use these. `pending` has no ruled text value, so it
 *  points at its dot colour rather than at a hex nobody approved. */
const NOTICE_TEXT: Record<"pending" | "ok" | "fail", string> = {
  pending: "var(--state-pending)",
  ok: "var(--approved-text)",
  fail: "var(--warn-text)",
};

/**
 * The quiet, inline half — "Unsaved changes" and nothing louder. Rendered beside the Save
 * button, because a routine hint next to the control is not news and must not look like it.
 */
export function SaveHint({ notice }: { notice: Notice | null }) {
  if (!notice || notice.tone !== "neutral") return null;
  return (
    <span className="t-caption text-fg-3" style={{ fontSize: 11 }}>
      {notice.text}
    </span>
  );
}

/**
 * The loud half — saving, saved, or failed. `role="alert"` + `aria-live="assertive"` for a
 * failure so a screen reader is told without having to go looking; polite for the rest,
 * which are confirmations rather than interruptions.
 */
export default function SaveNoticeBox({ notice }: { notice: Notice | null }) {
  if (!notice || notice.tone === "neutral") return null;
  return (
    <div
      role={notice.tone === "fail" ? "alert" : "status"}
      aria-live={notice.tone === "fail" ? "assertive" : "polite"}
      className="mt-3 flex items-start gap-2 rounded-md p-2"
      style={{
        border: `1px solid ${NOTICE_COLOR[notice.tone]}`,
        background: `color-mix(in oklab, ${NOTICE_COLOR[notice.tone]} 8%, transparent)`,
      }}
    >
      <span
        className="mt-1 inline-block h-2 w-2 shrink-0 rounded-pill"
        style={{ background: NOTICE_COLOR[notice.tone] }}
        aria-hidden
      />
      <span
        className="t-caption"
        style={{ color: NOTICE_TEXT[notice.tone], fontSize: 11, maxWidth: "68ch" }}
      >
        {notice.text}
      </span>
    </div>
  );
}
