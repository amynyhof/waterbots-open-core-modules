// D-3's method defaults and bounds. Each one says where it came from.
// A default and a cap are kept as two separate things, even where they hold the same number.

import { D3_CITES, formatCitation } from "./sources.js";
import type { AccessLevel } from "./types.js";

/** Default litres per person per day, by access level (VWBA 2.0, Appendix D, Table D3.3, p.46). */
export const PER_CAPITA_DEFAULT_L: Readonly<Record<AccessLevel, number>> = { full: 20, limited: 2 };
export const PER_CAPITA_DEFAULT_SOURCE = formatCitation(D3_CITES.perCapitaDefault);

/** Default days of access for full access: the whole year (VWBA 2.0, Appendix D, D-3, Option 3, p.46). */
export const DAYS_DEFAULT_FULL_ACCESS = 365;
export const DAYS_DEFAULT_SOURCE = formatCitation(D3_CITES.daysFullAccess);
// Limited access has no default. The guidebook says it is usually fewer than 365 days, and gives no figure.

/** The most days of access a year can hold. The cap, kept apart from the default above. */
export const DAYS_CAP = 365;
export const DAYS_CAP_SOURCE = `a year has 365 days (${formatCitation(D3_CITES.daysFullAccess)})`;

/** The most hours a system can run in a year: 365 days × 24 hours. */
export const HOURS_CAP = 8760;
export const HOURS_CAP_SOURCE = "a year has 365 days × 24 hours";

/** Sliders start at zero: no days, no hours. A starting point, not a cited value. */
export const SLIDER_FLOOR = 0;
export const SLIDER_FLOOR_SOURCE = "starting point";

/** The engine's version. It changes when a sum or a default changes. */
export const D3_ENGINE_VERSION = "0.1.0";
