import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/**
 * #309 — Capacitor's WebView doesn't wire Android's hardware/gesture back
 * button to browser history the way a normal Chrome tab does; listening
 * for `backButton` disables Capacitor's own default handling (its default
 * is effectively "always exit"), so this fully owns the behavior:
 *
 * 1. An open Radix dialog/sheet closes first — reuses its own built-in
 *    Escape-to-close (`role="dialog"][data-state="open"]`) rather than
 *    building separate open-dialog tracking.
 * 2. Otherwise, go back through this SPA's own history (same as the
 *    in-app back arrows/`navigate(-1)` calls already do) when
 *    `canGoBack` says there's somewhere to go — this is the real native
 *    WebView history stack, not app route state, so it also correctly
 *    covers "first screen after a deep link" etc.
 * 3. Only exit the app from a true top-level screen with nothing behind
 *    it, matching standard Android UX expectations.
 */
export function initBackButtonHandler() {
  if (Capacitor.getPlatform() !== 'android') return

  void App.addListener('backButton', ({ canGoBack }) => {
    const openDialog = document.querySelector(
      '[role="dialog"][data-state="open"]',
    )
    if (openDialog) {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
      return
    }

    if (canGoBack) {
      window.history.back()
    } else {
      void App.exitApp()
    }
  })
}
