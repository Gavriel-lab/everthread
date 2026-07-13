# Everthread v0.3 Brain Runtime Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a zero-dependency Node.js Brain Runtime Kit that implements safe, inspectable, one-shot memory capture, routing, review, consolidation, read-path, and optional vector-index flow while preserving the Python v0.2 Starter Kit.

**Architecture:** A small ESM runtime under `runtime/` operates on a local JSON/JSONL workspace. Each stage has a focused module and is composed by a one-shot loop; source queues remain append-only, snapshots are atomically replaced, and guarded content never enters active context. The Node CLI is additive and the existing Python CLI remains unchanged except for the package version and documentation.

**Tech Stack:** Node.js 20+ ESM, built-in `node:test`, built-in filesystem/crypto APIs, Python 3.10+ and pytest for regression coverage, JSON Schema documentation.

## Global Constraints

- Keep the existing Python v0.2 Starter Kit behavior working.
- Require Node.js 20 or newer and use zero third-party runtime dependencies.
- Publish Brain architecture and memory flow only; include no Studio UI, CSS, product shell, private port adapter, daemon, Heartbeat, cron installer, or public HTTP API.
- Include no private memories, identities, server addresses, credentials, provider keys, or absolute personal paths.
- Keep the runtime queue-only, one-shot, workspace-scoped, idempotent, and local-first.
- Route guarded and high-privacy content to human review and never expose its content in active read context.
- Preserve the previous vector index when embedding fails or validation rejects a provider response.
- Use fictional examples and neutral JSON status output.

---

### Task 1: Runtime foundation and workspace initialization

**Files:**
- Create: `package.json`
- Create: `runtime/core/io.mjs`
- Create: `runtime/core/workspace.mjs`
- Create: `runtime/cli.mjs`
- Create: `tests/runtime/workspace.test.mjs`

**Interfaces:**
- Produces: `atomicWriteJson(path, value)`, `readJson(path, fallback)`, `readJsonl(path)`, `appendJsonl(path, value)`, `ensureRuntimeWorkspace(root)`, `runtimePaths(root)`, and `main(argv)`.
- Consumes: Node built-in `fs`, `path`, and `url` modules only.

- [ ] **Step 1: Write the failing workspace test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ensureRuntimeWorkspace, runtimePaths } from '../../runtime/core/workspace.mjs';

test('initializes the stable runtime workspace and empty JSONL files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'everthread-'));
  await ensureRuntimeWorkspace(root);
  const paths = runtimePaths(root);
  assert.equal(JSON.parse(await readFile(paths.config, 'utf8')).version, '0.3.0');
  assert.equal(await readFile(paths.captureInbox, 'utf8'), '');
  assert.equal(await readFile(paths.accepted, 'utf8'), '');
});
```

- [ ] **Step 2: Run the test and verify it fails because the workspace module is absent**

Run: `node --test tests/runtime/workspace.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `runtime/core/workspace.mjs`.

- [ ] **Step 3: Implement atomic I/O, path mapping, initialization, and the `init` CLI command**

`runtime/core/io.mjs` must export async JSON/JSONL helpers. `atomicWriteJson` writes a sibling temporary file, renames it into place, and cleans the temporary file on failure. `appendJsonl` writes exactly one JSON object plus newline. `readJsonl` ignores blank lines but throws on malformed JSON.

`runtime/core/workspace.mjs` must map every path in the design spec and initialize `runtime.json` with:

```js
{
  version: '0.3.0',
  read_budget: 24,
  legacy_read_only_fallback: null,
  life_rings: ['core', 'recent', 'archive']
}
```

The CLI parses `init <workspace>`, calls `ensureRuntimeWorkspace`, and prints `{ "command": "init", "workspace": "...", "version": "0.3.0" }`.

- [ ] **Step 4: Run the focused and existing Python tests**

Run: `node --test tests/runtime/workspace.test.mjs && python -m pytest -q`

Expected: Node test PASS and Python output `2 passed`.

- [ ] **Step 5: Commit the foundation**

