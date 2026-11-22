# Core's rulings

These are the rules for `core`, the part every module shares, and nothing else. The rules for the whole site are in
`RULINGS.md` at the root of this repo. Where the two disagree, the root page wins. Only the maintainer changes
these rules.

- `core` holds only the shape and rules of the shared project record. It never holds a project's data. The data
  stays on the site.
- A read-only seat cannot change inputs, not even on screen. Its Save button is replaced by the reason.
- `core` ships a base stylesheet for a site with no design system of its own.
- The colours that show a save's state follow the brand guide.
