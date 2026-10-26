/**
 * The single Beta marker for the calculator working surface — now a ONE-LINE FOOTER at the
 * bottom of the calculator tab (Amy, 2026-09-07: "put it back on the calculator as a one-line
 * footer. Honest state, shown to visitors."). It had fallen off the surface at #82 step 3 and
 * lived only in a test until PR #48 found it.
 *
 * ONE hedge, not two: it covers both the draft Transition content and the calculator's pending
 * expert review. Lives ONLY in the on-screen surface — never inside ReportView, so the exported
 * deliverable carries no Beta marker (canon). No partner name (#41).
 *
 * THE COUNT IS A PROP, READ ON THE SERVER. `caseCount` comes from
 * `lib/calculator/referenceCases.ts` via the project page, so the dataset never ships to the
 * browser. The word is "cases" and the tests pin it to that count (Amy, 2026-09-07: the dataset
 * has 44 cases and 106 anchor values; never mix them). With no count supplied the line still
 * renders, without a number — it never invents one.
 */
export function betaNote(caseCount?: number): string {
  const checked =
    typeof caseCount === "number" && caseCount > 0
      ? `deterministic and checked against ${caseCount} reference cases`
      : "deterministic";
  return (
    "Beta — draft transition content, and the calculator is pending expert review. The numbers are " +
    `${checked}; the methodology checklist and equation explanations await expert sign-off.`
  );
}

export default function BetaTag({ caseCount }: { caseCount?: number }) {
  return (
    <p className="flex items-center gap-2 text-fg-4" style={{ fontSize: 10, lineHeight: 1.4 }}>
      <span
        className="t-mono inline-flex shrink-0 items-center gap-1 rounded-pill px-2"
        style={{
          fontSize: 10,
          color: "var(--fg-1)",
          background: "color-mix(in oklab, var(--iris) 14%, transparent)",
          boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--iris) 40%, transparent)",
        }}
      >
        <span className="inline-block h-2 w-2 rounded-pill" style={{ background: "var(--iris)" }} aria-hidden />
        Beta
      </span>
      <span>{betaNote(caseCount)}</span>
    </p>
  );
}
