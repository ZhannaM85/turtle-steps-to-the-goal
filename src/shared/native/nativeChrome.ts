import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'

/**
 * #308/#648 — keeps the native status bar and navigation bar (both
 * platforms, both bars, one call — `bar` omitted applies to both) in sync
 * with the app's own resolved light/dark state.
 *
 * Uses `@capacitor/core`'s built-in `SystemBars` plugin (Capacitor 8+, no
 * separate install) rather than `@capacitor/status-bar` or a custom
 * native plugin — the previous approach (#308) hand-rolled a
 * `ThemeBridgePlugin.java` for Android's navigation-bar icon color since
 * `@capacitor/status-bar` has no navigation-bar API at all, not realizing
 * Capacitor core already ships exactly this, cross-platform, built in.
 * `SystemBars` is also the source of #648's harmless-looking cold-boot
 * console error ("Cannot read properties of null") — its `insetsHandling:
 * 'css'` default fallback-injects `--safe-area-inset-*` custom properties
 * for old WebView versions without real `env()` safe-area support, which
 * this app doesn't consume (real `env()` support confirmed on-device via
 * #308's `viewport-fit=cover` fix). Deliberately left at its default
 * rather than set to `'disable'`: that also turns off the *real*
 * inset-passthrough/keyboard-padding logic the plugin uses on modern
 * WebView, not just the CSS fallback — not worth the regression risk to
 * #308's confirmed-working safe-area behavior just to silence a benign
 * console message.
 *
 * No-op on web — `Capacitor.isNativePlatform()` guards the call, even
 * though `SystemBarsPluginWeb` exists, since there's no native chrome to
 * theme in a browser tab.
 */
export function applyNativeChromeTheme(isDark: boolean) {
  if (!Capacitor.isNativePlatform()) return

  void SystemBars.setStyle({
    style: isDark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
  }).catch(() => {})
}
