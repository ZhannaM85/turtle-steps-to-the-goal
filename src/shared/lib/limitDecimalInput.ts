import { parseNumberInput } from '@/shared/lib/parseNumberInput'

const DECIMAL_SEP = /[.,]/

function firstDecimalSeparator(raw: string): { index: number; sep: string } | null {
  const index = raw.search(DECIMAL_SEP)
  if (index === -1) return null
  return { index, sep: raw[index] }
}

/**
 * Keep at most one digit after the first `.` or `,`. Extra fraction digits
 * are dropped (typing). A trailing separator is kept so `1.` can become
 * `1.6`. #800
 */
export function limitToOneDecimalPlace(raw: string): string {
  const found = firstDecimalSeparator(raw)
  if (!found) return raw
  const { index, sep } = found
  const fraction = raw.slice(index + 1).replace(/[.,]/g, '')
  return `${raw.slice(0, index)}${sep}${fraction.slice(0, 1)}`
}

/**
 * Round a pasted nutrition string to 1 decimal. Preserves a comma separator
 * when that is what was pasted. Unparseable text falls back to the typing
 * limiter. #800
 */
export function roundToOneDecimalPlace(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === '') return ''
  const parsed = parseNumberInput(trimmed)
  if (parsed === undefined || !Number.isFinite(parsed)) {
    return limitToOneDecimalPlace(trimmed)
  }
  const rounded = Math.round(parsed * 10) / 10
  const found = firstDecimalSeparator(trimmed)
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return found?.sep === ',' ? text.replace('.', ',') : text
}
