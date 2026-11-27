/**
 * THE TAP SIZE (shared console page, family 4, rule 8): everything a visitor taps is at least 44 by 44 pixels on a
 * phone. The same number is the `--wb-tap` token in `base.css` and in the report stylesheet, which the screens' own
 * stylesheets carry. A screen's rows, buttons, chips, boxes and tabs use it.
 */
export const TAP_MIN_PX = 44;

/** The CSS for it, with the number as the fallback when no token is set. */
export const TAP_MIN = `var(--wb-tap, ${TAP_MIN_PX}px)`;
