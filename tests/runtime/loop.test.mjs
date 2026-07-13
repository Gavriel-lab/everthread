import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { captureEvent } from '../../runtime/capture/gateway.mjs';
import { runOnce } from '../../runtime/loop/run-once.mjs';


const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fixtureEvent = {
  id: 'evt-loop-1',
  source: 'fictional-chat',
  timestamp: '2026-07-13T00:00:00Z',
  content: 'The fictional user prefers a short changelog.',
  privacy: 'low',
  confidence: 0.95,
  salience: 0.8,
  tags: ['preference']
};


test('runs capture through read path once and makes the second run a no-op', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'everthread-'));
  await captureEvent(root, fixtureEvent);

  const first = await runOnce(root);
  assert.equal(first.success, true);
  assert.equal(first.stages.capture.created, 1);
  assert.equal(first.stages.review.accepted, 1);
  assert.equal(first.read_path_rebuilt, true);
  assert.equal(first.guardrails_passed, true);

  const second = await runOnce(root);
  assert.equal(second.stages.capture.created, 0);
  assert.equal(second.stages.review.decided, 0);
  assert.equal(second.success, true);
});


test('CLI exposes init, capture, run, and status as JSON commands', async () => {
  const parent = await mkdtemp(path.join(tmpdir(), 'everthread-cli-'));
  const workspace = path.join(parent, 'memory');
  const eventFile = path.join(parent, 'event.json');
  await writeFile(eventFile, `${JSON.stringify(fixtureEvent)}\n`, 'utf8');

  const invoke = async (...args) => {
    const { stdout } = await execFileAsync(process.execPath, [path.join(ROOT, 'runtime', 'cli.mjs'), ...args]);
    return JSON.parse(stdout);
  };
  assert.equal((await invoke('init', workspace)).command, 'init');
  assert.equal((await invoke('capture', workspace, eventFile)).accepted, true);
  assert.equal((await invoke('run', workspace)).success, true);
  assert.equal((await invoke('status', workspace)).success, true);
});
