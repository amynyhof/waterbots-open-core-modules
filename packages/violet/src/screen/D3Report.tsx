"use client";

// Violet's report (J5, one calculator screen; ruling 2026-11-23): the export of her D-3 screen, as Calvin's report is
// of his. It sits on core's one report frame (family 4): the same header, the same sections in the same order, the same
// notes table and footer as every calculator's report. It is on the page but hidden; Export prints it through core's
// print part. It computes nothing: every number, note and source comes from `computeD3`. It pins its exact inputs and
// versions (rulings 5).
//
// Water only. It never shows a carbon figure, and never a total of water and carbon (open item N14).

import type { NoteLine } from "@waterbots/core/notes";
import { ReportFrame } from "@waterbots/core/report";
import { D3_ENGINE_VERSION } from "../d3/defaults.js";
import type { D3Input, D3Result } from "../d3/types.js";

/** The words the report adds. Every other line is the engine's own, the screen's, or the frame's. */
export const REPORT_WORDS = {
  title: "Water benefit report",
  project: "Project",
  how: "How the volume is worked out",
  view: "View",
  benefit: "Volumetric water benefit",
  result: "Volumetric water benefit — result",
  values: "The values used",
  steps: "How the benefit is worked out",
  conditions: "What must be true for this method",
  estimate: "This is an estimate, not a checked result. Only an independent auditor checks a claim.",
  made: "Every figure here is worked out by the D-3 engine, step by step from the guidebook. No figure is made by AI.",
} as const;

export interface D3ReportProps {
  /** The report's element id, so the screen's Export can hand it to core's print part. */
  id?: string;
  projectName: string;
  input: D3Input;
  result: D3Result;
  /** The words for the volume's option and the view, as the screen shows them. */
  optionLabel: string;
  viewLabel: string;
  /** The "Notes on values": the person's notes on the Paid site, and Violet's, each under its own label. */
  noteLines: readonly NoteLine[];
  /** When the export was made, in core's one time stamp. Blank until then. */
  generatedAt: string;
  /** Shows a number the engine returned. Display only. */
  shown: (v: number | string | null) => string;
}

export default function D3Report({ id, projectName, input, result, optionLabel, viewLabel, noteLines, generatedAt, shown }: D3ReportProps) {
  const vwb = result.vwbM3PerYear;
  return (
    <ReportFrame
      agent="violet"
      agentName="Violet"
      {...(id !== undefined ? { id } : {})}
      className="violet-report"
      hidden
      data={{ "data-violet-report": "", "data-view": input.view }}
      kind={REPORT_WORDS.title}
      stage={result.status}
      title={result.method}
      projectName={projectName}
      details={
        <table className="wb-report-table" data-report-facts="">
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
          </tbody>
        </table>
      }
      result={{
        title: REPORT_WORDS.result,
        body: (
          <table className="wb-report-table" data-report-result="">
            <tbody>
              <tr>
                <th scope="row">{REPORT_WORDS.benefit}</th>
                <td data-report-vwb="">{vwb !== null ? `${shown(vwb)} m³ a year` : ""}</td>
              </tr>
            </tbody>
          </table>
        ),
      }}
      method={{
        title: REPORT_WORDS.steps,
        body: (
          <>
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
          </>
        ),
      }}
      values={{
        title: REPORT_WORDS.values,
        body: (
          <table className="wb-report-table" data-report-values="">
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
        ),
      }}
      conditions={{
        title: REPORT_WORDS.conditions,
        body: (
          <ul>
            {result.conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        ),
      }}
      noteLines={noteLines}
      produced={<p>{REPORT_WORDS.made}</p>}
      use={<p>{REPORT_WORDS.estimate}</p>}
      generatedAt={generatedAt}
      versions={[`D-3 engine v${D3_ENGINE_VERSION}`, "Violet (VWBA 2.0)"]}
    />
  );
}
