import { createHash } from 'node:crypto';

import { appendJsonl, atomicWriteJson, readJson, readJsonl } from '../core/io.mjs';
import { ensureRuntimeWorkspace } from '../core/workspace.mjs';
import { routeBrainArea } from '../routing/thalamus.mjs';


function memoryId(eventId) {
  const digest = createHash('sha256').update(eventId, 'utf8').digest('hex').slice(0, 20);
  return `mem-${digest}`;
}


export async function processCapture(root) {
  const paths = await ensureRuntimeWorkspace(root);
  const events = await readJsonl(paths.captureInbox);
  const state = await readJson(paths.captureProcessed, { event_ids: [] });
  const processed = new Set(state.event_ids ?? []);
  const existing = new Set((await readJsonl(paths.candidates)).map(item => item.source_event_id));
  let created = 0;
  let skipped = 0;

  for (const event of events) {
    if (processed.has(event.id) || existing.has(event.id)) {
      processed.add(event.id);
      skipped += 1;
      continue;
    }
    const route = routeBrainArea(event);
    await appendJsonl(paths.candidates, {
      id: memoryId(event.id),
      source_event_id: event.id,
      source: event.source,
      timestamp: event.timestamp,
      content: event.content,
      privacy: event.privacy,
      confidence: event.confidence,
      salience: event.salience,
      tags: event.tags,
      brain_area: route.brain_area,
      routing_reasons: route.reasons,
      candidate_created_at: new Date().toISOString()
    });
    processed.add(event.id);
    existing.add(event.id);
    created += 1;
  }

  await atomicWriteJson(paths.captureProcessed, { event_ids: [...processed].sort() });
  return { scanned: events.length, created, skipped };
}
