import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildLifeRings } from '../../runtime/consolidation/life-rings.mjs';
import { buildRemDreams } from '../../runtime/consolidation/rem.mjs';
import { appendJsonl, readJsonl } from '../../runtime/core/io.mjs';
import { ensureRuntimeWorkspace } from '../../runtime/core/workspace.mjs';
import { buildReadContext } from '../../runtime/read/build-context.mjs';


function reviewedMemory(overrides = {}) {
  return {
    id: overrides.id ?? 'mem-preference',
    source_event_id: overrides.source_event_id ?? 'evt-preference',
    source: 'fictional-chat',
    timestamp: '2026-07-01T00:00:00Z',
    content: 'The fictional user prefers concise release notes.',
    privacy: 'low',
    confidence: 0.95,
    salience: 0.9,
    tags: ['preference'],
    brain_area: 'neocortex',
    routing_reasons: ['tag:preference'],
    candidate_created_at: '2026-07-01T00:01:00Z',
    review: {
      memory_id: overrides.id ?? 'mem-preference',
      outcome: 'accepted',
      reasons: ['durable:preference'],
      reviewed_at: '2026-07-01T00:02:00Z'
    },
    ...overrides
  };
}


test('builds Life Rings and idempotent REM summaries from accepted memory only', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'everthread-'));
  const paths = await ensureRuntimeWorkspace(root);
  await appendJsonl(paths.accepted, reviewedMemory());

  const rings = await buildLifeRings(root);
  assert.deepEqual(rings.rings.core, ['mem-preference']);
  assert.equal((await buildRemDreams(root)).dream_count, 1);
  assert.equal((await buildRemDreams(root)).dream_count, 1);
  assert.equal((await readJsonl(paths.remDreams)).length, 1);
});


test('builds context in fixed order without human-review content', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'everthread-'));
  const paths = await ensureRuntimeWorkspace(root);
  await appendJsonl(paths.accepted, reviewedMemory());
  await appendJsonl(paths.accepted, reviewedMemory({
    id: 'mem-project',
    source_event_id: 'evt-project',
    content: 'The fictional atlas project reached its first stable release.',
    tags: ['project', 'result'],
    brain_area: 'prefrontal',
    salience: 0.7
  }));
  await appendJsonl(paths.deferred, reviewedMemory({ id: 'mem-deferred', review: { outcome: 'deferred' } }));
  await appendJsonl(paths.humanReview, reviewedMemory({
    id: 'mem-guarded',
    content: 'guarded secret fixture',
    privacy: 'guarded',
    review: { outcome: 'needs_human_review' }
  }));
  await buildRemDreams(root);

  const context = await buildReadContext(root);
  assert.deepEqual(context.read_order, [
    'accepted_rules_preferences',
    'accepted_mainline',
    'rem_dreams',
    'deferred_metadata',
    'human_review_presence',
    'legacy_read_only_fallback'
  ]);
  assert.equal(context.human_review.count, 1);
  assert.equal(JSON.stringify(context).includes('guarded secret fixture'), false);
  assert.ok(context.items.length <= context.budget);
  assert.deepEqual(context.items.slice(0, 2).map(item => item.kind), [
    'accepted_rule_preference',
    'accepted_mainline'
  ]);
});