```bash
git add package.json runtime/core/io.mjs runtime/core/workspace.mjs runtime/cli.mjs tests/runtime/workspace.test.mjs
git commit -m "feat: add runtime workspace foundation"
```

### Task 2: Capture validation and quarantine

**Files:**
- Create: `runtime/capture/schema.mjs`
- Create: `runtime/capture/gateway.mjs`
- Create: `tests/runtime/capture.test.mjs`
- Create: `schemas/runtime-capture-event.schema.json`

**Interfaces:**
- Consumes: `appendJsonl` and runtime paths from Task 1.
- Produces: `validateCaptureEvent(value) -> { ok, errors, event }` and `captureEvent(root, value) -> { accepted, id, errors }`.

- [ ] **Step 1: Write failing tests for accepted and quarantined events**

```js
test('normalizes and appends a valid capture event', async () => {
  const result = await captureEvent(root, {
    id: 'evt-1', source: 'fictional-chat', timestamp: '2026-07-13T00:00:00Z',
    content: 'The user prefers concise release notes.', privacy: 'low', confidence: 0.94,
    salience: 0.7, tags: ['preference']
  });
  assert.deepEqual(result, { accepted: true, id: 'evt-1', errors: [] });
});

test('quarantines malformed capture without adding it to inbox', async () => {
  const result = await captureEvent(root, { id: 'bad', content: '' });
  assert.equal(result.accepted, false);
  assert.match(result.errors.join(' '), /source|timestamp|content/);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/runtime/capture.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for the capture gateway.

- [ ] **Step 3: Implement validation, normalization, append, and quarantine**

Require non-empty `id`, `source`, `timestamp`, and `content`; accept privacy values `low`, `medium`, `high`, or `guarded`; constrain confidence and salience to numbers from 0 through 1; normalize missing tags to `[]`. Invalid input appends a record containing `quarantined_at`, `errors`, and the supplied `id` when present, but never copies malformed content into active queues.

The JSON Schema mirrors the public event contract and sets `additionalProperties` to false.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/runtime/capture.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 5: Commit capture**

```bash
git add runtime/capture schemas/runtime-capture-event.schema.json tests/runtime/capture.test.mjs
git commit -m "feat: add validated capture gateway"
```

### Task 3: Thalamus routing and idempotent candidate processing

**Files:**
- Create: `runtime/routing/thalamus.mjs`
- Create: `runtime/processor/process-capture.mjs`
- Create: `tests/runtime/processor.test.mjs`
- Create: `schemas/runtime-memory-candidate.schema.json`

**Interfaces:**
- Consumes: capture inbox, capture processed-state snapshot, candidate JSONL, and atomic I/O.
- Produces: `routeBrainArea(event) -> { brain_area, reasons }` and `processCapture(root) -> { scanned, created, skipped }`.

- [ ] **Step 1: Write failing routing and idempotency tests**

```js
test('routes a durable preference to Neocortex', () => {
  assert.deepEqual(routeBrainArea({ tags: ['preference'], content: 'prefers concise notes' }), {
    brain_area: 'neocortex', reasons: ['tag:preference']
  });
});

