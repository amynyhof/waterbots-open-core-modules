// Builds the screen entry, `@waterbots/calvin/screen`, into one file: `dist/screen.js`.
// React and `@waterbots/core` stay outside the bundle, so a site has one copy of each.
// The banner keeps the screens client components for sites that render on a server first.
export default {
  input: "src/screen.ts",
  platform: "neutral",
  external: [/^react($|\/)/, /^react-dom($|\/)/, /^@waterbots\/core($|\/)/],
  transform: { jsx: "react-jsx" },
  output: { file: "dist/screen.js", format: "esm", sourcemap: true, banner: '"use client";' },
  // Each screen file's own "use client" line is dropped in the bundle; the banner above stands for all of them.
  onLog(level, log, handler) {
    if (log.code !== "MODULE_LEVEL_DIRECTIVE") handler(level, log);
  },
};
