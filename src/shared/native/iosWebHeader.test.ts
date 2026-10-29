import { describe, expect, it } from 'vitest'
import { isIosWebShell } from './iosWebHeader'

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const IPAD_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const DESKTOP_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

describe('isIosWebShell (#1114)', () => {
  it('is true for iPhone Safari and the home-screen PWA', () => {
    expect(isIosWebShell(false, IPHONE_SAFARI, 0)).toBe(true)
  })

  it('is true for iPadOS, which reports a Macintosh user agent', () => {
    expect(isIosWebShell(false, IPAD_DESKTOP_UA, 5)).toBe(true)
  })

  it('is false on desktop, including a Mac without touch', () => {
    expect(isIosWebShell(false, DESKTOP_CHROME, 0)).toBe(false)
    expect(isIosWebShell(false, IPAD_DESKTOP_UA, 0)).toBe(false)
  })

  it('is false in the native iOS app even on an iPhone user agent', () => {
    expect(isIosWebShell(true, IPHONE_SAFARI, 5)).toBe(false)
  })
})