test('creates one candidate and skips it on the second pass', async () => {
  await captureEvent(root, fixtureEvent);
  assert.equal((await processCapture(root)).created, 1);
  assert.deepEqual(await processCapture(root), { scanned: 1, created: 0, skipped: 1 });
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/runtime/processor.test.mjs`

Expected: FAIL because the routing and processor modules do not exist.

- [ ] **Step 3: Implement deterministic routing and candidate creation**

Use tag priority `identity/boundary`, `plan/decision/project`, `preference/concept`, `emotion`, `habit/procedure`, `active`, `link`, `dream`, and `routing`; default to `hippocampus`. Candidate IDs are `mem-` plus the first 20 hex characters of a SHA-256 hash of the event ID. Candidate records preserve normalized capture fields, route, reasons, and `candidate_created_at`. The processed snapshot stores event IDs and is atomically replaced only after candidate append succeeds.

- [ ] **Step 4: Run processor and capture tests**

Run: `node --test tests/runtime/capture.test.mjs tests/runtime/processor.test.mjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit routing and processor**

```bash
git add runtime/routing runtime/processor schemas/runtime-memory-candidate.schema.json tests/runtime/processor.test.mjs
git commit -m "feat: route captures into memory candidates"
```

### Task 4: Explainable auto-review and privacy gate

**Files:**
- Create: `runtime/review/policy.mjs`
- Create: `runtime/review/engine.mjs`
- Create: `tests/runtime/review.test.mjs`
- Create: `schemas/runtime-review-decision.schema.json`

**Interfaces:**
- Consumes: candidate queue and review processed state.
- Produces: `decideCandidate(candidate) -> { outcome, reasons }` and `reviewCandidates(root) -> { scanned, decided, accepted, deferred, needs_human_review, rejected, skipped }`.

- [ ] **Step 1: Write failing tests for all four outcomes and human-review isolation**

```js
test('review policy exposes four deterministic outcomes', () => {
  assert.equal(decideCandidate(candidate({ privacy: 'low', confidence: 0.95, tags: ['preference'] })).outcome, 'accepted');
  assert.equal(decideCandidate(candidate({ privacy: 'low', confidence: 0.55, tags: ['event'] })).outcome, 'deferred');
  assert.equal(decideCandidate(candidate({ privacy: 'guarded', confidence: 0.99 })).outcome, 'needs_human_review');
  assert.equal(decideCandidate(candidate({ privacy: 'low', confidence: 0.99, tags: ['ephemeral'] })).outcome, 'rejected');
});

test('human-review queue stores content but active accepted output does not', async () => {
  const result = await reviewCandidates(root);
  assert.equal(result.needs_human_review, 1);
  assert.equal((await readJsonl(paths.accepted)).some(x => x.id === guarded.id), false);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/runtime/review.test.mjs`

Expected: FAIL because the review modules do not exist.

- [ ] **Step 3: Implement the policy and idempotent output engine**

Policy order is guarded/high privacy -> human review; ephemeral/system-noise/blank -> rejected; low privacy plus confidence at least `0.8` plus a durable tag -> accepted; otherwise deferred. Durable tags are `identity`, `boundary`, `preference`, `rule`, `decision`, `project`, `result`, `habit`, and `event`. Every decision records reasons and timestamp. The engine appends exactly once per candidate ID, materializes all output files, and updates processed state after all writes succeed.

- [ ] **Step 4: Run review tests twice through the same fixture workspace**

Run: `node --test tests/runtime/review.test.mjs`

Expected: all tests PASS, including a second-pass result with `decided: 0`.

- [ ] **Step 5: Commit review engine**

```bash
git add runtime/review schemas/runtime-review-decision.schema.json tests/runtime/review.test.mjs
git commit -m "feat: add guarded runtime memory review"
```

### Task 5: Life Rings, REM consolidation, and ordered read path

**Files:**
- Create: `runtime/consolidation/life-rings.mjs`
- Create: `runtime/consolidation/rem.mjs`
- Create: `runtime/read/build-context.mjs`
- Create: `tests/runtime/read-path.test.mjs`
- Create: `schemas/runtime-read-context.schema.json`

**Interfaces:**
- Consumes: accepted/deferred/human-review queues and runtime config.
- Produces: `buildLifeRings(root)`, `buildRemDreams(root)`, and `buildReadContext(root) -> context`.

- [ ] **Step 1: Write failing tests for consolidation, order, budget, and privacy**

```js
test('builds context in fixed order without human-review content', async () => {
  const context = await buildReadContext(root);
  assert.deepEqual(context.read_order, [
    'accepted_rules_preferences', 'accepted_mainline', 'rem_dreams',
    'deferred_metadata', 'human_review_presence', 'legacy_read_only_fallback'
  ]);
  assert.equal(context.human_review.count, 1);
  assert.equal(JSON.stringify(context).includes('guarded secret fixture'), false);
  assert.ok(context.items.length <= context.budget);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/runtime/read-path.test.mjs`

Expected: FAIL because the consolidation and read modules do not exist.

- [ ] **Step 3: Implement Life Rings and REM output**

Assign accepted memories with salience at least `0.85` or identity/boundary tags to `core`, items newer than 30 days to `recent`, and all others to `archive`. REM groups accepted memories by UTC calendar month and emits compact entries containing IDs, month, themes, source memory IDs, and a deterministic summary assembled from at most three normalized content snippets.

- [ ] **Step 4: Implement the fixed-order budgeted read context**

Place accepted rule/preference records first, remaining accepted mainline records second, REM entries third, and metadata-only counts for deferred/human review after them. Include legacy fallback only as the config value and mark it `read_only: true`. Write both `read/context.json` and `read/state.json` atomically.

- [ ] **Step 5: Run read-path and review tests**

Run: `node --test tests/runtime/review.test.mjs tests/runtime/read-path.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit consolidation and read path**

```bash
git add runtime/consolidation runtime/read schemas/runtime-read-context.schema.json tests/runtime/read-path.test.mjs
git commit -m "feat: build life rings and safe read context"
```

### Task 6: Optional atomic shadow-vector adapter

**Files:**
- Create: `runtime/vector/shadow-index.mjs`
- Create: `tests/runtime/vector.test.mjs`

**Interfaces:**
- Consumes: read-context items and a host-supplied async `embed(texts)` function.
- Produces: `rebuildShadowIndex(root, embed) -> { updated, item_count, dimensions, error }`.

- [ ] **Step 1: Write failing success and failure-preservation tests**

```js
test('atomically writes a valid shadow index', async () => {
  const result = await rebuildShadowIndex(root, async texts => texts.map((_, i) => [i + 0.1, i + 0.2]));
  assert.deepEqual(result, { updated: true, item_count: 2, dimensions: 2, error: null });
});

test('keeps the previous index when the provider fails', async () => {
  const before = await readFile(paths.shadowIndex, 'utf8');
  const result = await rebuildShadowIndex(root, async () => { throw new Error('fixture outage'); });
  assert.equal(result.updated, false);
  assert.equal(await readFile(paths.shadowIndex, 'utf8'), before);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/runtime/vector.test.mjs`

Expected: FAIL because `shadow-index.mjs` does not exist.

- [ ] **Step 3: Implement validation and atomic replacement**

Accept arrays containing one finite-number vector per context item; require equal non-zero dimensions; write the index only after full validation. Catch provider and validation errors and return a sanitized error message without modifying an existing index.

- [ ] **Step 4: Run vector tests**

Run: `node --test tests/runtime/vector.test.mjs`

Expected: both tests PASS.

- [ ] **Step 5: Commit vector adapter**

```bash
git add runtime/vector tests/runtime/vector.test.mjs
git commit -m "feat: add optional atomic vector adapter"
```

### Task 7: One-shot orchestration and CLI integration

**Files:**
- Create: `runtime/loop/run-once.mjs`
- Modify: `runtime/cli.mjs`
- Create: `tests/runtime/loop.test.mjs`
- Create: `examples/runtime/capture-event.example.json`

**Interfaces:**
- Consumes: every stage function from Tasks 1 through 6, except vector embedding which remains host-optional.
- Produces: `runOnce(root) -> loopState`; CLI commands `capture`, `run`, and `status`.

- [ ] **Step 1: Write a failing end-to-end one-shot test**

```js
test('runs capture through read path once and makes the second run a no-op', async () => {
  await captureEvent(root, fixtureEvent);
  const first = await runOnce(root);
  assert.equal(first.success, true);
  assert.equal(first.stages.capture.created, 1);
  assert.equal(first.stages.review.accepted, 1);
  assert.equal(first.read_path_rebuilt, true);
  assert.equal(first.guardrails_passed, true);
  const second = await runOnce(root);
  assert.equal(second.stages.capture.created, 0);
  assert.equal(second.stages.review.decided, 0);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/runtime/loop.test.mjs`

Expected: FAIL because `run-once.mjs` does not exist.

- [ ] **Step 3: Implement one-shot composition and state**

The loop initializes the workspace, processes capture, reviews candidates, rebuilds Life Rings, rebuilds REM, rebuilds read context, writes loop state, prints no content, and returns. State contains a random UUID, start/end timestamps, per-stage counts, `read_path_rebuilt`, `vector` set to `{ enabled: false }`, `guardrails_passed`, and `success`. It never schedules another run.

- [ ] **Step 4: Wire CLI commands**

`capture <workspace> <event.json>` reads one JSON object and calls the gateway; `run <workspace>` calls the loop; `status <workspace>` reads state and emits neutral JSON. Unknown commands and missing arguments exit non-zero.

- [ ] **Step 5: Run all Node and Python tests**

Run: `npm test && python -m pytest -q`

Expected: all Node tests PASS and Python output `2 passed`.

- [ ] **Step 6: Commit orchestration**

```bash
git add runtime/loop runtime/cli.mjs tests/runtime/loop.test.mjs examples/runtime/capture-event.example.json
git commit -m "feat: add one-shot brain runtime loop"
```

### Task 8: Release documentation, versioning, and safety verification

**Files:**
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `README.en.md`
- Modify: `pyproject.toml`
- Create: `docs/brain-runtime-v0.3.zh-CN.md`
- Create: `docs/brain-runtime-v0.3.en.md`
- Create: `docs/runtime-storage-flow.zh-CN.md`
- Create: `tests/runtime/release-safety.test.mjs`

**Interfaces:**
- Consumes: all public commands, storage paths, and schemas established by Tasks 1 through 7.
- Produces: release-facing bilingual documentation and a repository safety scan.

- [ ] **Step 1: Write the failing release-safety test**

```js
test('public runtime files contain no private deployment markers', async () => {
  const files = await publicRuntimeFiles(ROOT);
  const joined = (await Promise.all(files.map(file => readFile(file, 'utf8')))).join('\n');
  for (const forbidden of ['/home/ubuntu/', 'C:\\Users\\', 'BEGIN PRIVATE KEY', 'api_key=', 'Studio/']) {
    assert.equal(joined.includes(forbidden), false, `forbidden marker: ${forbidden}`);
  }
});
```

- [ ] **Step 2: Run and verify RED against missing helper/doc contract**

Run: `node --test tests/runtime/release-safety.test.mjs`

Expected: FAIL because `publicRuntimeFiles` and required v0.3 docs are not defined.

- [ ] **Step 3: Update version and bilingual README files**

Set Python package version to `0.3.0` while clearly labeling the Python CLI as the preserved Starter Kit. Put the Brain flow before installation, document Node 20+, provide `init`, `capture`, `run`, and `status` examples, and state the no-Studio/no-private-data boundary.

- [ ] **Step 4: Write focused bilingual Runtime and storage-flow guides**

Document each brain area, queue, review outcome, read order, idempotency behavior, atomic write rule, vector failure rule, host integration boundary, and a complete fictional quickstart. Do not include production deployment commands.

- [ ] **Step 5: Implement and run the safety scan**

Scan tracked files under `runtime/`, `schemas/`, `examples/runtime/`, the v0.3 docs, and README files. The test itself may contain forbidden patterns only as separately constructed fragments so the scan does not flag its own fixtures.

Run: `node --test tests/runtime/release-safety.test.mjs`

Expected: PASS.

- [ ] **Step 6: Run final verification**

Run: `npm test`

Expected: all Node tests PASS with zero failures.

Run: `python -m pytest -q`

Expected: `2 passed`.

Run: `node runtime/cli.mjs init .tmp-release-smoke && node runtime/cli.mjs capture .tmp-release-smoke examples/runtime/capture-event.example.json && node runtime/cli.mjs run .tmp-release-smoke && node runtime/cli.mjs status .tmp-release-smoke`

Expected: four JSON responses, a successful loop, one accepted fictional memory, and no daemon left running. Remove `.tmp-release-smoke` after inspection.

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intended tracked release changes before commit.

- [ ] **Step 7: Commit release documentation**

```bash
git add README.md README.zh-CN.md README.en.md pyproject.toml docs/brain-runtime-v0.3.zh-CN.md docs/brain-runtime-v0.3.en.md docs/runtime-storage-flow.zh-CN.md tests/runtime/release-safety.test.mjs
git commit -m "docs: release everthread v0.3 runtime kit"
```
