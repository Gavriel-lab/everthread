import { atomicWriteJson, readJson, readJsonl } from '../core/io.mjs';
import { ensureRuntimeWorkspace } from '../core/workspace.mjs';


const READ_ORDER = [
  'accepted_rules_preferences',
  'accepted_mainline',
  'rem_dreams',
  'deferred_metadata',
  'human_review_presence',
  'legacy_read_only_fallback'
];
const RULE_TAGS = new Set(['identity', 'boundary', 'preference', 'rule', 'habit']);


function publicMemory(memory, kind) {
  return {
    kind,
    id: memory.id,
    timestamp: memory.timestamp,
    content: memory.content,
    brain_area: memory.brain_area,
    tags: memory.tags,
    salience: memory.salience
  };
}


export async function buildReadContext(root) {
  const paths = await ensureRuntimeWorkspace(root);
  const config = await readJson(paths.config);
  const accepted = await readJsonl(paths.accepted);
  const deferred = await readJsonl(paths.deferred);
  const humanReview = await readJsonl(paths.humanReview);
  const dreams = await readJsonl(paths.remDreams);
  const rules = accepted.filter(item => (item.tags ?? []).some(tag => RULE_TAGS.has(tag)));
  const mainline = accepted.filter(item => !rules.includes(item));
  const orderedItems = [
    ...rules.map(item => publicMemory(item, 'accepted_rule_preference')),
    ...mainline.map(item => publicMemory(item, 'accepted_mainline')),
    ...dreams.map(item => ({
      kind: 'rem_dream',
      id: item.id,
      month: item.month,
      themes: item.themes,
      content: item.summary,
      source_memory_ids: item.source_memory_ids
    }))
  ];
  const budget = Number.isInteger(config.read_budget) && config.read_budget > 0 ? config.read_budget : 24;
  const generatedAt = new Date().toISOString();
  const context = {
    version: '0.3.0',
    generated_at: generatedAt,
    budget,
    read_order: READ_ORDER,
    items: orderedItems.slice(0, budget),
    deferred: { count: deferred.length, memory_ids: deferred.map(item => item.id) },
    human_review: { count: humanReview.length, content_exposed: false },
    legacy_fallback: {
      configured: Boolean(config.legacy_read_only_fallback),
      read_only: true,
      reference: config.legacy_read_only_fallback
    },
    guardrails: {
      accepted_only_active_content: true,
      human_review_presence_only: true,
      legacy_fallback_read_only: true
    }
  };
  await atomicWriteJson(paths.readContext, context);
  await atomicWriteJson(paths.readState, {
    generated_at: generatedAt,
    selected_items: context.items.length,
    accepted_rules_preferences: rules.length,
    accepted_mainline: mainline.length,
    rem_dreams: dreams.length,
    deferred_candidates: deferred.length,
    human_review_required: humanReview.length,
    read_order: READ_ORDER,
    guardrails: context.guardrails
  });
  return context;
}
