/**
 * The single Beta marker for the calculator working surface: a one-line footer at the bottom of the calculator tab
 * (ruling 2026-09-07). It lives ONLY on the on-screen surface, never inside ReportView, so the exported report
 * carries no Beta marker.
 *
 * JUST THE WORD (the maintainer's walk of the open site, 2026-11-16). The calculator has had its expert review, so
 * the note that said it was pending review is gone. `caseCount` is still accepted, so a site that passes it keeps
 * working, and is not shown.
 */
export default function BetaTag(_props: { caseCount?: number }) {
  return (
    <p className="flex items-center gap-2 text-fg-4" style={{ fontSize: 10, lineHeight: 1.4 }}>
      <span
        className="t-mono inline-flex shrink-0 items-center gap-1 rounded-pill px-2"
        data-beta=""
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
    </p>
  );
}
