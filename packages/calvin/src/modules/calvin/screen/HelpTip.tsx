"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * HelpTip — a note that opens on CLICK as well as on hover (Amy, 2026-09-03 side quest, Job 3).
 *
 * THE DEFECT. Every explanatory note on the calculator — the FIXED / DERIVED / DEFAULT badges,
 * the pencil glyph, the Beta tag — was an HTML `title` attribute with `cursor: help`. The
 * cursor PROMISED a note; hovering (on a mouse, after a delay) delivered it; clicking did
 * nothing at all, and on a touch screen nothing ever appeared. Amy: *"clicking a value tagged
 * FIXED shows nothing."*
 *
 * THE FIX, AND ITS LIMIT. The element becomes a real button: click toggles the SAME note,
 * shown as a small card beneath it; hover keeps the browser tooltip; Escape and an outside
 * click close it. **No new notes are written here** — only what already existed is wired up
 * (the engineer's guardrail). A component with nothing to say renders nothing clickable.
 *
 * GLOBAL BY CONSTRUCTION: one wrapper, consumed by every badge and glyph, so the twenty-seven
 * tips on the surface behave identically and a badge added tomorrow inherits the click.
 */
export default function HelpTip({
  text,
  label,
  align = "right",
  children,
}: {
  /** The note — the existing tip, verbatim. */
  text: string;
  /** Accessible name for the button, e.g. "What does FIXED mean?". */
  label: string;
  /** Which edge the card hangs from. */
  align?: "left" | "right";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /*
   * A `span` WITH THE BUTTON ROLE, NOT A `<button>`. Several badges sit INSIDE a row header
   * that is itself a `<button>` (the row toggles open on click), and a button may not contain
   * a button — the first build did exactly that and React logged a hydration failure. The
   * span carries the role, a tab stop, and Enter/Space handling, and STOPS PROPAGATION so
   * opening a note never also toggles the row it sits in.
   */
  const toggle = (e: { stopPropagation: () => void; preventDefault?: () => void }) => {
    e.stopPropagation();
    setOpen((v) => !v);
  };
  return (
    <span ref={ref} className="relative inline-flex">
      <span
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle(e);
          }
        }}
        aria-expanded={open}
        aria-label={label}
        title={text}
        className="inline-flex items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-tide"
        style={{ cursor: "help" }}
      >
        {children}
      </span>
      {open ? (
        <span
          role="note"
          className="absolute z-30 rounded-md border border-line bg-raised px-3 py-2 text-fg-1 shadow-lg"
          style={{
            top: "100%",
            [align]: 0,
            marginTop: 4,
            width: 260,
            fontSize: 11,
            lineHeight: 1.5,
            whiteSpace: "normal",
            textAlign: "left",
            textTransform: "none",
            letterSpacing: 0,
            fontFamily: "inherit",
          }}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
