import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ensureRuntimeWorkspace, runtimePaths } from '../../runtime/core/workspace.mjs';


test('initializes the stable runtime workspace and empty JSONL files', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'everthread-'));
  await ensureRuntimeWorkspace(root);
  const paths = runtimePaths(root);

  assert.equal(JSON.parse(await readFile(paths.config, 'utf8')).version, '0.3.0');
  assert.equal(await readFile(paths.captureInbox, 'utf8'), '');
  assert.equal(await readFile(paths.accepted, 'utf8'), '');
});
