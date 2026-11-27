/**
 * THE PRINT PART (shared console page, family 4, rule 13): one way every calculator report is exported, so it prints in
 * full inside any console.
 *
 * WHY. The old print rules hid the page and lifted the report with `position: absolute`. Inside a console, whose main
 * panel has a fixed height and scrolls on its own, the report was placed against that panel: it printed blank, or
 * shifted, clipped and cut off after one page (Session C's test from the packed files, 26 Nov 2026).
 *
 * HOW. On export the report is copied into a print area of its own, straight under `<body>`. While it prints, the print
 * rules (`report.css`) show only that area and take every other part of the page out of the layout, so nothing the
 * site built can move, clip or cut it. The area is emptied after the print.
 *
 * NO PRINT WINDOW. A browser built into an app may do nothing on `window.print()`. A real print window fires
 * `beforeprint` first; when it does not fire, the report opens in its own tab instead, and the outcome says so, so the
 * screen can tell the person plainly (rule 13). If the tab cannot open either, the outcome says that too.
 */

/** The class of the print area under `<body>`. */
export const PRINT_ROOT_CLASS = "wb-print-root";
/** Set on `<html>` while a report prints. */
export const PRINTING_ATTRIBUTE = "data-wb-printing";

/** What an export did: the print window opened; the report opened in its own tab; or neither. */
export type ExportOutcome = "printed" | "in-tab" | "failed";

function clearPrintArea(): void {
  for (const old of Array.from(document.querySelectorAll(`body > .${PRINT_ROOT_CLASS}`))) old.remove();
  document.documentElement.removeAttribute(PRINTING_ATTRIBUTE);
}

/**
 * Prints one report: the element the report frame drew. Returns what happened. A screen calls it from the person's
 * own click (or the frame right after it), so a browser lets the fallback tab open.
 */
export function printReport(report: HTMLElement): ExportOutcome {
  clearPrintArea();
  const area = document.createElement("div");
  area.className = PRINT_ROOT_CLASS;
  area.appendChild(report.cloneNode(true));
  document.body.appendChild(area);
  document.documentElement.setAttribute(PRINTING_ATTRIBUTE, "");

  let opened = false;
  const before = () => {
    opened = true;
  };
  const after = () => {
    window.removeEventListener("afterprint", after);
    clearPrintArea();
  };
  window.addEventListener("beforeprint", before);
  window.addEventListener("afterprint", after);
  try {
    window.print();
  } finally {
    window.removeEventListener("beforeprint", before);
  }
  if (opened) return "printed";
  window.removeEventListener("afterprint", after);
  clearPrintArea();
  return openReportInTab(report) ? "in-tab" : "failed";
}

/**
 * Opens the report in a tab of its own, with the page's stylesheets, ready for the browser's own print or share menu.
 * Returns false when the tab did not open (a blocked pop-up, or no tabs in this browser).
 */
export function openReportInTab(report: HTMLElement): boolean {
  const styles = Array.from(document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]'))
    .map((el) => (el instanceof HTMLLinkElement ? `<link rel="stylesheet" href="${escapeAttribute(el.href)}">` : el.outerHTML))
    .join("\n");
  const title = escapeText(report.querySelector("h1")?.textContent ?? document.title);
  const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>\n${styles}\n</head><body class="wb-report-tab">${report.outerHTML}</body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const tab = window.open(url, "_blank");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return tab !== null;
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttribute(s: string): string {
  return escapeText(s).replace(/"/g, "&quot;");
}
