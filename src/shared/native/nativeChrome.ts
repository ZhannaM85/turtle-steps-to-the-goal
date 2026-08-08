import { Capacitor, registerPlugin } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

/**
 * `@capacitor/status-bar`'s background/overlay APIs are documented as
 * unavailable on Android 15+, and it has no navigation-bar equivalent at
 * all — Android's own `WindowInsetsControllerCompat` handles both bars'
 * icon color uniformly instead (`MainActivity.java` makes both bars
 * transparent once, natively, so this only needs to track icon
 * light/dark). Small custom native plugin, no third-party dependency,
 * following Capacitor's own documented pattern for native code that
 * doesn't warrant a published package.
 */
interface ThemeBridgePlugin {
  setSystemBarsLight(options: { light: boolean }): Promise<void>
}

const ThemeBridge = registerPlugin<ThemeBridgePlugin>('ThemeBridge')

/**
 * #308 — keeps the native status bar (iOS) or both system bars (Android,
 * via the custom plugin above) in sync with the app's own resolved
 * light/dark state. No-op on web — `Capacitor.isNativePlatform()` guards
 * every native call, since none of these plugins have a meaningful web
 * implementation.
 *
 * Deliberately doesn't set an explicit background *color* per mood (5
 * moods × 2 schemes = 10 combinations to keep in sync): both bars are
 * transparent, so the app's own `--background` shows through and tracks
 * every mood automatically with no per-mood native code.
 */
export function applyNativeChromeTheme(isDark: boolean) {
  if (!Capacitor.isNativePlatform()) return

  if (Capacitor.getPlatform() === 'android') {
    void ThemeBridge.setSystemBarsLight({ light: !isDark }).catch(() => {})
    return
  }

  // iOS: no navigation-bar concept (home indicator is safe-area, not a
  // themeable system bar), so the official plugin alone is enough.
  void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
  void StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(
    () => {},
  )
}
