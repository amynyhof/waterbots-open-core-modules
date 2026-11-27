"use client";

/**
 * THE SHARED REPORT FRAME (shared console page, family 4, rule 14; one frame for every calculator is v1, the
 * maintainer, 26 Nov 2026). Calvin's report, Violet's and every later calculator's use it, so a report has:
 *
 * - the same header: the WaterBots line with the report's kind, its stage, the title and the project's name;
 * - the same sections, in the same order: project details, the result, how it is worked out, the values and their
 *   sources, what must be true, the site's own section, the notes on values, how the figures were produced, and the
 *   use of the figures;
 * - the same footer, with one time stamp (`reportStamp`);
 * - one width, and one notes table (`report.css`).
 *
 * The frame computes nothing and holds no method's words. Each calculator gives its own words for each section; the
 * frame's own words are the section names a report shares.
 */
import type { CSSProperties, ReactNode } from "react";
import { agentStyle } from "./agentColours.js";
import { EXPORT_WORDS } from "./consoleWords.js";
import type { ExportOutcome } from "./print.js";
import { TAP_MIN } from "./tap.js";
import { NotesOnValues } from "./notes.js";
import type { NoteLine } from "./noteFacts.js";
import type { AgentId } from "./record.js";

/** The frame's own words: the sections every report shares. */
export const REPORT_FRAME_WORDS = {
  brand: "WaterBots.AI",
  details: "Project details",
  produced: "How these figures were produced",
  use: "On the use of these figures",
  generated: "Generated",
} as const;

/** The order of a report's sections. A section a report does not have is left out; the order never changes. */
export const REPORT_SECTIONS = ["details", "result", "method", "values", "conditions", "site", "notes", "produced", "use"] as const;
export type ReportSectionId = (typeof REPORT_SECTIONS)[number];

/** One section a calculator fills: its heading, in its own words, and what it holds. */
export interface ReportSection {
  title: ReactNode;
  body: ReactNode;
}

export interface ReportFrameProps {
  /** Whose report it is: it sets the report's colour from core's list. */
  agent: AgentId;
  /** The agent's name, for its notes' label. */
  agentName: string;
  /** The element's id, so the screen can hand it to `printReport`. */
  id?: string;
  /** Extra classes a calculator's own stylesheet uses. */
  className?: string;
  /** Hidden on screen: the report shows only when printed or opened in its own tab. */
  hidden?: boolean;
  /** Data attributes a calculator's tests and sites read, such as `data-view`. */
  data?: Readonly<Record<`data-${string}`, string>>;

  /** The report's kind, after the WaterBots line: "PAA V2.0 Report". */
  kind: string;
  /** Its stage, where a reader looks first: "Ex-ante estimate", "Draft — pending expert review". */
  stage: string;
  title: string;
  projectName: string;
  /** A short paragraph under the title. */
  intro?: ReactNode;
  /** Warnings that must come before everything else, such as a failed self-check. */
  alerts?: ReactNode;

  /** The project details: rows of facts. Its heading is the frame's. */
  details: ReactNode;
  result: ReportSection;
  method: ReportSection;
  values: ReportSection;
  conditions?: ReportSection;
  /** A site's own section (the paid site's monitoring periods). */
  site?: ReactNode;

  /** The notes on values: the person's and the agent's, in core's one table. */
  noteLines: readonly NoteLine[];

  /** How the figures were produced, and their use, in the calculator's own words. */
  produced: ReactNode;
  use: ReactNode;

  /** The footer's line: the time stamp, then the versions and the calculator's name. */
  generatedAt: string;
  versions: readonly string[];
}

/** One time stamp for every report: the day, the month in words, the year, the time and the time zone. */
export function reportStamp(when: Date = new Date(), timeZone?: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
    ...(timeZone !== undefined ? { timeZone } : {}),
  }).format(when);
}

/** The footer's line, as the frame prints it. */
export function reportFooterLine(generatedAt: string, versions: readonly string[]): string {
  return `${REPORT_FRAME_WORDS.generated} ${generatedAt || "—"} · ${versions.join(" · ")}`;
}

