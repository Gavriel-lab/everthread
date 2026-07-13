# Everthread v0.3 Brain Runtime Kit Design

## Purpose

Everthread v0.3 publishes the reusable Brain architecture and memory-storage flow that has been proven in a private runtime, without publishing the private Studio framework, personal memories, deployment details, identities, secrets, or machine-specific paths.

The existing Python v0.2 Starter Kit remains supported. v0.3 adds a separate Node.js 20+ Runtime Kit that can be understood, tested, and run with no third-party runtime dependencies.

## Product boundary

The public Runtime Kit includes:

- brain-area routing and memory classification;
- append-only capture and candidate queues;
- validation, quarantine, and idempotent processing;
- policy-based review decisions;
- accepted-memory storage, Life Rings, and REM-style consolidation;
- an ordered read path for model context;
- an optional shadow-vector adapter with atomic replacement;
- one-shot orchestration and neutral JSON status output;
- fictional examples, JSON schemas, tests, and bilingual documentation.

It does not include:

- Studio pages, components, CSS, product shell, or private port adapters;
- a daemon, Heartbeat, cron installer, public HTTP API, or permanent background writer;
- private memories, relationship history, real identities, server addresses, credentials, provider keys, or absolute personal paths;
- automatic promotion of guarded or high-privacy content;
- writes into a legacy memory palace.

## Runtime contract

The runtime is local-first and workspace-scoped. Every command operates on a user-selected directory. Durable records are JSON or JSONL so they remain inspectable and portable.

The one-shot flow is:

```text
Capture
  -> Validate / quarantine
  -> Thalamus routing
  -> Candidate queue
  -> Review decision
       -> accepted runtime memory
       -> deferred candidate
       -> human-review presence queue
       -> rejected noise
  -> Life Rings and REM consolidation
  -> Ordered read path
  -> Optional shadow-vector index
  -> Neutral runtime status
  -> Stop
```

With no new capture events, a run still rebuilds derived read-path/status outputs but creates no duplicate candidates or review decisions.

## Storage layout

```text
workspace/
  runtime.json
  capture/
    inbox.jsonl
    quarantine.jsonl
    processed.json
  candidates/
    candidate_memory.jsonl
  review/
    decisions.jsonl
    accepted.jsonl
    deferred.jsonl
    needs_human_review.jsonl
    rejected.jsonl
    processed.json
  consolidation/
    life_rings.json
    rem_dreams.jsonl
  read/
    context.json
    state.json
  vector/
    shadow_index.json
  loop/
    state.json
```

Source queues are append-only. Derived JSON snapshots are written through a temporary sibling file and atomically replaced. JSONL outputs are materialized even when empty so downstream consumers receive a stable filesystem contract.

## Memory and routing model

Capture events use stable IDs and contain source, timestamp, content, privacy, confidence, salience, and optional tags. Validation rejects malformed events before they enter candidate storage.

The Thalamus assigns one primary brain area from the public ten-area vocabulary and records routing reasons. The initial deterministic router emphasizes:

- identity and boundaries -> Brainstem;
- events and relationship anchors -> Hippocampus;
- stable preferences and concepts -> Neocortex;
- plans, decisions, and project state -> Prefrontal;
- emotionally salient experiences -> Amygdala;
- habits and procedures -> Cerebellum;
- active short-lived context -> Working Memory;
- cross-memory links -> Synapses;
- consolidation requests -> Dreaming;
- routing and indexing metadata -> Thalamus.

Unknown content defaults to Hippocampus rather than being silently discarded.

## Review policy and privacy

Review is deterministic and explainable. The public policy produces four durable outcomes:

- `accepted`: low-privacy, high-confidence durable preferences, rules, decisions, or project results;
- `deferred`: plausible memories that are not yet durable enough;
- `needs_human_review`: guarded, relationship-sensitive, high-privacy, or otherwise ambiguous content;
- `rejected`: empty, duplicate, system-noise, or explicitly ephemeral content.

Human-review entries are presence-only. Their content must never be included in active read context before an explicit external review action.

## Consolidation and read path

Accepted memories are grouped into configurable Life Rings representing temporal or thematic distance. REM consolidation creates compact, fictional-safe summaries from accepted items only; it never reads quarantined or human-review content.

The read path has a fixed priority:

1. accepted runtime rules and preferences;
2. accepted project mainline and durable events;
3. REM summaries;
4. deferred-candidate metadata only;
5. human-review count/presence only;
6. optional legacy read-only fallback metadata.

The context builder enforces a configurable item budget and emits both the selected context and a state file explaining counts, order, and guardrails.

## Optional vector boundary

Vector indexing is an optional adapter, not a requirement for the core runtime. The adapter receives accepted/read-path items and an embedding function supplied by the host application. It validates item count, vector count, dimensions, and numeric values before atomically replacing `shadow_index.json`.

If the provider fails or returns malformed vectors, the run records a non-fatal vector error and keeps the previous valid index untouched.

## CLI and public ergonomics

The Node entrypoint exposes four explicit commands:

- `init <workspace>` creates the stable runtime layout and default config;
- `capture <workspace> <event.json>` validates and appends one event;
- `run <workspace>` performs one complete pass and stops;
- `status <workspace>` prints neutral JSON state.

All successful commands print machine-readable JSON. Errors use a non-zero exit code and a concise message without leaking file contents or secrets.

## Verification strategy

The Runtime Kit uses Node's built-in `node:test` runner and temporary workspaces. Tests cover initialization, validation/quarantine, deterministic routing, idempotent processing, each review outcome, human-review isolation, consolidation, fixed read order, no-op reruns, atomic writes, and preservation of a previous vector index after provider failure.

The existing Python tests must continue to pass. Documentation examples are fictional and are scanned for forbidden private paths and obvious credential patterns before release.

## Release shape

The release is versioned as v0.3.0. README files explain the relationship between the Python Starter Kit and Node Runtime Kit, show the Brain flow before installation commands, and explicitly state the no-Studio/no-private-data boundary.
