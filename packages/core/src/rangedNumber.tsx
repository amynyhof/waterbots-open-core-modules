"use client";

// THE TYPED NUMBER BOX (value ranges, ruled 2026-11-23). Every calculator screen's number boxes use this one hook, so
// a refused number behaves the same on each of them:
//
// - A number inside its range is set as it is typed.
// - A number outside it is refused at once: the box keeps what was typed, the message says the range, and the value
//   in force goes back to what it was when the person came to the box. So "400" never leaves "40" behind.
// - When the person leaves the box it shows the value in force again (blank when there is none), and the message stays
//   until the next number is typed. So a box never rests on a number the sums do not use.

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";

/** How long a box that closes its own panel waits before it takes the number typed. */
const PAUSE_MS = 1000;

export interface RangedNumberOptions<Snapshot> {
  /** The value in force, in the box's own units. */
  value: number | null | undefined;
  /** Sets a number that is inside its range. */
  onSet: (v: number) => void;
  /** An emptied box clears the value. Left out: an emptied box keeps the last value. */
  onClear?: (() => void) | undefined;
  /** The message when a number is refused, or null when it is fine (`rangeRefusal`). */
  refuse?: ((v: number) => string | null) | undefined;
  /** What to put back when a number is refused, read when the person comes to the box. */
  snapshot?: (() => Snapshot) | undefined;
  restore?: ((s: Snapshot) => void) | undefined;
  /**
   * True for a box in a panel that closes once its value is given. It takes the number on Enter, on leaving the box, or
   * after a short pause, so the panel does not close on the first digit.
   */
  settle?: boolean | undefined;
}

export interface RangedNumber {
  raw: string;
  /** The message, or null. */
  message: string | null;
  onFocus: () => void;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

const asText = (v: number | null | undefined): string => (v === null || v === undefined || !Number.isFinite(v) ? "" : String(v));

export function useRangedNumber<Snapshot>(o: RangedNumberOptions<Snapshot>): RangedNumber {
  const { value } = o;
  const [raw, setRaw] = useState<string>(() => asText(value));
  const [message, setMessage] = useState<string | null>(null);
  /** The box holds a refused number, so it does not follow the value until the person leaves it. */
  const refused = useRef(false);
  const before = useRef<{ s: Snapshot } | null>(null);
  const waiting = useRef<{ timer: ReturnType<typeof setTimeout>; v: number } | null>(null);
  const latest = useRef(o);
  latest.current = o;

  // The box follows the value when it changes from outside.
  useEffect(() => {
    if (refused.current || waiting.current !== null) return;
    const parsed = raw.trim() === "" ? undefined : Number(raw);
    const inForce = value === null || value === undefined || !Number.isFinite(value) ? undefined : value;
    if (inForce !== parsed) setRaw(asText(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const drop = () => {
    if (waiting.current !== null) clearTimeout(waiting.current.timer);
    waiting.current = null;
  };
  useEffect(() => drop, []);

  /** Takes the number a settling box is waiting on. */
  const take = () => {
    const w = waiting.current;
    if (w === null) return;
    drop();
    latest.current.onSet(w.v);
  };

  const remember = () => {
    if (o.snapshot !== undefined) before.current = { s: o.snapshot() };
  };

  return {
    raw,
    message,
    onFocus: remember,
    onChange(e) {
      const text = e.target.value;
      setRaw(text);
      drop();
      refused.current = false;
      if (text.trim() === "") {
        setMessage(null);
        o.onClear?.();
        return;
      }
      const v = Number(text);
      if (!Number.isFinite(v)) return;
      if (before.current === null) remember();
      const refusal = o.refuse?.(v) ?? null;
      setMessage(refusal);
      if (refusal !== null) {
        refused.current = true;
        if (before.current !== null) o.restore?.(before.current.s);
        return;
      }
      if (o.settle === true) waiting.current = { v, timer: setTimeout(take, PAUSE_MS) };
      else o.onSet(v);
    },
    onBlur() {
      take();
      before.current = null;
      if (refused.current) {
        refused.current = false;
        setRaw(asText(latest.current.value));
      }
    },
    onKeyDown(e) {
      if (e.key !== "Enter") return;
      take();
      // Enter keeps the number typed: a refusal after it goes back to this one.
      if (!refused.current) before.current = null;
    },
  };
}

/** The message under a box. Nothing when there is none. */
export function RangeMessage({ message }: { message: string | null }) {
  if (message === null) return null;
  return (
    <span role="alert" data-range-message="" style={{ order: 1, flexBasis: "100%", color: "var(--warn-text, var(--fg-1))", fontSize: 11 }}>
      {message}
    </span>
  );
}
