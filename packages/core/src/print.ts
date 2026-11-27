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
 * WHETHER A PRINT WINDOW OPENED. A real print window fires `beforeprint`. Most browsers fire it inside `window.print()`,
 * which then waits until the window closes. Some browsers and webviews return from `window.print()` at once and fire
 * `beforeprint` a moment later. So when `beforeprint` has not fired by the time `window.print()` returns, the print part
 * keeps listening for `PRINT_WAIT_MS` more. Only when it still has not fired does the report open in its own tab. So one
 * export never both prints and opens a tab, and the outcome says what really happened (rule 13). If the tab cannot open
 * either, the outcome says that too.
 *
 * THE PRINT AREA NEVER STAYS BEHIND. A cancelled print window, or a browser built into an app, may fire `beforeprint`
 * and never `afterprint`. The area and the printing mark leave the live page however the print ends:
 * - on `afterprint`;
 * - when `window.print()` returns, where it waited for the print window, since that window is then closed;
 * - where it did not wait, as soon as the person is back on the page (a click, a key, the page focused or shown again);
 * - at the latest, when the next export starts. Each export first ends the one before it, with all its listeners, so
 *   an `afterprint` left over from an earlier print can never empty the print area of a later one.
 */

/** The class of the print area under `<body>`. */
export const PRINT_ROOT_CLASS = "wb-print-root";
/** Set on `<html>` while a report prints. */
export const PRINTING_ATTRIBUTE = "data-wb-printing";
/**
 * How long, after `window.print()` returns with no print window yet, the print part waits for a late `beforeprint`
 * before it opens the report in its own tab. It is short, so the tab still opens from the person's own click.
 */
export const PRINT_WAIT_MS = 500;

/** What an export did: the print window opened; the report opened in its own tab; or neither. */
export type ExportOutcome = "printed" | "in-tab" | "failed";

/** The signs that the person is back on the page, so no print window is open any more. */
const BACK_ON_PAGE = ["pointerdown", "keydown", "focus", "visibilitychange"] as const;

/** The export now under way, if any. Ending it takes its print area, its mark and every listener it set. */
let current: { end: () => void } | null = null;

function clearPrintArea(): void {
  for (const old of Array.from(document.querySelectorAll(`body > .${PRINT_ROOT_CLASS}`))) old.remove();
  document.documentElement.removeAttribute(PRINTING_ATTRIBUTE);
}

/**
 * Prints one report: the element the report frame drew. Resolves to what happened. A screen calls it from the person's
 * own click (or the frame right after it), so a browser lets the fallback tab open. An export cut short by the next one
 * before it knew whether a print window opened never resolves: the next export's outcome is the one that counts.
 */
export function printReport(report: HTMLElement): Promise<ExportOutcome> {
  current?.end();
  clearPrintArea();
  const area = document.createElement("div");
  area.className = PRINT_ROOT_CLASS;
  document.body.appendChild(area);
  area.appendChild(reportCopy(report));
  document.documentElement.setAttribute(PRINTING_ATTRIBUTE, "");

  return new Promise<ExportOutcome>((resolve) => {
    let opened = false;
    let returned = false;
    let timer: number | undefined;
    const backOnPage = (e: Event) => {
      if (e.type === "visibilitychange" && document.visibilityState === "hidden") return;
      run.end();
    };
    const before = () => {
      opened = true;
      resolve("printed");
      // The print window opened after `window.print()` returned, so it closes in its own time. If `afterprint` never
      // comes, the area leaves the page once the person is back on it.
      if (returned) for (const type of BACK_ON_PAGE) window.addEventListener(type, backOnPage, true);
    };
    // An `afterprint` before this export's own `beforeprint` is left over from an earlier print, and is not this one's.
    const after = () => {
      if (opened) run.end();
    };
    const run = {
      end: () => {
        window.removeEventListener("beforeprint", before);
        window.removeEventListener("afterprint", after);
        for (const type of BACK_ON_PAGE) window.removeEventListener(type, backOnPage, true);
        if (timer !== undefined) window.clearTimeout(timer);
        timer = undefined;
        if (current === run) {
          current = null;
          clearPrintArea();
        }
      },
    };
    current = run;
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);

    try {
      window.print();
    } catch {
      // A browser with no printing at all: the same as no print window.
    }
    returned = true;
    if (opened) {
      // `window.print()` waited for the print window, so the print is over, printed or cancelled.
      run.end();
      return;
    }
    timer = window.setTimeout(() => {
      timer = undefined;
      if (opened || current !== run) return;
      // Still no print window: take the area off the live page and open the report in its own tab.
      run.end();
      resolve(openReportInTab(report) ? "in-tab" : "failed");
    }, PRINT_WAIT_MS);
  });
}

/**
 * The copy of the report that is printed, or opened in a tab.
 *
 * WHY THE COPY IS COMPLETE. A report frame draws its whole report in one React commit, from the screen's state, and
 * draws nothing later: it holds no image, chart, canvas or part loaded later, and no part of it sits outside its root.
 * Each screen calls the print part only after the commit that set the time stamp (Calvin's in the animation frame after
 * it, Violet's in the effect that runs after it), so the report is final when it is copied. The copy also keeps what a
 * plain copy of the elements would lose, so a later calculator cannot lose it either:
 * - the `--` tokens the site sets around the screen (on a shell or a theme, not on `<html>`), written on the copy's
 *   root, because the copy no longer sits inside that shell. Tokens set on `<html>` stay with `<html>`, so a site's
 *   own print values for them still apply;
 * - what a person typed in a box, and what a canvas drew (as a picture), which copying an element leaves out.
 */
