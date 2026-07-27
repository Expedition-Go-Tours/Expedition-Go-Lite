/**
 * @file tourAvailability.ts
 * @description Deterministic mock availability for tour dates (no backend yet).
 *   Given a stable seed (tour id/title) and a date, returns whether that date
 *   is fully booked, has limited spots, or is freely available. Deterministic
 *   so the same tour+date always yields the same status across renders.
 *
 *   Replace `getDateAvailability` with a real API lookup when the backend
 *   exposes per-date availability.
 */

export type DayAvailability = 'available' | 'limited' | 'full'

function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * @param seed  Stable identifier for the tour (id or title).
 * @param date  The calendar date to check.
 * @returns 'full' (fully booked), 'limited' (few spots), or 'available'.
 */
export function getDateAvailability(seed: string, date: Date): DayAvailability {
  const key = `${seed}|${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  const bucket = hashString(key) % 100

  // ~15% fully booked, ~25% limited, remainder available.
  if (bucket < 15) return 'full'
  if (bucket < 40) return 'limited'
  return 'available'
}
