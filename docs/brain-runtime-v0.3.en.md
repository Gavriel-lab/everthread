# Everthread v0.3 Brain Runtime Kit

Everthread v0.3 turns the reusable Brain architecture into a runnable local memory pipeline. It requires Node.js 20 or newer and has no third-party runtime dependencies.

## Included boundary

The public kit includes deterministic brain-area routing, append-only capture and candidate queues, guarded review, accepted-memory storage, Life Rings, REM consolidation, an ordered read path, optional vector indexing, JSON schemas, fictional examples, and a one-shot CLI.

It excludes private product UI, personal memories, real identities, deployment topology, credentials, daemons, scheduled jobs, and public network services.

## Quickstart

```bash
git clone https://github.com/Gavriel-lab/everthread.git
cd everthread
node runtime/cli.mjs init ./my-runtime
node runtime/cli.mjs capture ./my-runtime examples/runtime/capture-event.example.json
node runtime/cli.mjs run ./my-runtime
node runtime/cli.mjs status ./my-runtime
```

Each successful command prints one JSON object. `run` performs one pass and exits.

## Review outcomes

- `accepted`: low-privacy, high-confidence durable rules, preferences, events, projects, or results.
- `deferred`: plausible memory that is not durable enough yet.
- `needs_human_review`: guarded or high-privacy content.
- `rejected`: ephemeral content, system noise, or blank content.

Human-review content never enters active context. The read path exposes only the queue count until an external reviewer explicitly acts.

## Read order

1. accepted rules and preferences;
2. accepted project mainline and durable events;
3. REM summaries;
4. deferred metadata;
5. human-review presence only;
6. optional legacy read-only reference.

The `read_budget` value in `runtime.json` limits active items. Source queues are append-only, derived snapshots are atomically replaced, and reruns do not duplicate candidates or decisions.

## Optional vector adapter

The host may pass an async `embed(texts)` function to `rebuildShadowIndex`. The adapter validates vector count, dimensions, and finite numeric values before replacement. Provider or validation failures leave the previous valid index untouched.

## Host integration

The host decides when to capture a turn, when to supply `read/context.json` to a model, and how to provide human review or an embedding provider. Everthread owns the portable memory contract, not the chat interface.

## Verification

```bash
npm test
python -m pytest -q
```

The Node suite covers the complete Runtime flow. The Python suite protects the preserved Starter Kit.
