import { Suspense, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  History,
  Home,
  LayoutDashboard,
  Settings,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { SharedFoodImportHost } from '@/features/food-share'
import { useTranslation, type Dictionary } from '@/i18n'
import { useIsTextInputFocused, useVisualViewportShrunk } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { AppUpdateBanner } from './AppUpdateBanner'
import { OfflineBanner } from './OfflineBanner'
import { PullToRefreshIndicator } from './PullToRefreshIndicator'
import { RouteLoadingFallback } from './RouteLoadingFallback'

function useNavItems(t: Dictionary): {
  to: string
  label: string
  end?: boolean
  icon: LucideIcon
}[] {
  // #234: About dropped from the nav itself (6 tabs read as too crowded on
  // mobile) — reachable from a new card in Settings instead
  // (SettingsScreen.tsx), and still directly reachable at /about.
  return [
    { to: '/', label: t.nav.today, end: true, icon: Home },
    { to: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/history', label: t.nav.history, icon: History },
    { to: '/goal', label: t.nav.goal, icon: Target },
    { to: '/settings', label: t.nav.settings, icon: Settings },
  ]
}

export function AppShell() {
  const t = useTranslation()
  const navItems = useNavItems(t)
  // Hides the fixed bottom tab bar while a text input is focused (#120) —
  // iOS Safari's on-screen keyboard is known to make `position: fixed`
  // elements render at an unpredictable spot relative to the (shrunk)
  // visual viewport rather than staying pinned to the bottom, which read
  // as the bar "floating" mid-page. Sidesteps that WebKit quirk entirely
  // rather than trying to fight it — the bar can't usefully be tapped
  // while the keyboard covers most of the screen anyway.
  const isTextInputFocused = useIsTextInputFocused()
  // #188: focus tracking alone catches the instant a field gains/loses
  // focus, but the keyboard's own open/close animation can still be
  // mid-transition (visual viewport not yet resized) for a moment after
  // that — this widens the same #120 mitigation to also hide the bar for
  // as long as the viewport itself actually reads as shrunk, regardless
  // of focus state.
  const isViewportShrunk = useVisualViewportShrunk()
  const hideTabBar = isTextInputFocused || isViewportShrunk

  // #185: React Router doesn't reset scroll position on navigation by
  // default (unlike a traditional multi-page site) — landing on a new,
  // shorter route while still scrolled from the previous page put the
  // new content mid-page or past it entirely.
  // pathname only (not the full location) — a search-param-only change
  // like History's own filters shouldn't jump the page back to the top.
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-svh bg-background">
      <PullToRefreshIndicator />
      <OfflineBanner />
      <AppUpdateBanner />
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        {/* #308: the native shell's status bar now overlays the WebView
         * (Android 15+ enforces edge-to-edge, can't opt out) — without this
         * top safe-area padding, the status bar's clock/icons drew directly
         * on top of the app name text instead of above it. */}
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
          <span className="text-sm font-semibold text-foreground">
            {t.nav.appName}
          </span>
          <nav aria-label="Main" className="hidden sm:block">
            <ul className="flex flex-wrap gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    // #309: the 5 top-level tabs are peers, not a drill-down
                    // stack — without `replace`, hopping between tabs kept
                    // pushing new history entries, so the native Android
                    // back button (which reads the real WebView history)
                    // walked through old tab visits instead of exiting from
                    // whichever tab you're currently on.
                    replace
                    className={({ isActive }) =>
                      cn(
                        'inline-flex rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                        isActive && 'bg-muted text-foreground',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-32 sm:pb-10">
        {/* #102: every non-Today route is now lazy-loaded (see router.tsx)
         * — this single boundary covers all of them, so a route doesn't
         * need its own Suspense wiring. */}
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>

      {/* #661 — shared-food deep link + import dialogs (Settings opens entry). */}
      <SharedFoodImportHost />

      {/* Taller tap targets + horizontal safe-area padding (#112) — the
       * original min-h-14 bar sat flush against the screen edges
       * (inset-x-0, no side padding at all beyond the bottom safe-area
       * inset), so the leftmost/rightmost tabs read as cut off on devices
       * with rounded corners or side gesture areas. */}
      {!hideTabBar && (
        <nav
          aria-label="Tabs"
          className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] sm:hidden"
        >
          {/* #493 — px-4 matches main's horizontal padding so edge tabs
           * align with content cards; was px-2 and read as wider. */}
          <ul className="flex px-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to} className="flex-1">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    replace
                    className="flex min-h-20 flex-col items-center justify-center text-xs font-medium"
                  >
                    {({ isActive }) => (
                      // #493 — keep the tall tap target on the link, but
                      // paint the selected treatment on an inner pill
                      // around icon+label only (not a full-height slab).
                      <span
                        className={cn(
                          'inline-flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 transition-colors',
                          isActive
                            ? 'bg-muted text-primary'
                            : 'text-muted-foreground',
                        )}
                      >
                        <Icon aria-hidden="true" className="size-5" />
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </div>
  )
}
