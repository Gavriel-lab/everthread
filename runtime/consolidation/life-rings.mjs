import { atomicWriteJson, readJsonl } from '../core/io.mjs';
import { ensureRuntimeWorkspace } from '../core/workspace.mjs';


function ringFor(memory, now) {
  const tags = new Set(memory.tags ?? []);
  if (memory.salience >= 0.85 || tags.has('identity') || tags.has('boundary')) return 'core';
  const age = now.getTime() - new Date(memory.timestamp).getTime();
  if (Number.isFinite(age) && age <= 30 * 24 * 60 * 60 * 1000) return 'recent';
  return 'archive';
}


export async function buildLifeRings(root, now = new Date()) {
  const paths = await ensureRuntimeWorkspace(root);
  const accepted = await readJsonl(paths.accepted);
  const result = {
    generated_at: now.toISOString(),
    rings: { core: [], recent: [], archive: [] }
  };
  for (const memory of accepted) result.rings[ringFor(memory, now)].push(memory.id);
  for (const ids of Object.values(result.rings)) ids.sort();
  await atomicWriteJson(paths.lifeRings, result);
  return result;
}
