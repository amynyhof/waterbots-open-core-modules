// Builds Calvin's agent and screen entries together, `@waterbots/calvin/agent` and `/screen`, into `dist/`.
// Built together, they share one copy of the engine and its data (`dist/chunks/`), so a site that uses his screen and
// his record reader loads the engine's data once (2026-11-26). Built one at a time, each file held a copy of its own.
// The engine entry stays one file of its own that imports nothing (`build:engine`), for a tool that wants the math alone.
// React and `@waterbots/core` stay outside the bundle, so a site has one copy of each. The agent needs no React. The
// banner keeps the screen a client component for sites that render on a server first.
export default {
  input: { agent: "src/agent.ts", screen: "src/screen.ts" },
  platform: "neutral",
  external: [/^react($|\/)/, /^react-dom($|\/)/, /^@waterbots\/core($|\/)/],
  transform: { jsx: "react-jsx" },
  output: {
    dir: "dist",
    format: "esm",
    sourcemap: true,
    entryFileNames: "[name].js",
    chunkFileNames: "chunks/[name]-[hash].js",
    banner: (chunk) => (chunk.isEntry && chunk.name === "screen" ? '"use client";' : ""),
  },
  // Each screen file's own "use client" line is dropped in the bundle; the banner above stands for all of them.
  onLog(level, log, handler) {
    if (log.code !== "MODULE_LEVEL_DIRECTIVE") handler(level, log);
  },
};
