import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { appendJsonl, readJsonl } from '../../runtime/core/io.mjs';
import { ensureRuntimeWorkspace, runtimePaths } from '../../runtime/core/workspace.mjs';
import { reviewCandidates } from '../../runtime/review/engine.mjs';
import { decideCandidate } from '../../runtime/review/policy.mjs';


function candidate(overrides = {}) {
  return {
    id: overrides.id ?? 'mem-fixture',
    source_event_id: overrides.source_event_id ?? 'evt-fixture',
    source: 'fictional-chat',
    timestamp: '2026-07-13T00:00:00Z',
    content: 'Fictional memory content.',
    privacy: 'low',
    confidence: 0.95,
    salience: 0.7,
    tags: ['preference'],
    brain_area: 'neocortex',
    routing_reasons: ['tag:preference'],
    candidate_created_at: '2026-07-13T00:01:00Z',
    ...overrides
  };
}


test('review policy exposes four deterministic outcomes', () => {
  assert.equal(decideCandidate(candidate()).outcome, 'accepted');
  assert.equal(decideCandidate(candidate({ confidence: 0.55, tags: ['event'] })).outcome, 'deferred');
  assert.equal(decideCandidate(candidate({ privacy: 'guarded', confidence: 0.99 })).outcome, 'needs_human_review');
  assert.equal(decideCandidate(candidate({ tags: ['ephemeral'] })).outcome, 'rejected');
});


test('routes guarded content only to human review and is idempotent', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'everthread-'));
  const paths = await ensureRuntimeWorkspace(root);
  const accepted = candidate({ id: 'mem-accepted' });
  const guarded = candidate({
    id: 'mem-guarded',
    source_event_id: 'evt-guarded',
    content: 'guarded secret fixture',
    privacy: 'guarded'
  });
  await appendJsonl(paths.candidates, accepted);
  await appendJsonl(paths.candidates, guarded);

  const first = await reviewCandidates(root);
  assert.deepEqual(first, {
    scanned: 2,
    decided: 2,
    accepted: 1,
    deferred: 0,
    needs_human_review: 1,
    rejected: 0,
    skipped: 0
  });
  assert.equal((await readJsonl(paths.accepted)).some(item => item.id === guarded.id), false);
  assert.equal((await readJsonl(paths.humanReview))[0].content, 'guarded secret fixture');
  assert.deepEqual(await reviewCandidates(root), {
    scanned: 2,
    decided: 0,
    accepted: 0,
    deferred: 0,
    needs_human_review: 0,
    rejected: 0,
    skipped: 2
  });
});
