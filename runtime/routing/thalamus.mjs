const ROUTES = [
  { tags: ['identity', 'boundary'], brain_area: 'brainstem' },
  { tags: ['plan', 'decision', 'project', 'result'], brain_area: 'prefrontal' },
  { tags: ['preference', 'concept', 'rule'], brain_area: 'neocortex' },
  { tags: ['emotion'], brain_area: 'amygdala' },
  { tags: ['habit', 'procedure'], brain_area: 'cerebellum' },
  { tags: ['active'], brain_area: 'working_memory' },
  { tags: ['link'], brain_area: 'synapses' },
  { tags: ['dream'], brain_area: 'dreaming' },
  { tags: ['routing'], brain_area: 'thalamus' }
];


export function routeBrainArea(event) {
  const tags = new Set(Array.isArray(event?.tags) ? event.tags.map(tag => tag.toLowerCase()) : []);
  for (const route of ROUTES) {
    const matched = route.tags.find(tag => tags.has(tag));
    if (matched) return { brain_area: route.brain_area, reasons: [`tag:${matched}`] };
  }
  return { brain_area: 'hippocampus', reasons: ['default:event-memory'] };
}
