import { describe, expect, it } from 'vitest'
import { isBlankSaveValue, persistableText } from './isBlankSaveValue'

describe('isBlankSaveValue (#854)', () => {
  it('treats empty, whitespace-only, null, and missing as blank', () => {
    expect(isBlankSaveValue('')).toBe(true)
    expect(isBlankSaveValue('   ')).toBe(true)
    expect(isBlankSaveValue('\n\t')).toBe(true)
    expect(isBlankSaveValue(undefined)).toBe(true)
    expect(isBlankSaveValue(null)).toBe(true)
  })

  it('treats real text and numbers (including 0) as persistable', () => {
    expect(isBlankSaveValue('felt good')).toBe(false)
    expect(isBlankSaveValue('  hello  ')).toBe(false)
    expect(isBlankSaveValue(0)).toBe(false)
    expect(isBlankSaveValue(8500)).toBe(false)
  })
})

describe('persistableText (#854)', () => {
  it('trims a non-blank draft', () => {
    expect(persistableText('  hello  ', 'old')).toBe('hello')
  })

  it('falls back to the last saved value when the draft is blank', () => {
    expect(persistableText('   ', 'kept')).toBe('kept')
    expect(persistableText('', 'kept')).toBe('kept')
    expect(persistableText(undefined, 'kept')).toBe('kept')
  })

  it('stays unset when neither draft nor last saved has text', () => {
    expect(persistableText('', undefined)).toBeUndefined()
    expect(persistableText('  ', '')).toBeUndefined()
  })
})
