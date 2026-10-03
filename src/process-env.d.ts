// `process.env.NODE_ENV` is the dev flag the components use to gate their accessibility authoring
// warnings (a missing `alt`, a missing form label). Every mainstream bundler — webpack, Next, Rollup,
// esbuild and Vite — replaces that exact expression with a string literal at build time, so the
// warnings run in a consumer's dev build and are dropped from their production build. It replaced
// Vite's `import.meta.env.DEV`, which resolves only under Vite and throws everywhere else.
//
// The package deliberately does not depend on @types/node: tsconfig.json pins
// `types: ["vite/client"]`, and its own comment records that choice. So declare the one member the
// source reads and nothing more. If @types/node is ever added, TypeScript reports a redeclaration on
// the line below — the fix then is to delete this file, not to widen it.
declare const process: { env: { NODE_ENV?: string } };
