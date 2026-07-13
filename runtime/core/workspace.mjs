import path from 'node:path';

import { atomicWriteJson, ensureEmptyFile, pathExists } from './io.mjs';


export function runtimePaths(root) {
  const workspace = path.resolve(root);
  return {
    root: workspace,
    config: path.join(workspace, 'runtime.json'),
    captureInbox: path.join(workspace, 'capture', 'inbox.jsonl'),
    quarantine: path.join(workspace, 'capture', 'quarantine.jsonl'),
    captureProcessed: path.join(workspace, 'capture', 'processed.json'),
    candidates: path.join(workspace, 'candidates', 'candidate_memory.jsonl'),
    decisions: path.join(workspace, 'review', 'decisions.jsonl'),
    accepted: path.join(workspace, 'review', 'accepted.jsonl'),
    deferred: path.join(workspace, 'review', 'deferred.jsonl'),
    humanReview: path.join(workspace, 'review', 'needs_human_review.jsonl'),
    rejected: path.join(workspace, 'review', 'rejected.jsonl'),
    reviewProcessed: path.join(workspace, 'review', 'processed.json'),
    lifeRings: path.join(workspace, 'consolidation', 'life_rings.json'),
    remDreams: path.join(workspace, 'consolidation', 'rem_dreams.jsonl'),
    readContext: path.join(workspace, 'read', 'context.json'),
    readState: path.join(workspace, 'read', 'state.json'),
    shadowIndex: path.join(workspace, 'vector', 'shadow_index.json'),
    loopState: path.join(workspace, 'loop', 'state.json')
  };
}


export async function ensureRuntimeWorkspace(root) {
  const paths = runtimePaths(root);
  if (!(await pathExists(paths.config))) {
    await atomicWriteJson(paths.config, {
      version: '0.3.0',
      read_budget: 24,
      legacy_read_only_fallback: null,
      life_rings: ['core', 'recent', 'archive']
    });
  }

  for (const filePath of [
    paths.captureInbox,
    paths.quarantine,
    paths.candidates,
    paths.decisions,
    paths.accepted,
    paths.deferred,
    paths.humanReview,
    paths.rejected,
    paths.remDreams
  ]) {
    await ensureEmptyFile(filePath);
  }

  if (!(await pathExists(paths.captureProcessed))) {
    await atomicWriteJson(paths.captureProcessed, { event_ids: [] });
  }
  if (!(await pathExists(paths.reviewProcessed))) {
    await atomicWriteJson(paths.reviewProcessed, { memory_ids: [] });
  }
  return paths;
}
