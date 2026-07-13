const DURABLE_TAGS = new Set([
  'identity', 'boundary', 'preference', 'rule', 'decision', 'project', 'result', 'habit', 'event'
]);
const REJECT_TAGS = new Set(['ephemeral', 'system-noise', 'noise']);


export function decideCandidate(candidate) {
  const tags = new Set(candidate.tags ?? []);
  if (candidate.privacy === 'guarded' || candidate.privacy === 'high') {
    return { outcome: 'needs_human_review', reasons: [`privacy:${candidate.privacy}`] };
  }
  const rejectTag = [...REJECT_TAGS].find(tag => tags.has(tag));
  if (rejectTag || typeof candidate.content !== 'string' || candidate.content.trim() === '') {
    return {
      outcome: 'rejected',
      reasons: [rejectTag ? `tag:${rejectTag}` : 'content:blank']
    };
  }
  const durableTag = [...DURABLE_TAGS].find(tag => tags.has(tag));
  if (candidate.privacy === 'low' && candidate.confidence >= 0.8 && durableTag) {
    return {
      outcome: 'accepted',
      reasons: [`privacy:low`, `confidence:${candidate.confidence}`, `durable:${durableTag}`]
    };
  }
  return { outcome: 'deferred', reasons: ['durability:insufficient'] };
}
