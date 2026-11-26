/**
 * HER TOOL TAB: the eligibility worksheet. Carried from the open site (`src/components/EligibilityWorksheet.tsx`,
 * commit 0f16957). One section per pathway, read from the tool file in each of her packs: the pathway's own state, the
 * readiness read worked out from the rows, the rows she asks with the cited route under a Fixable one, and the rows done
 * later, grouped by phase and shown once. Then the ten considerations, which are guidance and never a gate.
 *
 * Nothing here is typed by hand: the rows, their order, their states and their colours come from the tool files, and
 * the words of each row from the card it cites. A worksheet nobody has worked shows every row as Not yet checked.
 *
 * Styled with core's tokens (`@waterbots/core/base.css`); a site's own design system may set them. The portrait and the
 * map button are the site's: pass `portrait` and `onOpenMap`. `resetsOnReload` says the site keeps no worksheet between
 * visits, and the screen says so.
 */
import { useState, type CSSProperties, type ReactNode } from "react";
import { CONSIDERATIONS, CONSIDERATION_GROUPS, cardFor, routeFor, type Citation, type Consideration, type RowCard } from "./cards.js";
import { PATHWAY_STATE_LABEL, READINESS_LABEL, TOOL_SECTIONS, askedRows, isPathwayRow, shownGroups, type ToolRow, type ToolSection } from "./generated/worksheet.generated.js";
import { STATE_LABEL, contextFor, pathwayState, readiness, stateColour, stateOf, type RowStateId, type RowStatus, type Sheet } from "./worksheet.js";

export interface EligibilityWorksheetProps {
  sheet: Sheet;
  /** The carbon class the record gives, in her packs' word (`classFor`), or "". */
  gsClass: string;
  /** The packs she reads. A pack she does not read says so here. */
  herPacks: readonly string[];
  /** Opens the map when a pathway reads likely. Left out, the banner names the next stop with no button. */
  onOpenMap?: () => void;
  /** Her portrait, as an image address. Left out, none is drawn. */
  portrait?: string;
  /** The site keeps no worksheet between visits: the empty screen says the rows reset on a reload. */
  resetsOnReload?: boolean;
}

const card: CSSProperties = { background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)" };
const tag: CSSProperties = { display: "inline-block", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "1px 6px", fontSize: 11, color: "var(--fg-2)" };
const bullets: CSSProperties = { margin: "0 0 14px", paddingLeft: 18, lineHeight: 1.65, listStyle: "disc" };

