# Core's rulings

These are the rules for `core`, the part every module shares, and nothing else. The rules for the whole site are in
`RULINGS.md` at the root of this repo. Where the two disagree, the root page wins. Only the maintainer changes
these rules.

- `core` holds only the shape and rules of the shared project record. It never holds a project's data. The data
  stays on the site.
- A read-only seat cannot change inputs, not even on screen. Its Save button is replaced by the reason.
- `core` ships a base stylesheet for a site with no design system of its own.
- The colours that show a save's state follow the brand guide.
- Every value shown says where it came from, with one of four labels, the same on every surface. These are screen
  labels, not agent rules. Entered: the user typed it. Default: filled in from a published source, which the
  user's own value replaces. Calculated: worked out from other values, with the source of its formula. Assumed:
  expected performance, which the user is encouraged to set to their planned project.
