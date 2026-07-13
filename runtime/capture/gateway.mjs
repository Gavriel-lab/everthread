import { appendJsonl } from '../core/io.mjs';
import { ensureRuntimeWorkspace } from '../core/workspace.mjs';
import { validateCaptureEvent } from './schema.mjs';


export async function captureEvent(root, value) {
  const paths = await ensureRuntimeWorkspace(root);
  const validation = validateCaptureEvent(value);
  if (!validation.ok) {
    await appendJsonl(paths.quarantine, {
      quarantined_at: new Date().toISOString(),
      id: typeof value?.id === 'string' ? value.id : null,
      errors: validation.errors
    });
    return { accepted: false, id: typeof value?.id === 'string' ? value.id : null, errors: validation.errors };
  }

  await appendJsonl(paths.captureInbox, {
    ...validation.event,
    captured_at: new Date().toISOString()
  });
  return { accepted: true, id: validation.event.id, errors: [] };
}
