import { appendJsonl, atomicWriteJson, readJson, readJsonl } from '../core/io.mjs';
import { ensureRuntimeWorkspace } from '../core/workspace.mjs';
import { decideCandidate } from './policy.mjs';


function outputPath(paths, outcome) {
  return {
    accepted: paths.accepted,
    deferred: paths.deferred,
    needs_human_review: paths.humanReview,
    rejected: paths.rejected
  }[outcome];
}


export async function reviewCandidates(root) {
  const paths = await ensureRuntimeWorkspace(root);
  const candidates = await readJsonl(paths.candidates);
  const state = await readJson(paths.reviewProcessed, { memory_ids: [] });
  const processed = new Set(state.memory_ids ?? []);
  for (const decision of await readJsonl(paths.decisions)) processed.add(decision.memory_id);
  const counts = {
    scanned: candidates.length,
    decided: 0,
    accepted: 0,
    deferred: 0,
    needs_human_review: 0,
    rejected: 0,
    skipped: 0
  };

  for (const candidate of candidates) {
    if (processed.has(candidate.id)) {
      counts.skipped += 1;
      continue;
    }
    const result = decideCandidate(candidate);
    const reviewedAt = new Date().toISOString();
    const decision = {
      memory_id: candidate.id,
      outcome: result.outcome,
      reasons: result.reasons,
      reviewed_at: reviewedAt
    };
    await appendJsonl(paths.decisions, decision);
    await appendJsonl(outputPath(paths, result.outcome), {
      ...candidate,
      review: decision
    });
    processed.add(candidate.id);
    counts.decided += 1;
    counts[result.outcome] += 1;
  }

  await atomicWriteJson(paths.reviewProcessed, { memory_ids: [...processed].sort() });
  return counts;
}
