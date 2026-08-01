import { describe, expect, it } from 'vitest'
import { formatBarcodeDisplay } from './formatBarcode'

describe('formatBarcodeDisplay', () => {
  it('groups 13-digit EAN-13 as 1 6 6', () => {
    expect(formatBarcodeDisplay('1123456654321')).toBe('1 123456 654321')
  })

  it('groups 12-digit UPC-A as 1 5 5 1', () => {
    expect(formatBarcodeDisplay('012345654321')).toBe('0 12345 65432 1')
  })

  it('groups 8-digit EAN-8 as 4 4', () => {
    expect(formatBarcodeDisplay('12345678')).toBe('1234 5678')
  })

  it('leaves non-digit or other-length codes unchanged (trimmed)', () => {
    expect(formatBarcodeDisplay('  ABC-123  ')).toBe('ABC-123')
    expect(formatBarcodeDisplay('12345')).toBe('12345')
  })
})
