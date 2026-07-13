import { randomUUID } from 'node:crypto';

import { buildLifeRings } from '../consolidation/life-rings.mjs';
import { buildRemDreams } from '../consolidation/rem.mjs';
import { atomicWriteJson } from '../core/io.mjs';
import { ensureRuntimeWorkspace } from '../core/workspace.mjs';
import { processCapture } from '../processor/process-capture.mjs';
import { buildReadContext } from '../read/build-context.mjs';
import { reviewCandidates } from '../review/engine.mjs';


export async function runOnce(root) {
  const startedAt = new Date().toISOString();
  const paths = await ensureRuntimeWorkspace(root);
  const capture = await processCapture(root);
  const review = await reviewCandidates(root);
  const lifeRings = await buildLifeRings(root);
  const rem = await buildRemDreams(root);
  const context = await buildReadContext(root);
  const guardrailsPassed = Object.values(context.guardrails).every(Boolean);
  const state = {
    version: '0.3.0',
    loop_id: randomUUID(),
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    stages: {
      capture,
      review,
      life_rings: {
        core: lifeRings.rings.core.length,
        recent: lifeRings.rings.recent.length,
        archive: lifeRings.rings.archive.length
      },
      rem
    },
    read_path_rebuilt: true,
    selected_context_items: context.items.length,
    vector: { enabled: false },
    guardrails_passed: guardrailsPassed,
    success: guardrailsPassed
  };
  await atomicWriteJson(paths.loopState, state);
  return state;
}
