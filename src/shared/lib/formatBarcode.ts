/**
 * Display-only barcode grouping (#520). Storage / lookup keep the raw
 * digit string — this only affects what the user reads on Add/Edit food
 * and Custom foods rows.
 *
 * - 13 digits (EAN-13 / GTIN-13): `1 123456 654321`
 * - 12 digits (UPC-A): `1 12345 65432 1`
 * - 8 digits (EAN-8): `1234 5678`
 * - anything else: returned unchanged (after trimming)
 */
export function formatBarcodeDisplay(code: string): string {
  const digits = code.trim()
  if (!/^\d+$/.test(digits)) return code.trim()

  if (digits.length === 13) {
    return `${digits.slice(0, 1)} ${digits.slice(1, 7)} ${digits.slice(7)}`
  }
  if (digits.length === 12) {
    return `${digits.slice(0, 1)} ${digits.slice(1, 6)} ${digits.slice(6, 11)} ${digits.slice(11)}`
  }
  if (digits.length === 8) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`
  }
  return digits
}
