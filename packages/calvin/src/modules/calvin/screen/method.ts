import type { Technology } from "../../core/project";

/**
 * The record's technology → the SDWS method it selects: CWS → Method 1, HWT → Method 2.
 * `other` (and nothing recorded) selects no method; the caller decides what that means.
 *
 * Calvin owns this mapping (methods 1 and 2 are the carbon methodology's), and the paid project
 * editor imports it from here, so there is one copy.
 */
export function technologyToMethod(t: Technology | undefined): 1 | 2 | undefined {
  if (t === "CWS") return 1;
  if (t === "HWT") return 2;
  return undefined;
}