export function reportCopy(report: HTMLElement): HTMLElement {
  const copy = report.cloneNode(true) as HTMLElement;
  for (const [name, value] of tokensFromAround(report)) if (!copy.style?.getPropertyValue(name)) copy.style?.setProperty(name, value);
  keepLiveValues(report, copy);
  return copy;
}

/** The `--` tokens whose value at the report's root is not their value at `<html>`: those the site sets around it. */
function tokensFromAround(report: HTMLElement): Array<[string, string]> {
  if (typeof getComputedStyle !== "function") return [];
  const here = getComputedStyle(report);
  const top = getComputedStyle(document.documentElement);
  const names = new Set<string>();
  for (let i = 0; i < here.length; i++) if (here.item(i).startsWith("--")) names.add(here.item(i));
  for (const sheet of readableSheets()) tokenNames(sheet.cssRules, names);
  for (let el: HTMLElement | null = report; el; el = el.parentElement) {
    for (let i = 0; i < (el.style?.length ?? 0); i++) if (el.style.item(i).startsWith("--")) names.add(el.style.item(i));
  }
  const out: Array<[string, string]> = [];
  for (const name of names) {
    const value = here.getPropertyValue(name).trim();
    if (value && value !== top.getPropertyValue(name).trim()) out.push([name, value]);
  }
  return out;
}

function tokenNames(rules: CSSRuleList, names: Set<string>): void {
  for (const rule of Array.from(rules)) {
    const style = (rule as CSSStyleRule).style;
    if (style) for (let i = 0; i < style.length; i++) if (style.item(i).startsWith("--")) names.add(style.item(i));
    const inner = (rule as CSSGroupingRule).cssRules;
    if (inner) tokenNames(inner, names);
  }
}

function keepLiveValues(from: HTMLElement, to: HTMLElement): void {
  if (typeof from.querySelectorAll !== "function" || typeof HTMLInputElement === "undefined") return;
  const pick = "input, textarea, select, canvas";
  const live = Array.from(from.querySelectorAll<HTMLElement>(pick));
  const copied = Array.from(to.querySelectorAll<HTMLElement>(pick));
  live.forEach((el, i) => {
    const c = copied[i];
    if (!c) return;
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked) c.setAttribute("checked", "");
        else c.removeAttribute("checked");
      } else c.setAttribute("value", el.value);
    } else if (el instanceof HTMLTextAreaElement) {
      c.textContent = el.value;
    } else if (el instanceof HTMLSelectElement) {
      Array.from((c as HTMLSelectElement).options).forEach((o, j) => {
        if (el.options[j]?.selected) o.setAttribute("selected", "");
        else o.removeAttribute("selected");
      });
    } else if (el instanceof HTMLCanvasElement) {
      try {
        const img = document.createElement("img");
        img.src = el.toDataURL();
        img.width = el.width;
        img.height = el.height;
        img.style.cssText = el.style.cssText;
        c.replaceWith(img);
      } catch {
        // A canvas drawn from another site's picture cannot be read: it stays blank, as a plain copy would.
      }
    }
  });
}

/** Every stylesheet the page uses, once, in order: its own elements', then any constructed ones. Not the disabled. */
function pageSheets(): CSSStyleSheet[] {
  const all = [...Array.from(document.styleSheets ?? []), ...Array.from(document.adoptedStyleSheets ?? [])];
  return Array.from(new Set(all)).filter((s) => !s.disabled);
}

/** The stylesheets whose rules this page may read (its own; not another site's that does not allow it). */
function readableSheets(): CSSStyleSheet[] {
  return pageSheets().filter((s) => {
    try {
      return s.cssRules !== null;
    } catch {
      return false;
    }
  });
}

/**
 * The page's styles, for a report opened in a tab of its own. A blob tab's own address cannot resolve a relative one,
 * so:
 * - a linked stylesheet is linked again by its full address, and what it names (fonts, pictures) is read against that;
 * - every other stylesheet (a `<style>` element, rules a script added, a constructed stylesheet) is written out from
 *   the page's own rules, so rules a script added are not lost;
 * - and the tab's `<base>` is the page's own address, so a relative address in those rules reads as it does on the page.
 */
export function pageStyles(): string {
  const out: string[] = [];
  for (const sheet of pageSheets()) {
    const media = sheet.media?.mediaText ? ` media="${escapeAttribute(sheet.media.mediaText)}"` : "";
    if (sheet.href) {
      out.push(`<link rel="stylesheet" href="${escapeAttribute(sheet.href)}"${media}>`);
      continue;
    }
    let text: string;
    try {
      text = Array.from(sheet.cssRules).map((r) => r.cssText).join("\n");
    } catch {
      text = (sheet.ownerNode as Element | null)?.textContent ?? "";
    }
    out.push(`<style${media}>${text.replace(/<\/style/gi, "<\\/style")}</style>`);
  }
  return out.join("\n");
}

/**
 * Opens the report in a tab of its own, looking as it does on the page, ready for the browser's own print or share
 * menu. Returns false when the tab did not open (a blocked pop-up, or no tabs in this browser).
 */
export function openReportInTab(report: HTMLElement): boolean {
  const copy = reportCopy(report);
  const title = escapeText(report.querySelector("h1")?.textContent ?? document.title);
  const root = document.documentElement;
  const keep = ["class", "style", "data-theme"]
    .map((name) => [name, root.getAttribute?.(name)] as const)
    .filter(([, value]) => value)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value ?? "")}"`)
    .join("");
  const lang = escapeAttribute(root.getAttribute?.("lang") || "en");
  const html = [
    `<!doctype html>`,
    `<html lang="${lang}"${keep}><head><meta charset="utf-8">`,
    `<base href="${escapeAttribute(document.baseURI)}">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>`,
    pageStyles(),
    `</head><body class="wb-report-tab">${copy.outerHTML}</body></html>`,
  ].join("\n");
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
