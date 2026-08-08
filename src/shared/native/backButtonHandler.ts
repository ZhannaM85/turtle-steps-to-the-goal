import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { router } from '@/app'

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
 * 3. #651 — the 5 top-level tabs (`AppShell.tsx`'s `NavLink`s) all use
 *    `replace`, so switching between them never grows real WebView
 *    history (`canGoBack` stays false on every one of them, not just
 *    Today) — reported live as "back exits from every tab, not just the
 *    home one," expected behavior being the standard bottom-nav
 *    convention (YouTube, Instagram, etc.): back returns to the home tab
 *    first, and only exits from there. Today (`/`) is this app's home
 *    tab, so any other route with no real history behind it navigates
 *    there instead of exiting.
 * 4. Only exit the app from Today itself with nothing behind it,
 *    matching standard Android UX expectations.
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
      return
    }

    if (window.location.pathname !== '/') {
      void router.navigate('/')
      return
    }

    void App.exitApp()
  })
}
