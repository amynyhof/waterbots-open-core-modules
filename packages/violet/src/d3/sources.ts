// Where every D-3 value and step comes from. Cited by section and page, never copied.
//
// The guidebook is open under CC BY 4.0. We still copy no text from it: each line below is a place to look,
// and the words around our values are our own.

/** A place in a source document: document, section, page. */
export interface Citation {
  /** Short name of the document, e.g. "VWBA 2.0". */
  doc: string;
  /** The section, table or step inside it. */
  section: string;
  /** The page number printed on the page. */
  page: number;
}

/** The VWBA 2.0 guidebook, the rulebook for D-3. */
export const VWBA_2_0 = {
  doc: "VWBA 2.0",
  title: "Volumetric Water Benefit Accounting 2.0",
  publisher: "World Resources Institute",
  year: 2025,
  licence: "CC BY 4.0",
  link: "https://doi.org/10.46830/wrigb.23.00112",
} as const;

function vwba(section: string, page: number): Citation {
  return { doc: VWBA_2_0.doc, section, page };
}

/** Every place the D-3 engine relies on. */
export const D3_CITES = {
  /** WASH activities that give household or community water supply use the Volume Provided method. */
  methodChoice: vwba("Appendix C, Table C-1", 39),
  /** What the Volume Provided method is for, and the activities it covers. */
  method: vwba("Appendix D, D-3 Volume Provided method", 44),
  /** The benefit is the water provided with the project, less the water provided without it. */
  formula: vwba("Appendix D, D-3, methodology description", 45),
  /** The three ways to work out the volume, in order of preference: meters, capacity, beneficiaries. */
  options: vwba("Appendix D, D-3, access to household or community water supply", 45),
  /** The water must be free from contamination and meet local quality standards; access must be reasonable. */
  conditions: vwba("Appendix D, D-3, access to household or community water supply", 45),
  /** Option 2: design or anticipated flow times the operating time. */
  capacity: vwba("Appendix D, D-3, Option 2", 46),
  /** Option 3: people with access, times litres per person per day, times days of access. */
  beneficiaries: vwba("Appendix D, D-3, Option 3", 46),
  /** Full access is counted over the whole year. */
  daysFullAccess: vwba("Appendix D, D-3, Option 3", 46),
  /** Default litres per person per day: one figure for full access, one for limited access. */
  perCapitaDefault: vwba("Appendix D, Table D3.3", 46),
  /** A higher local figure may replace the default when local data or a national guideline gives it. */
  perCapitaLocal: vwba("Appendix D, D-3, Option 3", 46),
  /** Monitoring data may replace the default, above or below it. */
  perCapitaMonitored: vwba("Appendix D, D-3, Option 3", 46),
  /** With beneficiaries, use the smaller of the beneficiary volume and the supply capacity, when capacity is known. */
  capacityCap: vwba("Appendix D, D-3, Option 3, and Table D3.3", 46),
  /** Each unit of water is counted once. */
  countOnce: vwba("Step 3, foundational principles", 21),
} as const satisfies Record<string, Citation>;

/** "VWBA 2.0, Appendix D, Table D3.3, p.46". */
export function formatCitation(c: Citation): string {
  return `${c.doc}, ${c.section}, p.${c.page}`;
}
