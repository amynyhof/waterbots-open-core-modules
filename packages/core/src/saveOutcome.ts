/**
 * What the project-record editor SAYS happened when you press Save.
 *
 * WHY THIS IS A MODULE AND NOT THREE TERNARIES IN THE COMPONENT (#88 part (6),
 * 2026-08-12). Amy: *"A form feeding the calculator cannot fail silently."* The defect
 * this closes was not a broken write — it was a TRUE write and a FALSE screen: a save
 * threw, the error was swallowed, the button returned to its resting state, and the
 * field still showed the value the user typed while the database held the old one. It
 * was caught only because the database was queried directly rather than the screen
 * believed.
 *
 * So the MESSAGES ARE THE DELIVERABLE, which makes them worth unit-testing on their own.
 * The rule they encode: **the surface always names the outcome, and an outcome that is
 * not known is never rendered as success.**
 *
 * THE PROJECT RECORD IS CANON AND THE CALCULATOR READS IT — `country` keys the fNRB and
 * household-size lookups, `technology` selects the methodology path, `populationServed`
 * scales the result. A silently lost `country` is a silently wrong fNRB, which is why
 * this is a correctness bug and not a polish item.
 */

/**
 * WHAT A HOST'S SAVE ANSWERS (the cut, seam S1; plan §8.3). A module never writes anywhere itself:
 * the host passes `onSave`, and this is what it promises back. A refusal carries a `reason` a
 * person can read, and the module shows it — a refused save is never swallowed. A host that
 * passes no `onSave` gets no Save button at all.
 */
export type SaveOutcome = { ok: true } | { ok: false; reason: string };

/** Where a save has got to. `saved` persists until the next edit — see `saveNotice`. */
export type RecordSaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export type SaveNotice = {
  /** Maps to the brand v2 state taxonomy: pending → amber, ok → mint, fail → coral. */
  tone: "neutral" | "pending" | "ok" | "fail";
  text: string;
};

/**
 * Turn a thrown save into something a human can act on.
 *
 * NEVER INVENTS A REASON. If the throw carries no message we say the server did not give
 * one rather than guessing at a cause — a plausible-sounding wrong reason is the same
 * class of lie as a plausible-sounding wrong value (NO MOCK DATA). Database errors arrive
 * as objects with `.message`; Next wraps server-action failures in a generic `Error` in
 * production, and that generic text is still the truth about what we were told.
 */
export function describeSaveFailure(err: unknown): string {
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object") {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return "The server did not say why.";
}

/**
 * The one line under the Save button. `null` means there is genuinely nothing to report:
 * a clean, untouched form.
 *
 * ERROR OUTRANKS EVERYTHING, including the "Unsaved changes" that is also true at that
 * moment — after a failed save the form IS still dirty, but the news is the failure, and
 * burying it under a routine hint is how the original defect read to a user.
 *
 * `saved` DOES NOT EXPIRE ON A TIMER. The proposal asks for a confirmation that "persists
 * long enough to be seen", and a timed fade can still be missed by anyone who looked away
 * — the exact failure mode being fixed. It clears when the user edits again, which is a
 * real signal that they have read it and moved on rather than an arbitrary number of
 * seconds.
 */
export function saveNotice(state: RecordSaveState, dirty: boolean): SaveNotice | null {
  if (state.kind === "error") {
    return {
      tone: "fail",
      text: `Save failed — the record is unchanged. ${state.message}`,
    };
  }
  if (state.kind === "saving") {
    return {
      tone: "pending",
      text: "Saving… don't close this tab until it finishes.",
    };
  }
  if (state.kind === "saved") {
    return { tone: "ok", text: "Saved to the project record." };
  }
  if (dirty) return { tone: "neutral", text: "Unsaved changes" };
  return null;
}

/**
 * Is there a write that a hard navigation would destroy? Drives the `beforeunload` guard.
 *
 * TRUE FOR BOTH IN-FLIGHT AND UNSAVED, and the two are lossy in different ways: closing
 * the tab mid-save aborts the request outright, while unsaved edits were never sent at
 * all. Both end with the record not holding what the screen showed, which is the thing
 * this part exists to make impossible.
 */
export function hasUnsafeWork(state: RecordSaveState, dirty: boolean): boolean {
  return state.kind === "saving" || dirty;
}
