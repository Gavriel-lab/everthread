import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { captureEvent } from '../../runtime/capture/gateway.mjs';
import { readJsonl } from '../../runtime/core/io.mjs';
import { runtimePaths } from '../../runtime/core/workspace.mjs';
import { processCapture } from '../../runtime/processor/process-capture.mjs';
import { routeBrainArea } from '../../runtime/routing/thalamus.mjs';


const fixtureEvent = {
  id: 'evt-preference-1',
  source: 'fictional-chat',
  timestamp: '2026-07-13T00:00:00Z',
  content: 'The user prefers concise release notes.',
  privacy: 'low',
  confidence: 0.94,
  salience: 0.7,
  tags: ['preference']
};


test('routes a durable preference to Neocortex', () => {
  assert.deepEqual(routeBrainArea(fixtureEvent), {
    brain_area: 'neocortex',
    reasons: ['tag:preference']
  });
});


test('defaults unknown content to Hippocampus', () => {
  assert.deepEqual(routeBrainArea({ tags: [], content: 'A fictional afternoon walk.' }), {
    brain_area: 'hippocampus',
    reasons: ['default:event-memory']
  });
});


test('creates one candidate and skips it on the second pass', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'everthread-'));
  await captureEvent(root, fixtureEvent);

  assert.deepEqual(await processCapture(root), { scanned: 1, created: 1, skipped: 0 });
  assert.deepEqual(await processCapture(root), { scanned: 1, created: 0, skipped: 1 });
  const candidates = await readJsonl(runtimePaths(root).candidates);
  assert.equal(candidates.length, 1);
  assert.match(candidates[0].id, /^mem-[a-f0-9]{20}$/u);
  assert.equal(candidates[0].brain_area, 'neocortex');
});
