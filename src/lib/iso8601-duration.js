// Minimal ISO 8601 duration parser for recipe times.
// Handles the shape recipe schemas actually use: PT<H>H<M>M.
// Returns total minutes (integer). Returns 0 for empty / invalid input.

export function parseIso8601Duration(input) {
  if (typeof input !== 'string' || input.length === 0) return 0;
  const m = input.match(/^P(?:([0-9]+)D)?(?:T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:[0-9]+S)?)?$/);
  if (!m) return 0;
  const days = Number(m[1] || 0);
  const hours = Number(m[2] || 0);
  const minutes = Number(m[3] || 0);
  return days * 24 * 60 + hours * 60 + minutes;
}
