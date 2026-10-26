import type { StandardId } from "./standards";

/** The technology a project records. A module maps it to its own method (Calvin: CWS → 1, HWT → 2). */
export type Technology = "CWS" | "HWT" | "other";

/**
 * MODULE PROJECT — the only project facts a module reads (the cut, seam S3; plan §8.2).
 *
 * THE MODULE NEVER FETCHES THEM AND NEVER EDITS THEM. A host reads its own record and hands this
 * over; the paid site does it with an adapter over its project record, the free site from its
 * screening answers. Project facts are edited where the host keeps them, never at point of use.
 *
 * `analysis` is the module's own saved working state, passed back exactly as the module last
 * handed it to `onSave`. Its shape belongs to the module (`Analysis`), never to the host.
 */
export interface ModuleProject<Analysis = unknown> {
  name: string;
  /** Read from the host's record. Empty means an honest empty state, never a default standard. */
  standards: readonly StandardId[];
  technology?: Technology;
  /** ISO 3166-1 alpha-3. Missing means a cited, labelled global default where the module has one. */
  country?: string;
  region?: string;
  population?: {
    mode?: "people" | "households";
    /** The count on the record, in whichever `mode` it was entered. */
    served?: number;
    /** People per household, when the project has its own figure. */
    householdSize?: number;
  };
  /** A per-person daily water volume the record holds (a design or measured value), if any. */
  lpcd?: number;
  analysis?: Analysis;
}
