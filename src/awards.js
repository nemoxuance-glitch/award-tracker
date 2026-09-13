// Limits match the server's validation in server/index.js.
export const MAX_NAME_LENGTH = 100
export const MAX_COUNT = 1_000_000

// Returns { award: { name, count } } or { error }.
export function validateAward(nameInput, countInput) {
  const name = nameInput.trim()
  const count = Number(countInput)

  if (!name) return { error: 'Enter the name of the award.' }
  if (name.length > MAX_NAME_LENGTH) {
    return { error: `Award name must be ${MAX_NAME_LENGTH} characters or fewer.` }
  }
  if (String(countInput).trim() === '' || !Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    return { error: `Number of awards must be a whole number from 1 to ${MAX_COUNT.toLocaleString()}.` }
  }
  return { award: { name, count } }
}

// Totals per award type. Entries whose names differ only by case or spacing
// are treated as the same type.
export function totalsByType(awards) {
  const byKey = new Map()
  for (const { name, count } of awards) {
    const key = name.trim().replace(/\s+/g, ' ').toLowerCase()
    const entry = byKey.get(key) ?? { name, count: 0 }
    entry.count += count
    byKey.set(key, entry)
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

// Average time between consecutive award entries, in milliseconds, based on
// when each entry was first logged. The sum of the gaps between consecutive
// entries is just newest − oldest, so the average is that span divided by the
// number of gaps. Returns null when there are fewer than two entries.
export function averageGapMs(awards) {
  if (awards.length < 2) return null
  const times = awards.map((a) => a.createdAt)
  return (Math.max(...times) - Math.min(...times)) / (awards.length - 1)
}

const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`

// e.g. "3 days 4 hrs", "2 hrs 15 mins", "45 mins", "Under 1 min"
export function formatDuration(ms) {
  const totalMinutes = Math.round(ms / 60_000)
  if (totalMinutes < 1) return 'Under 1 min'

  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return hours ? `${plural(days, 'day')} ${plural(hours, 'hr')}` : plural(days, 'day')
  if (hours > 0) return minutes ? `${plural(hours, 'hr')} ${plural(minutes, 'min')}` : plural(hours, 'hr')
  return plural(minutes, 'min')
}

export function formatDateTime(ms) {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