export default function EligibilityWorksheet({ sheet, gsClass, herPacks, onOpenMap, portrait, resetsOnReload = false }: EligibilityWorksheetProps) {
  const likely = TOOL_SECTIONS.some((part) => herPacks.includes(part.pack) && readiness(sheet, part.pack, contextFor(sheet, part.pack, gsClass)) === "likely-eligible");
  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "28px 16px 64px" }}>
        <header style={{ marginBottom: 30 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
              padding: "8px 12px",
              borderLeft: "3px solid var(--agent)",
              background: "color-mix(in oklab, var(--agent) 8%, var(--paper))",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {portrait !== undefined ? <img src={portrait} alt="" width={28} height={28} style={{ flex: "none" }} /> : null}
            <span className="t-caption" style={{ color: "var(--fg-1)", fontSize: 13 }}>
              Phoebe is checking your project against these criteria.
            </span>
          </div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Eligibility worksheet
          </div>
          <h1 className="t-h3" style={{ margin: "0 0 10px" }}>
            Which pathways could this project count on?
          </h1>
          <p className="t-body" style={{ margin: 0, color: "var(--fg-2)", maxWidth: "62ch" }}>
            One section per pathway. Phoebe works through the rows that can be answered from the idea itself, and where one is not met she says what would
            change it, or, on the rare row that cannot change, why. Nothing here is a pass or a fail: each pathway ends in a plain reading of how ready it looks.
          </p>
          <div style={{ marginTop: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              Why start here
            </div>
            <p className="t-caption" style={{ margin: "0 0 10px", lineHeight: 1.7, maxWidth: "66ch" }}>
              Eligibility is the first step of any water-benefit journey, and it is worth taking before the others. Quantifying a benefit, finding partners, agreeing
              attribution, reporting for years afterwards — none of that matters if the project cannot generate a countable benefit in the first place. Answering that
              question early saves the work that would otherwise be spent finding out late.
            </p>
            <p className="t-caption" style={{ margin: 0, lineHeight: 1.7, maxWidth: "66ch" }}>
              This is a first screening, not an official decision.
            </p>
          </div>
        </header>

        {likely ? <ReadyBanner {...(onOpenMap ? { onOpenMap } : {})} /> : null}

        {TOOL_SECTIONS.map((part) => (
          <PathwaySection key={part.pack} part={part} sheet={sheet} gsClass={gsClass} hers={herPacks.includes(part.pack)} resetsOnReload={resetsOnReload} />
        ))}

        <div style={{ borderTop: "1px solid var(--line)", margin: "38px 0 0" }} />

        <section aria-labelledby="wb-considerations-heading" style={{ marginTop: 30 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Guidance, not a gate
          </div>
          <h2 id="wb-considerations-heading" style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 600 }}>
            Ten selection considerations
          </h2>
          <p className="t-caption" style={{ margin: 0, lineHeight: 1.65, maxWidth: "68ch" }}>
            These are for choosing well between projects that already qualify on the water pathway. They help you choose — they are never a bar to entry, they carry
            no ranking, and how much each one counts for is yours to decide, not ours.
          </p>
          {CONSIDERATION_GROUPS.map((group) => (
            <div key={group.key} style={{ marginTop: 24 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--fg-1)" }}>{group.label}</h3>
              <p className="t-caption" style={{ margin: "0 0 12px", lineHeight: 1.6 }}>
                {group.note}
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {CONSIDERATIONS.filter((c) => c.group === group.key).map((consideration) => (
                  <li key={consideration.number} style={{ marginBottom: 8 }}>
                    <ConsiderationRow consideration={consideration} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function PathwaySection({ part, sheet, gsClass, hers, resetsOnReload }: { part: ToolSection; sheet: Sheet; gsClass: string; hers: boolean; resetsOnReload: boolean }) {
  const context = contextFor(sheet, part.pack, gsClass);
  const asked = askedRows(part.pack, context);
  const groups = shownGroups(part.pack, context);
  const state = pathwayState(sheet, part.pack, context);
  const read = readiness(sheet, part.pack, context);
  const worked = asked.some((row) => stateOf(sheet, part.pack, row.id).state !== "unchecked");
  return (
    <section aria-labelledby={`wb-pathway-${part.sectionId}`} style={{ marginTop: 28, opacity: hers ? 1 : 0.85 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 id={`wb-pathway-${part.sectionId}`} style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
          {part.sectionName}
        </h2>
        <span className="t-caption" style={{ fontSize: 12 }}>
          {PATHWAY_STATE_LABEL[state]}
        </span>
      </div>
      {!hers ? (
        <p className="t-caption" style={{ margin: "8px 0 0", lineHeight: 1.65, maxWidth: "66ch" }}>
          Phoebe does not read this pathway&rsquo;s cards yet, so nothing here is checked.
        </p>
      ) : (
        <>
          <p className="t-caption" style={{ margin: "8px 0 14px", lineHeight: 1.65, maxWidth: "66ch" }}>
            {worked ? (
              <>
                The reading from these rows: <strong style={{ color: "var(--fg-1)" }}>{READINESS_LABEL[read]}</strong>. This is a first screening, not an official decision.
              </>
            ) : (
              <>
                Nothing has been checked yet. Rows change as you work through them with Phoebe
                {resetsOnReload ? ", and they reset if you reload the page — this console keeps no memory between visits." : "."}
              </>
            )}
          </p>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {asked.map((row) => (
              <li key={row.id} style={{ marginBottom: 10 }}>
                <Row pack={part.pack} row={row} status={stateOf(sheet, part.pack, row.id)} />
              </li>
            ))}
          </ol>
          <LaterSection pack={part.pack}>
            <p className="t-caption" style={{ margin: "0 0 12px", lineHeight: 1.65, maxWidth: "66ch" }}>
              These are not asked here and are never counted against a project. They are listed so nothing on the pathway is a surprise later.
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {groups.map((group) => (
                <li key={group.phase} style={{ marginBottom: 10 }}>
                  <ShownGroup pack={part.pack} label={group.label} seats={group.seats} rows={group.rows} />
                </li>
              ))}
            </ul>
          </LaterSection>
        </>
      )}
    </section>
  );
}

function LaterSection({ pack, children }: { pack: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = `wb-later-${pack}`;
  return (
    <div style={{ marginTop: 22 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: 0, marginBottom: open ? 8 : 0, background: "transparent", border: 0, cursor: "pointer", textAlign: "left", font: "inherit" }}
      >
        <Chevron open={open} />
        <span className="eyebrow">Done later, with the colleague who helps there</span>
      </button>
      {open ? <div id={panelId}>{children}</div> : null}
    </div>
  );
}

function Row({ pack, row, status }: { pack: string; row: ToolRow; status: RowStatus }) {
  const [open, setOpen] = useState(false);
  const panelId = `wb-row-${pack}-${row.id}`;
  const found: RowCard | undefined = cardFor(pack, row.card);
  const routes = (status.routes ?? []).map((id) => routeFor(pack, id)).filter((r) => r !== undefined);
  return (
    <div style={{ ...card, padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit" }}
      >
        <span className="t-mono" aria-hidden style={{ fontSize: 11, color: "var(--fg-3)", flex: "none", minWidth: 18 }}>
          {row.id}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: "var(--fg-1)" }}>{row.title}</span>
        <StateBadge state={status.state} pathway={isPathwayRow(row)} />
        <Chevron open={open} />
      </button>
      {open ? (
        <div id={panelId} style={{ padding: "2px 16px 16px 48px" }}>
          {found ? (
            <p className="t-body" style={{ margin: "0 0 12px", color: "var(--fg-2)", fontSize: 14 }}>
              {found.plain}
            </p>
          ) : null}
          {status.because ? (
            <Note
              label={status.state === "met" ? "What settled this" : status.state === "unknown" ? "What would find this out" : status.state === "blocked" ? "Why this one stops here" : "What would change this"}
              colour={stateColour(status.state)}
              text={status.because}
            />
          ) : null}
          {routes.map((route) => (
            <div key={route.id} style={{ margin: "0 0 12px", padding: "10px 12px", borderLeft: `2px solid ${stateColour("fixable")}`, background: "var(--paper)", borderRadius: "var(--radius-sm)" }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                A way forward — {route.title}
              </div>
              <p className="t-caption" style={{ margin: "0 0 8px", lineHeight: 1.6 }}>
                {route.route}
              </p>
              <p className="t-caption" style={{ margin: "0 0 8px", lineHeight: 1.6, color: "var(--fg-3)" }}>
                {route.notPromise}
              </p>
              <CitationTags citation={route.citation} />
            </div>
          ))}
          {found && found.evidence.length > 0 ? (
            <>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                What you would be asked to show
              </div>
              <ul className="t-caption" style={bullets}>
                {found.evidence.map((item, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {found ? <CitationTags citation={found.citation} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function ShownGroup({ pack, label, seats, rows }: { pack: string; label: string; seats: { names: string[]; seat: string }[]; rows: ToolRow[] }) {
  const who = seats.map((seat) => seat.names.join(" and ")).join(" and ");
  return (
    <div style={{ ...card, padding: "12px 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg-1)" }}>{label}</span>
        <span className="t-caption" style={{ fontSize: 12 }}>
          {who}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="t-caption" style={{ margin: "6px 0 0", lineHeight: 1.6 }}>
          Nothing on this pathway is a row here yet.
        </p>
      ) : (
        <ul className="t-caption" style={{ ...bullets, margin: "8px 0 0" }}>
          {rows.map((row) => {
            const found = cardFor(pack, row.card);
            return (
              <li key={row.id} style={{ marginBottom: 4 }}>
                {row.title}
                {found ? ` — ${found.citation.section}` : ""}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ConsiderationRow({ consideration }: { consideration: Consideration }) {
  const [open, setOpen] = useState(false);
  const panelId = `wb-consideration-${consideration.number}`;
  return (
    <div style={{ ...card, padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "11px 16px", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit" }}
      >
        <span className="t-mono" aria-hidden style={{ fontSize: 11, color: "var(--fg-3)", flex: "none", width: 14 }}>
          {consideration.number}
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "var(--fg-2)" }}>{consideration.title}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <div id={panelId} style={{ padding: "2px 16px 16px 44px" }}>
          <p className="t-body" style={{ margin: "0 0 12px", color: "var(--fg-2)", fontSize: 14 }}>
            {consideration.summary}
          </p>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Why it matters
          </div>
          <p className="t-caption" style={{ margin: "0 0 14px", lineHeight: 1.65 }}>
            {consideration.why}
          </p>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            How to weigh it — guidance, not a gate
          </div>
          <ul className="t-caption" style={bullets}>
            {consideration.weigh.map((item, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {item}
              </li>
            ))}
          </ul>
          <CitationTags citation={consideration.citation} />
        </div>
      ) : null}
    </div>
  );
}

/** The citation as tags: a value with a hairline border and no fill. The link is the publisher's own page. */
function CitationTags({ citation }: { citation: Citation }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <span style={tag} title={citation.full}>
        {citation.document}
      </span>
      <span style={tag} title={citation.full}>
        {citation.section}
      </span>
      <span style={tag} title={`${citation.version} · ${citation.page}`}>
        {citation.page}
      </span>
      <a href={citation.href} target="_blank" rel="noopener noreferrer" className="t-caption" style={{ fontSize: 11.5, color: "var(--tide)" }}>
        Source document
      </a>
    </div>
  );
}

function Note({ label, colour, text }: { label: string; colour: string; text: string }) {
  return (
    <div style={{ margin: "0 0 12px", padding: "10px 12px", borderLeft: `2px solid ${colour}`, background: "var(--paper)", borderRadius: "var(--radius-sm)" }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>
        {label}
      </div>
      <p className="t-caption" style={{ margin: 0, lineHeight: 1.6 }}>
        {text}
      </p>
    </div>
  );
}

function StateBadge({ state, pathway }: { state: string; pathway: boolean }) {
  const label = pathway ? (PATHWAY_STATE_LABEL[state] ?? STATE_LABEL[state] ?? state) : (STATE_LABEL[state] ?? state);
  const dot: RowStateId = state === "applies" ? "met" : state === "does-not-apply" ? "blocked" : (state as RowStateId);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flex: "none", fontSize: 12, color: "var(--fg-2)" }}>
      <span aria-hidden style={{ width: 7, height: 7, borderRadius: "var(--radius-pill)", background: stateColour(dot), flex: "none" }} />
      {label}
    </span>
  );
}

/** Shown when a pathway reads likely. "Likely" is the read's own word: nothing here certifies anything. */
function ReadyBanner({ onOpenMap }: { onOpenMap?: () => void }) {
  return (
    <div style={{ ...card, padding: "12px 16px", marginBottom: 24, borderLeft: `3px solid ${stateColour("met")}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg-1)", marginBottom: 3 }}>This pathway reads likely — next stop: Partners</div>
        <p className="t-caption" style={{ margin: 0 }}>
          Every row asked here is met. This is a first screening, not an official decision. The basin map is where you find who else is working nearby.
        </p>
      </div>
      {onOpenMap ? (
        <button type="button" className="btn-primary" onClick={onOpenMap}>
          Open the map
        </button>
      ) : null}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{ flex: "none", color: "var(--fg-3)", transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform var(--duration-base) var(--ease-out)" }}
    >
      <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