function Section({ id, title, children }: { id: ReportSectionId; title: ReactNode; children: ReactNode }) {
  return (
    <section className="wb-report-section" data-report-section={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function ReportFrame(props: ReportFrameProps) {
  const { agent, agentName, id, className, hidden = false, data = {}, kind, stage, title, projectName, intro, alerts } = props;
  return (
    <div
      {...data}
      id={id}
      className={["wb-report", className].filter(Boolean).join(" ")}
      data-wb-report={agent}
      {...(hidden ? { "data-wb-report-hidden": "" } : {})}
      style={agentStyle(agent) as CSSProperties}
    >
      {alerts}
      <header className="wb-report-head" data-report-section="header">
        <div className="wb-report-brand">
          <span className="wb-report-kicker">
            {REPORT_FRAME_WORDS.brand} · {kind}
          </span>
          <span className="wb-report-stage" data-report-stage="">
            {stage}
          </span>
        </div>
        <h1>{title}</h1>
        <div className="wb-report-project">{projectName}</div>
        {intro !== undefined ? <div className="wb-report-intro">{intro}</div> : null}
      </header>

      <Section id="details" title={REPORT_FRAME_WORDS.details}>
        {props.details}
      </Section>
      <Section id="result" title={props.result.title}>
        {props.result.body}
      </Section>
      <Section id="method" title={props.method.title}>
        {props.method.body}
      </Section>
      <Section id="values" title={props.values.title}>
        {props.values.body}
      </Section>
      {props.conditions !== undefined ? (
        <Section id="conditions" title={props.conditions.title}>
          {props.conditions.body}
        </Section>
      ) : null}
      {props.site !== undefined && props.site !== null ? <div data-report-section="site">{props.site}</div> : null}

      <div className="wb-notes" data-report-section="notes">
        <NotesOnValues lines={props.noteLines} agent={agentName} />
      </div>

      <div className="wb-report-closing">
        <Section id="produced" title={REPORT_FRAME_WORDS.produced}>
          {props.produced}
        </Section>
        <Section id="use" title={REPORT_FRAME_WORDS.use}>
          {props.use}
        </Section>
      </div>

      <footer className="wb-report-foot" data-report-footer="">
        {reportFooterLine(props.generatedAt, props.versions)}
      </footer>
    </div>
  );
}

/**
 * THE EXPORT CONTROL (rule 13): the one Export button every calculator screen shows, with the line that says to choose
 * "Save as PDF", and what the last export did when no print window opened. The same words on both sites.
 */
export function ExportControl({ onExport, outcome, className, compact = false }: {
  onExport: () => void;
  /** What the last export did (`printReport`), or null. */
  outcome: ExportOutcome | null;
  /** The screen's own classes for the button. */
  className?: string;
  /** The hint sits beside the button, not under it. */
  compact?: boolean;
}) {
  return (
    <div data-export-control="" style={{ display: "flex", flexDirection: compact ? "row" : "column", flexWrap: "wrap", alignItems: compact ? "center" : "stretch", gap: compact ? "4px 10px" : 4 }}>
      <button type="button" data-export="" onClick={onExport} className={className} style={{ minHeight: TAP_MIN, minWidth: TAP_MIN }}>
        {EXPORT_WORDS.button}
      </button>
      <span data-export-hint="" style={{ color: "var(--fg-3, #5e6d77)", fontSize: 11 }}>
        {EXPORT_WORDS.hint}
      </span>
      {outcome === "in-tab" || outcome === "failed" ? (
        <span role="status" data-export-outcome={outcome} style={{ flexBasis: "100%", color: "var(--warn-text, var(--fg-1, #14212b))", fontSize: 11 }}>
          {outcome === "in-tab" ? EXPORT_WORDS.inTab : EXPORT_WORDS.failed}
        </span>
      ) : null}
    </div>
  );
}
