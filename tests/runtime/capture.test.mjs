import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { captureEvent } from '../../runtime/capture/gateway.mjs';
import { ensureRuntimeWorkspace, runtimePaths } from '../../runtime/core/workspace.mjs';
import { readJsonl } from '../../runtime/core/io.mjs';


test('normalizes and appends a valid capture event', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'everthread-'));
  await ensureRuntimeWorkspace(root);
  const result = await captureEvent(root, {
    id: 'evt-1',
    source: 'fictional-chat',
    timestamp: '2026-07-13T00:00:00Z',
    content: 'The user prefers concise release notes.',
    privacy: 'low',
    confidence: 0.94,
    salience: 0.7,
    tags: ['preference']
  });

  assert.deepEqual(result, { accepted: true, id: 'evt-1', errors: [] });
  assert.deepEqual((await readJsonl(runtimePaths(root).captureInbox))[0].tags, ['preference']);
});


test('quarantines malformed capture without adding content to active storage', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'everthread-'));
  await ensureRuntimeWorkspace(root);
  const paths = runtimePaths(root);
  const result = await captureEvent(root, { id: 'bad', content: '' });

  assert.equal(result.accepted, false);
  assert.match(result.errors.join(' '), /source|timestamp|content/u);
  assert.deepEqual(await readJsonl(paths.captureInbox), []);
  const quarantine = await readJsonl(paths.quarantine);
  assert.equal(quarantine[0].id, 'bad');
  assert.equal('content' in quarantine[0], false);
});
