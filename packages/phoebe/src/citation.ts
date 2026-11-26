/**
 * What a citation is, in one place: the four-part shape every cited claim carries. Carried from the open site
 * (`src/lib/citation.ts`, commit 0f16957) with its shape unchanged.
 */
export interface Citation {
  /** "VWBA 2.0": the short document name. */
  document: string;
  /** "Version 1, September 2025". */
  version: string;
  /** "Appendix A · criterion 1": where in the document. */
  section: string;
  /** "p. 32": the printed page. */
  page: string;
  /** The source line as written on the card. */
  full: string;
  /** The publisher's canonical address. */
  href: string;
}
