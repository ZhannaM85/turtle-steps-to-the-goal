import { describe, expect, it } from 'vitest'
import { ruPluralize } from './ruPluralize'

describe('ruPluralize', () => {
  it.each([
    [1, 'one'],
    [21, 'one'],
    [101, 'one'],
  ])('picks "one" for %i', (n, expected) => {
    expect(ruPluralize(n, 'one', 'few', 'many')).toBe(expected)
  })

  it.each([
    [2, 'few'],
    [3, 'few'],
    [4, 'few'],
    [22, 'few'],
    [104, 'few'],
  ])('picks "few" for %i', (n, expected) => {
    expect(ruPluralize(n, 'one', 'few', 'many')).toBe(expected)
  })

  it.each([
    [0, 'many'],
    [5, 'many'],
    [11, 'many'],
    [12, 'many'],
    [13, 'many'],
    [14, 'many'],
    [25, 'many'],
    [111, 'many'],
  ])('picks "many" for %i (including the 11-14 exception)', (n, expected) => {
    expect(ruPluralize(n, 'one', 'few', 'many')).toBe(expected)
  })
})
