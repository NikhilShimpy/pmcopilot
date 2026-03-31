const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getValidDate(value: string | number | Date | null | undefined): Date | null {
  if (!value) {
    return null
  }
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function formatDateStable(value: string | number | Date | null | undefined): string {
  const parsed = getValidDate(value)
  if (!parsed) {
    return '-'
  }

  const day = parsed.getUTCDate()
  const month = MONTHS[parsed.getUTCMonth()]
  const year = parsed.getUTCFullYear()
  return `${month} ${day}, ${year}`
}

export function formatDateTimeStable(value: string | number | Date | null | undefined): string {
  const parsed = getValidDate(value)
  if (!parsed) {
    return '-'
  }

  const day = parsed.getUTCDate()
  const month = MONTHS[parsed.getUTCMonth()]
  const year = parsed.getUTCFullYear()
  const hours = pad(parsed.getUTCHours())
  const minutes = pad(parsed.getUTCMinutes())
  return `${month} ${day}, ${year} ${hours}:${minutes} UTC`
}

export function formatMonthKeyStable(value: string): string {
  const [yearRaw, monthRaw] = value.split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return value
  }
  return `${MONTHS[month - 1]} ${year}`
}
