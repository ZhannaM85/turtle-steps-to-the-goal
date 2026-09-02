import { parseNumberInput } from '@/shared/lib/parseNumberInput'

const DECIMAL_SEP = /[.,]/

function firstDecimalSeparator(raw: string): { index: number; sep: string } | null {
  const index = raw.search(DECIMAL_SEP)
  if (index === -1) return null
  return { index, sep: raw[index] }
}

/**
 * Keep at most `maxDigits` digits after the first `.` or `,`. Extra fraction
 * digits are dropped (typing). A trailing separator is kept so `1.` can
 * become `1.6`. #800
 */
export function limitToMaxFractionDigits(
  raw: string,
  maxDigits: number,
): string {
  const found = firstDecimalSeparator(raw)
  if (!found) return raw
  const { index, sep } = found
  const fraction = raw.slice(index + 1).replace(/[.,]/g, '')
  return `${raw.slice(0, index)}${sep}${fraction.slice(0, maxDigits)}`
}

/**
 * Round a pasted nutrition string to `maxDigits` decimals. Preserves a comma
 * separator when that is what was pasted. Unparseable text falls back to
 * the typing limiter. #800
 */
export function roundToMaxFractionDigits(
  raw: string,
  maxDigits: number,
): string {
  const trimmed = raw.trim()
  if (trimmed === '') return ''
  const parsed = parseNumberInput(trimmed)
  if (parsed === undefined || !Number.isFinite(parsed)) {
    return limitToMaxFractionDigits(trimmed, maxDigits)
  }
  const factor = 10 ** maxDigits
  const rounded = Math.round(parsed * factor) / factor
  const found = firstDecimalSeparator(trimmed)
  const text = String(rounded)
  return found?.sep === ',' ? text.replace('.', ',') : text
}
