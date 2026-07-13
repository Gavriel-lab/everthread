const PRIVACY_LEVELS = new Set(['low', 'medium', 'high', 'guarded']);


function isUnitNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}


export function validateCaptureEvent(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, errors: ['event must be an object'], event: null };
  }

  for (const field of ['id', 'source', 'timestamp', 'content']) {
    if (typeof value[field] !== 'string' || value[field].trim() === '') {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  if (typeof value.timestamp === 'string' && Number.isNaN(Date.parse(value.timestamp))) {
    errors.push('timestamp must be an ISO-8601 date-time');
  }
  if (!PRIVACY_LEVELS.has(value.privacy)) {
    errors.push('privacy must be low, medium, high, or guarded');
  }
  if (!isUnitNumber(value.confidence)) {
    errors.push('confidence must be a number from 0 through 1');
  }
  if (!isUnitNumber(value.salience)) {
    errors.push('salience must be a number from 0 through 1');
  }
  if (value.tags !== undefined && (
    !Array.isArray(value.tags) || value.tags.some(tag => typeof tag !== 'string' || tag.trim() === '')
  )) {
    errors.push('tags must be an array of non-empty strings');
  }

  if (errors.length > 0) return { ok: false, errors, event: null };
  return {
    ok: true,
    errors: [],
    event: {
      id: value.id.trim(),
      source: value.source.trim(),
      timestamp: new Date(value.timestamp).toISOString(),
      content: value.content.trim(),
      privacy: value.privacy,
      confidence: value.confidence,
      salience: value.salience,
      tags: [...new Set((value.tags ?? []).map(tag => tag.trim().toLowerCase()))]
    }
  };
}
