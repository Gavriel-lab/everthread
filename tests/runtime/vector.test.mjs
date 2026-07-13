import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { atomicWriteJson } from '../../runtime/core/io.mjs';
import { ensureRuntimeWorkspace } from '../../runtime/core/workspace.mjs';
import { rebuildShadowIndex } from '../../runtime/vector/shadow-index.mjs';


async function vectorWorkspace() {
  const root = await mkdtemp(path.join(tmpdir(), 'everthread-'));
  const paths = await ensureRuntimeWorkspace(root);
  await atomicWriteJson(paths.readContext, {
    items: [
      { id: 'mem-1', content: 'Fictional preference.' },
      { id: 'mem-2', content: 'Fictional project result.' }
    ]
  });
  return { root, paths };
}


test('atomically writes a valid shadow index', async () => {
  const { root, paths } = await vectorWorkspace();
  const result = await rebuildShadowIndex(
    root,
    async texts => texts.map((_, index) => [index + 0.1, index + 0.2])
  );

  assert.deepEqual(result, { updated: true, item_count: 2, dimensions: 2, error: null });
  const index = JSON.parse(await readFile(paths.shadowIndex, 'utf8'));
  assert.deepEqual(index.items[1].vector, [1.1, 1.2]);
});


test('keeps the previous index when the provider fails', async () => {
  const { root, paths } = await vectorWorkspace();
  await rebuildShadowIndex(root, async texts => texts.map(() => [0.1, 0.2]));
  const before = await readFile(paths.shadowIndex, 'utf8');
  const result = await rebuildShadowIndex(root, async () => {
    throw new Error('fixture outage');
  });

  assert.equal(result.updated, false);
  assert.match(result.error, /fixture outage/u);
  assert.equal(await readFile(paths.shadowIndex, 'utf8'), before);
});


test('rejects malformed vectors without replacing a valid index', async () => {
  const { root, paths } = await vectorWorkspace();
  await rebuildShadowIndex(root, async texts => texts.map(() => [0.1, 0.2]));
  const before = await readFile(paths.shadowIndex, 'utf8');
  const result = await rebuildShadowIndex(root, async () => [[0.1], [0.2, 0.3]]);

  assert.equal(result.updated, false);
  assert.match(result.error, /dimensions/u);
  assert.equal(await readFile(paths.shadowIndex, 'utf8'), before);
});
