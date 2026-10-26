/**
 * THE STANDARDS A PROJECT CAN QUALIFY UNDER — one list, shared by every module and every host
 * (the cut, seam S4). The paid journey (`lib/journey/model.ts`) imports it from here rather than
 * keeping its own, so a standard added once is a standard everywhere.
 *
 * A project's standards are READ FROM ITS RECORD and never inferred (NEVER ASSUME CARBON): a
 * module handed an empty list shows an honest empty state naming what is missing.
 */
export type StandardId = "carbon" | "vwba" | "wqba" | "wash-ba";
