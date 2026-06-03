# Repository Guidelines

## Project Architecture

This repository is a Node.js ESM npm-workspaces benchmark harness for CRDT
libraries. The root package owns shared benchmark code and tooling, while each
CRDT implementation lives in its own workspace under `benchmarks/<library>`.

Current benchmark workspaces are:

- `benchmarks/yjs`
- `benchmarks/ywasm`
- `benchmarks/loro`
- `benchmarks/automerge`
- `benchmarks/automerge-wasm`
- `benchmarks/diamond-types`

The main architectural split is:

- `js-lib/`: shared benchmark framework, benchmark definitions, utilities, and
  Rollup config helper.
- `benchmarks/<library>/factory.js`: adapter from a specific CRDT library to
  the common benchmark interface.
- `benchmarks/<library>/run.js`: runner that creates the adapter factory,
  applies any benchmark filter, and writes results.
- `benchmarks/<library>/bundle.js`: minimal public imports used for bundle-size
  measurement.
- `bin/`: reporting and bundle measurement scripts.

## Core Flow

The root `npm start` runs `npm run start -ws`, which executes every workspace's
`start` script. A typical workspace:

1. Builds or reuses `dist/bundle.js`.
2. Measures bundle size with `bin/measure-bundle.js`.
3. Runs benchmarks with `node --expose-gc run.js`.
4. Renders a markdown table with `bin/render-table.js`.

Benchmark results are written to `benchmarks/results.json`. That file is
generated locally and may not exist in a fresh checkout.

## Benchmark Framework

`js-lib/index.js` exports `runBenchmarks`, which runs the benchmark suites in
order:

- `B1`: single-writer sequential text and array operations.
- `B2`: two clients producing concurrent text edits.
- `B3`: many clients producing concurrent map, array, and text conflicts.
- `B4`: real-world editing trace replay from `b4-editing-trace.js`.

The shared benchmark code must not import individual CRDT libraries. It should
only use the abstract adapter API from `js-lib/utils.js`.

## Adapter Contract

New CRDT implementations should implement the common shape defined by
`CrdtFactory` and `AbstractCrdt` in `js-lib/utils.js`:

- `create(updateHandler)`
- `load(updateHandler, encodedState)`
- `getName()`
- `getEncodedState()`
- `applyUpdate(update)`
- `insertArray(index, elements)`
- `deleteArray(index, length)`
- `getArray()`
- `insertText(index, text)`
- `deleteText(index, length)`
- `getText()`
- `transact(fn, isUpdate?)`
- `setMap(key, value)`
- `getMap()`

Adapters should emit update messages through `updateHandler` in a way that
matches normal library usage. Some libraries require explicit transaction or
update batching logic to fit this contract.

## Important Implementation Notes

- `N` is defined globally in `js-lib/utils.js`; changing benchmark scale
  currently means editing that constant.
- Random benchmark input uses a fixed seed via `lib0/prng`, so preserve this
  determinism when modifying benchmark generation.
- Memory measurement depends on `global.gc`; run Node benchmarks with
  `--expose-gc`.
- `diamond-types` is a partial adapter. Its runner filters to supported text and
  B4 benchmarks because map and array methods are unimplemented.
- Loro uses snapshot encoding by default in its adapter, which affects encoded
  size and parse time comparisons.
- Automerge has adapter-specific handling for map strings to avoid representing
  benchmark strings as sequence CRDTs.
- Do not treat all benchmark results as perfectly apples-to-apples without
  checking adapter-specific encoding and transaction behavior.

## Common Commands

- Install dependencies: `npm i`
- Run all benchmarks: `npm start`
- Run all benchmarks with Bun: `npm run start:bun`
- Run one workspace: `cd benchmarks/yjs && npm start`
- Run one workspace in browser: `cd benchmarks/yjs && npm run start:browser`
- Render root table: `npm run table`
- Lint and type-check JavaScript: `npm run lint`

## Coding Conventions

- The project uses ESM JavaScript with JSDoc type annotations and TypeScript
  `checkJs`.
- Keep shared benchmark logic in `js-lib/`.
- Keep CRDT-specific behavior inside the relevant `benchmarks/<library>/`
  adapter.
- Prefer extending the existing factory/adapter pattern over adding benchmark
  code that imports a CRDT library directly.
- Avoid unrelated formatting churn, especially in generated `dist/` outputs and
  benchmark result files.
