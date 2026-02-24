/**
 * Expand a chore into its occurrence dates within [startRange, endRange].
 * @param {Object} chore - chore row from DB
 * @param {string} startRange - ISO date string YYYY-MM-DD
 * @param {string} endRange   - ISO date string YYYY-MM-DD
 * @returns {string[]} sorted array of ISO date strings
 */
export function expandOccurrences(chore, startRange, endRange) {
  const rangeStart = parseDate(startRange)
  const rangeEnd = parseDate(endRange)
  const choreStart = parseDate(chore.start_date)
  const choreEnd = chore.recurrence_end_date ? parseDate(chore.recurrence_end_date) : null

  const effectiveEnd = choreEnd && choreEnd < rangeEnd ? choreEnd : rangeEnd

  const occurrences = []

  switch (chore.recurrence_type) {
    case 'none': {
      if (choreStart >= rangeStart && choreStart <= rangeEnd) {
        occurrences.push(formatDate(choreStart))
      }
      break
    }
    case 'daily': {
      const cursor = new Date(Math.max(choreStart.getTime(), rangeStart.getTime()))
      while (cursor <= effectiveEnd) {
        occurrences.push(formatDate(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
      break
    }
    case 'weekly': {
      const days = JSON.parse(chore.recurrence_days || '[]') // [0-6] Sun-Sat
      if (days.length === 0) break

      const cursor = new Date(Math.max(choreStart.getTime(), rangeStart.getTime()))
      const rewindDays = cursor.getDay()
      cursor.setDate(cursor.getDate() - rewindDays)

      while (cursor <= effectiveEnd) {
        for (const day of days) {
          const candidate = new Date(cursor)
          candidate.setDate(cursor.getDate() + day)
          if (candidate >= choreStart && candidate >= rangeStart && candidate <= effectiveEnd) {
            occurrences.push(formatDate(candidate))
          }
        }
        cursor.setDate(cursor.getDate() + 7)
      }
      break
    }
    case 'monthly': {
      const dayOfMonth = choreStart.getDate()
      const cursor = new Date(Math.max(choreStart.getTime(), rangeStart.getTime()))
      cursor.setDate(1)

      while (cursor <= effectiveEnd) {
        const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), dayOfMonth)
        if (candidate >= choreStart && candidate >= rangeStart && candidate <= effectiveEnd) {
          occurrences.push(formatDate(candidate))
        }
        cursor.setMonth(cursor.getMonth() + 1)
      }
      break
    }
    case 'monthly_weekday': {
      // e.g. "2nd Monday of every month" — only fires on in-office days (Mon–Thu)
      const weekday = chore.recurrence_weekday ?? 1 // 0=Sun … 6=Sat
      const week = chore.recurrence_week ?? 1       // 1-4 or -1 = last

      const cursor = new Date(Math.max(choreStart.getTime(), rangeStart.getTime()))
      cursor.setDate(1)

      while (cursor <= effectiveEnd) {
        const candidate = getNthWeekdayOfMonth(cursor.getFullYear(), cursor.getMonth(), weekday, week)
        if (candidate && candidate >= choreStart && candidate >= rangeStart && candidate <= effectiveEnd) {
          occurrences.push(formatDate(candidate))
        }
        cursor.setMonth(cursor.getMonth() + 1)
      }
      break
    }
    case 'custom': {
      const interval = chore.recurrence_interval || 1
      const cursor = new Date(choreStart)
      while (cursor < rangeStart) {
        cursor.setDate(cursor.getDate() + interval)
      }
      while (cursor <= effectiveEnd) {
        occurrences.push(formatDate(cursor))
        cursor.setDate(cursor.getDate() + interval)
      }
      break
    }
  }

  return [...new Set(occurrences)].sort()
}

/**
 * Returns the Nth weekday of a given month, or null if it doesn't exist.
 * @param {number} year
 * @param {number} month - 0-indexed
 * @param {number} weekday - 0=Sun…6=Sat
 * @param {number} n - 1..4 or -1 for last
 */
function getNthWeekdayOfMonth(year, month, weekday, n) {
  if (n === -1) {
    const lastDay = new Date(year, month + 1, 0)
    const diff = (lastDay.getDay() - weekday + 7) % 7
    return new Date(year, month, lastDay.getDate() - diff)
  } else {
    const firstDay = new Date(year, month, 1)
    const diff = (weekday - firstDay.getDay() + 7) % 7
    const date = 1 + diff + (n - 1) * 7
    const candidate = new Date(year, month, date)
    // Verify it didn't overflow into the next month
    if (candidate.getMonth() !== month) return null
    return candidate
  }
}

function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
