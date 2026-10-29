import { Capacitor } from '@capacitor/core'

/**
 * #1114 — iOS Safari and the home-screen PWA draw the page under a frosted
 * top band and report `safe-area-inset-top` as 0, so the header title sits
 * at 12px and looks blurred. The native app does not: its WebView already
 * clears that band with the existing safe-area padding, and this stays
 * false there so that padding is left alone.
 */
export function isIosWebShell(
  native = Capacitor.isNativePlatform(),
  userAgent = navigator.userAgent,
  maxTouchPoints = navigator.maxTouchPoints,
): boolean {
  if (native) return false
  if (/iPad|iPhone|iPod/.test(userAgent)) return true
  // iPadOS reports a desktop Macintosh UA; a touch point marks the tablet.
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}
