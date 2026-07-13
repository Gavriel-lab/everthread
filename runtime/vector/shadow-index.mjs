import { atomicWriteJson, readJson } from '../core/io.mjs';
import { ensureRuntimeWorkspace } from '../core/workspace.mjs';


function validateVectors(vectors, itemCount) {
  if (!Array.isArray(vectors) || vectors.length !== itemCount) {
    throw new Error('vector count does not match item count');
  }
  if (itemCount === 0) return 0;
  if (!Array.isArray(vectors[0]) || vectors[0].length === 0) {
    throw new Error('vectors must have non-zero dimensions');
  }
  const dimensions = vectors[0].length;
  for (const vector of vectors) {
    if (!Array.isArray(vector) || vector.length !== dimensions) {
      throw new Error('vector dimensions are inconsistent');
    }
    if (vector.some(value => typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error('vectors must contain finite numbers');
    }
  }
  return dimensions;
}


function safeMessage(error) {
  return String(error?.message ?? 'vector provider failed').replace(/[\r\n]+/gu, ' ').slice(0, 200);
}


export async function rebuildShadowIndex(root, embed) {
  const paths = await ensureRuntimeWorkspace(root);
  try {
    if (typeof embed !== 'function') throw new Error('embed must be a function');
    const context = await readJson(paths.readContext, { items: [] });
    const items = Array.isArray(context.items) ? context.items : [];
    const vectors = await embed(items.map(item => item.content ?? ''));
    const dimensions = validateVectors(vectors, items.length);
    await atomicWriteJson(paths.shadowIndex, {
      version: '0.3.0',
      generated_at: new Date().toISOString(),
      dimensions,
      items: items.map((item, index) => ({ id: item.id, vector: vectors[index] }))
    });
    return { updated: true, item_count: items.length, dimensions, error: null };
  } catch (error) {
    return { updated: false, item_count: 0, dimensions: 0, error: safeMessage(error) };
  }
}
