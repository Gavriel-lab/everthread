# Everthread

Everthread is a portable memory architecture for long-term AI companions.

It is designed for people who want their AI companion to remain continuous across apps, models, bots, and frontends. The goal is not to erase raw chat history. The goal is to preserve it in a layered way so the active companion can stay warm without being overloaded.

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

## License

MIT

