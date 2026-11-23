// Builds the agent entry, `@waterbots/calvin/agent`, into one file: `dist/agent.js`.
// `@waterbots/core` stays outside the bundle, so a site has one copy. Nothing here needs React.
export default {
  input: "src/agent.ts",
  platform: "neutral",
  external: [/^@waterbots\/core($|\/)/],
  output: { file: "dist/agent.js", format: "esm", sourcemap: true },
};
