"use client";

// Violet's report (J5, one calculator screen; ruling 2026-11-23): the export of her D-3 screen, as Calvin's report is
// of his. It is on the page but hidden; "Export (PDF)" prints it alone (`styles.css`). It computes nothing: every
// number, note and source comes from `computeD3`. It pins its exact inputs and versions (rulings 5).
//
// Water only. It never shows a carbon figure, and never a total of water and carbon (open item N14).

import { NotesOnValues, type NoteLine } from "@waterbots/core/notes";
import { D3_ENGINE_VERSION } from "../d3/defaults.js";
import type { D3Input, D3Result } from "../d3/types.js";

/** The words the report adds. Every other line is the engine's own, or the screen's. */
export const REPORT_WORDS = {
  title: "Water benefit report",
  project: "Project",
  how: "How the volume is worked out",
  view: "View",
  benefit: "Volumetric water benefit",
  values: "The values used",
  made: "Every figure here is worked out by the D-3 engine, step by step from the guidebook. No figure is made by AI.",
} as const;

export interface D3ReportProps {
  projectName: string;
  input: D3Input;
  result: D3Result;
  /** The words for the volume's option and the view, as the screen shows them. */
  optionLabel: string;
  viewLabel: string;
  /** The "Notes on values": the person's notes on the Paid site, and Violet's, each under its own label. */
  noteLines: readonly NoteLine[];
  /** When the export was made. Blank until then. */
  generatedAt: string;
  /** Shows a number the engine returned. Display only. */
  shown: (v: number | string | null) => string;
}

export default function D3Report({ projectName, input, result, optionLabel, viewLabel, noteLines, generatedAt, shown }: D3ReportProps) {
  const vwb = result.vwbM3PerYear;
  return (
    <div className="violet-report" data-violet-report="" data-view={input.view}>
      <h2>
        {REPORT_WORDS.title} — {result.method}
      </h2>
      <p data-report-status="">{result.status}</p>
      <table data-report-facts="">
        <tbody>
          <tr>
            <th scope="row">{REPORT_WORDS.project}</th>
            <td>{projectName}</td>
          </tr>
          <tr>
            <th scope="row">{REPORT_WORDS.how}</th>
            <td>{optionLabel}</td>
          </tr>
          <tr>
            <th scope="row">{REPORT_WORDS.view}</th>
            <td>{viewLabel}</td>
          </tr>
          <tr>
            <th scope="row">{REPORT_WORDS.benefit}</th>
            <td data-report-vwb="">{vwb !== null ? `${shown(vwb)} m³ a year` : ""}</td>
          </tr>
        </tbody>
      </table>

      <h3>{REPORT_WORDS.values}</h3>
      <table data-report-values="">
        <thead>
          <tr>
            <th scope="col">Value</th>
            <th scope="col">Amount</th>
            <th scope="col">Where it came from</th>
            <th scope="col">Source</th>
          </tr>
        </thead>
        <tbody>
          {result.values.map((v) => (
            <tr key={v.key}>
              <th scope="row">{v.label}</th>
              <td>
                {shown(v.value)} {v.value !== null ? v.unit : ""}
                {v.value !== v.used ? ` (the sum uses ${shown(v.used)})` : ""}
              </td>
              <td>{v.origin ?? ""}</td>
              <td>
                {v.source}
                {v.value !== null && v.note ? <small> {v.note}</small> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>How the benefit is worked out</h3>
      <ol>
        {result.steps.map((s) => (
          <li key={s.label}>
            {s.label}: {s.how} = {shown(s.value)} {s.unit} ({s.source})
          </li>
        ))}
      </ol>
      {result.notes.length > 0 ? (
        <ul>
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      <h3>What must be true for this method</h3>
      <ul>
        {result.conditions.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <NotesOnValues lines={noteLines} agent="Violet" />

      <p>This is an estimate, not a checked result. Only an independent auditor checks a claim.</p>
      <p>{REPORT_WORDS.made}</p>
      <p data-report-footer="">
        Generated {generatedAt || "—"} · D-3 engine v{D3_ENGINE_VERSION} · Violet (VWBA 2.0)
      </p>
    </div>
  );
}
