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
  const decisions = await readJsonl(paths.decisions);
  const decisionsById = new Map(decisions.map(decision => [decision.memory_id, decision]));
  const outputIds = {
    accepted: new Set((await readJsonl(paths.accepted)).map(item => item.id)),
    deferred: new Set((await readJsonl(paths.deferred)).map(item => item.id)),
    needs_human_review: new Set((await readJsonl(paths.humanReview)).map(item => item.id)),
    rejected: new Set((await readJsonl(paths.rejected)).map(item => item.id))
  };
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
    const existingDecision = decisionsById.get(candidate.id);
    if (existingDecision && outputIds[existingDecision.outcome]?.has(candidate.id)) {
      processed.add(candidate.id);
      counts.skipped += 1;
      continue;
    }
    const result = existingDecision ?? {
      ...decideCandidate(candidate),
      memory_id: candidate.id,
      reviewed_at: new Date().toISOString()
    };
    const decision = existingDecision ?? {
      memory_id: result.memory_id,
      outcome: result.outcome,
      reasons: result.reasons,
      reviewed_at: result.reviewed_at
    };
    if (!existingDecision) {
      await appendJsonl(paths.decisions, decision);
      decisionsById.set(candidate.id, decision);
    }
    if (!outputIds[decision.outcome].has(candidate.id)) {
      await appendJsonl(outputPath(paths, decision.outcome), {
        ...candidate,
        review: decision
      });
      outputIds[decision.outcome].add(candidate.id);
    }
    processed.add(candidate.id);
    counts.decided += 1;
    counts[decision.outcome] += 1;
  }

  await atomicWriteJson(paths.reviewProcessed, { memory_ids: [...processed].sort() });
  return counts;
}
