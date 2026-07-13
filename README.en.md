# Everthread

Everthread is a portable memory architecture for long-term AI companions.

It is designed for people who want their AI companion to remain continuous across apps, models, bots, and frontends. The goal is not to erase raw chat history. The goal is to preserve it in a layered way so the active companion can stay warm without being overloaded.

## v0.3 Brain Runtime Kit

v0.3 adds a runnable, zero-dependency Node.js 20+ implementation of the reusable Brain architecture and memory flow:

```text
Capture -> Validate / Quarantine -> Thalamus routing -> Candidate queue
        -> Four-way review -> Life Rings / REM -> Ordered read path
        -> Optional shadow vector -> Status -> Stop
```

The runtime is queue-only, workspace-scoped, idempotent, and one-shot. Guarded or high-privacy content is held for human review and is never exposed in active context. Snapshot writes are atomic, and a failed vector provider cannot replace the previous valid index.

This repository does not publish a private Studio framework, UI, real memories, deployment addresses, credentials, daemons, Heartbeats, or a public API.

```bash
node runtime/cli.mjs init ./my-runtime
node runtime/cli.mjs capture ./my-runtime examples/runtime/capture-event.example.json
node runtime/cli.mjs run ./my-runtime
node runtime/cli.mjs status ./my-runtime
```

See `docs/brain-runtime-v0.3.en.md` for the complete runtime guide.

## Problem

AI companion users often lose continuity when they move to a new endpoint:

- The new app does not share the old memory.
- The new model receives only a dry summary.
- Full chat archives are too large to fit into context.
- Search results sound like reports instead of natural memories.
- Raw logs, summaries, vectors, and diaries are not connected.

## Architecture

Everthread uses five layers:

1. **Hot Brain**: accepted memory, current state, stable preferences, active identity.
2. **Cold Warehouse**: raw chats, exports, attachments, long history.
3. **Dream Layer**: daily or monthly emotional consolidation.
4. **Recall Gate**: controlled retrieval budgets and natural recall style.
5. **Port Adapter**: shared protocol for bots, apps, and frontends.

## Ten Brain Areas

- Brainstem: identity and core boundaries.
- Hippocampus: events, timeline, relational anchors.
- Neocortex: stable knowledge, concepts, preferences.
- Prefrontal: decisions, plans, project state.
- Amygdala: emotional significance.
- Cerebellum: habits and repeated workflows.
- Thalamus: routing and indexes.
- Working Memory: current conversation and active tasks.
- Synapses: links, similarity, conflicts.
- Dreaming: diary, consolidation, compression, soft forgetting.

## Data Ownership

Raw companion chats belong to the user. A private deployment may preserve full raw conversations. Public repositories and examples should use fictional data only.

## Frontend / Bot Connection

Everthread is not a chat frontend. It sits between a frontend or bot and the
model call.

```text
user message
  -> frontend or bot
  -> get recall context from Everthread
  -> call model
  -> show assistant reply
  -> capture the turn back into Everthread
```

This keeps Telegram bots, custom web frontends, local clients, and future
endpoints connected to the same memory flow.

See `docs/frontend-port-adapter.zh-CN.md` and
`examples/frontend-turn.example.json`.

## Python Starter Kit (preserved from v0.2)

Everthread includes a small Python CLI:

```bash
python -m everthread init ./my-memory
python -m everthread import chatgpt ./chatgpt-export --workspace ./my-memory
python -m everthread digest monthly --workspace ./my-memory
python -m everthread recall-budget --workspace ./my-memory --force
```

The `chatgpt` command is the first import adapter, not a product boundary.
Everthread can support Claude, Gemini, Telegram logs, SillyTavern chats, and
other raw chat sources through additional adapters.

The current adapter scans `conversations*.json` exports, writes manifests and
dedupe hashes, creates per-conversation Markdown files, and generates monthly
digest maps. It does not delete or rewrite the original export.

## Forgetting Model

Forgetting in Everthread means controlled memory flow, not careless deletion.

- `soft_forget`: keep the raw record, but reduce active recall.
- `sink`: move low-priority material into slower storage.
- `compress`: preserve meaning in diaries, digests, or stable memory objects.
- `delete`: physically remove data only when the user intentionally chooses it.

## License

MIT
