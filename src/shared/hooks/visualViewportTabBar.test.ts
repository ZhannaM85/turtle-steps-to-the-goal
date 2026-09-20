import { describe, expect, it } from 'vitest'
import {
  measureVisualViewportBottomGap,
  nextVisualViewportTabBarState,
  stuckViewportRestoreState,
} from './visualViewportTabBar'

const visible = { isShrunk: false, staleBottomGap: 0 }

describe('measureVisualViewportBottomGap (#970)', () => {
  it('returns the gap below the visual viewport', () => {
    expect(
      measureVisualViewportBottomGap(800, { height: 500, offsetTop: 0 }),
    ).toBe(300)
    expect(
      measureVisualViewportBottomGap(800, { height: 500, offsetTop: 50 }),
    ).toBe(250)
  })

  it('returns 0 when the visual viewport is missing or full-height', () => {
    expect(measureVisualViewportBottomGap(800, undefined)).toBe(0)
    expect(
      measureVisualViewportBottomGap(800, { height: 800, offsetTop: 0 }),
    ).toBe(0)
  })
})

describe('nextVisualViewportTabBarState (#188, #973, #970)', () => {
  it('does not hide the tab bar for a shrink with no keyboard (#973)', () => {
    const result = nextVisualViewportTabBarState({
      bottomGap: 80,
      keyboardOpen: false,
      keyboardWasOpen: false,
      previous: visible,
    })
    expect(result.state).toEqual(visible)
    expect(result.keyboardWasOpen).toBe(false)
    expect(result.scheduleStuckClear).toBe(true)
  })

  it('hides the tab bar while the keyboard is open (#188)', () => {
    const result = nextVisualViewportTabBarState({
      bottomGap: 300,
      keyboardOpen: true,
      keyboardWasOpen: false,
      previous: visible,
    })
    expect(result.state).toEqual({ isShrunk: true, staleBottomGap: 0 })
    expect(result.keyboardWasOpen).toBe(true)
    expect(result.scheduleStuckClear).toBe(false)
  })

  it('keeps the tab bar hidden after keyboard blur while still shrunk (#188)', () => {
    const result = nextVisualViewportTabBarState({
      bottomGap: 300,
      keyboardOpen: false,
      keyboardWasOpen: true,
      previous: { isShrunk: true, staleBottomGap: 0 },
    })
    expect(result.state).toEqual({ isShrunk: true, staleBottomGap: 0 })
    expect(result.scheduleStuckClear).toBe(true)
  })

  it('clears hide and compensation once the viewport is full height', () => {
    const result = nextVisualViewportTabBarState({
      bottomGap: 0,
      keyboardOpen: false,
      keyboardWasOpen: true,
      previous: { isShrunk: true, staleBottomGap: 0 },
    })
    expect(result.state).toEqual(visible)
    expect(result.keyboardWasOpen).toBe(false)
    expect(result.scheduleStuckClear).toBe(false)
  })

  it('remembers a focused keyboard before the viewport has shrunk (#188)', () => {
    const result = nextVisualViewportTabBarState({
      bottomGap: 0,
      keyboardOpen: true,
      keyboardWasOpen: false,
      previous: visible,
    })
    expect(result.state).toEqual(visible)
    expect(result.keyboardWasOpen).toBe(true)
  })

  it('keeps an already-applied stale gap while scrolling without a keyboard (#970, #973)', () => {
    const result = nextVisualViewportTabBarState({
      bottomGap: 300,
      keyboardOpen: false,
      keyboardWasOpen: false,
      previous: { isShrunk: false, staleBottomGap: 300 },
    })
    expect(result.state).toEqual({ isShrunk: false, staleBottomGap: 300 })
    expect(result.scheduleStuckClear).toBe(false)
  })
})

describe('stuckViewportRestoreState (#546, #970)', () => {
  it('restores a visible bar with the stale bottom gap when no keyboard is open', () => {
    expect(stuckViewportRestoreState(300, false)).toEqual({
      isShrunk: false,
      staleBottomGap: 300,
    })
  })

  it('does not restore while a keyboard is still open', () => {
    expect(stuckViewportRestoreState(300, true)).toBeNull()
  })
})
