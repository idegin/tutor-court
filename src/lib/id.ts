/**
 * Payload collections in this project use integer primary keys, but IDs arrive
 * from the client (JSON bodies, URL params, pubsub round-trips) as strings.
 * Passing a string into a Payload integer relationship field throws a
 * ValidationError → HTTP 500. Coerce and validate before every DB write.
 *
 * Returns the integer id, or null when the value is not a positive integer id.
 */
export function toIntId(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : null
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const n = Number(value.trim())
    return Number.isInteger(n) && n > 0 ? n : null
  }
  return null
}
