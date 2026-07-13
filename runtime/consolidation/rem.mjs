import { createHash } from 'node:crypto';

import { atomicWriteJsonl, readJsonl } from '../core/io.mjs';
import { ensureRuntimeWorkspace } from '../core/workspace.mjs';


function compact(text) {
  return text.replace(/\s+/gu, ' ').trim().slice(0, 180);
}


export async function buildRemDreams(root) {
  const paths = await ensureRuntimeWorkspace(root);
  const accepted = await readJsonl(paths.accepted);
  const groups = new Map();
  for (const memory of accepted) {
    const month = memory.timestamp.slice(0, 7);
    const items = groups.get(month) ?? [];
    items.push(memory);
    groups.set(month, items);
  }
  const dreams = [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, memories]) => {
      const sourceIds = memories.map(item => item.id).sort();
      const themes = [...new Set(memories.flatMap(item => item.tags ?? []))].sort();
      return {
        id: `rem-${createHash('sha256').update(`${month}:${sourceIds.join(',')}`).digest('hex').slice(0, 16)}`,
        month,
        themes,
        source_memory_ids: sourceIds,
        summary: memories.slice(0, 3).map(item => compact(item.content)).join(' ')
      };
    });
  await atomicWriteJsonl(paths.remDreams, dreams);
  return { dream_count: dreams.length, source_memory_count: accepted.length };
}
