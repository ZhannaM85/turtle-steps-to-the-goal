import { Suspense, useEffect, useRef } from 'react'
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
import { DaySnippetImportHost } from '@/features/local-transfer/DaySnippetImportHost'
import { useTranslation, type Dictionary } from '@/i18n'
import { scrollAppToTop } from '@/shared/lib/appScroll'
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
  // #974: keep the bottom tab bar always mounted, matching my-money.
  // Do not hide or unmount it from visualViewport shrink or text-input
  // focus. Soft-keyboard overlap is an accepted tradeoff; dialogs already
  // use dvh + overflow scroll so fields stay reachable.
  //
  // #970: do not `position: fixed; bottom: 0` the tab bar. On iOS PWA
  // resume, WebKit can leave visualViewport shortened so a fixed bar
  // anchors mid-page over Day content. my-money pins the bar in a flex
  // column (`shrink-0`, inner `#main-content` scrollport, html/body/#root
  // overflow hidden). The shell fills the layout viewport (`h-full` of
  // those 100% roots) rather than 100dvh, so a stale visualViewport
  // cannot leave the footer floating.

  // #185: React Router doesn't reset scroll position on navigation by
  // default (unlike a traditional multi-page site) — landing on a new,
  // shorter route while still scrolled from the previous page put the
  // new content mid-page or past it entirely.
  // pathname only (not the full location) — a search-param-only change
  // like History's own filters shouldn't jump the page back to the top.
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const main = mainRef.current
    if (main) main.scrollTop = 0
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <PullToRefreshIndicator />
      <OfflineBanner />
      <AppUpdateBanner />
      <header className="relative shrink-0 border-b border-border bg-background">
        {/* #979 — iOS only auto-scrolls the document on a status-bar tap.
         * After #970 the document does not scroll, so this control covers
         * the header including the safe-area strip (my-money's header
         * button). Desktop tab links sit above it and stay clickable. */}
        <button
          type="button"
          data-testid="scroll-to-top"
          aria-label={t.nav.scrollToTop}
          onClick={() => scrollAppToTop()}
          className="absolute inset-0 cursor-pointer"
        />
        {/* #308: the native shell's status bar now overlays the WebView
         * (Android 15+ enforces edge-to-edge, can't opt out) — without this
         * top safe-area padding, the status bar's clock/icons drew directly
         * on top of the app name text instead of above it. */}
        <div className="pointer-events-none relative z-10 mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
          <span className="text-sm font-semibold text-foreground">
            {t.nav.appName}
          </span>
          <nav
            aria-label="Main"
            className="pointer-events-auto relative z-10 hidden sm:block"
          >
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

      <main
        ref={mainRef}
        id="main-content"
        className="relative mx-auto flex w-full min-h-0 min-w-0 max-w-3xl flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-x-none px-4"
      >
        {/*
          Vertical padding must not live on the scrollport — sticky page
          chrome (#910) would leave a gap under the app header where
          scrolling content bled through (same as my-money #217).
        */}
        <div className="flex min-h-0 w-full flex-1 flex-col pt-6">
          {/* #102: every non-Today route is now lazy-loaded (see router.tsx)
           * — this single boundary covers all of them, so a route doesn't
           * need its own Suspense wiring. */}
          <Suspense fallback={<RouteLoadingFallback />}>
            <Outlet />
          </Suspense>
          <div
            data-testid="main-bottom-inset"
            className="h-8 shrink-0 sm:h-10"
            aria-hidden="true"
          />
        </div>
        {/* #661 — shared-food deep link + import dialogs (Settings opens entry). */}
        <SharedFoodImportHost />
        <DaySnippetImportHost />
      </main>

      {/* Taller tap targets + horizontal safe-area padding (#112) — the
       * original min-h-14 bar sat flush against the screen edges
       * (inset-x-0, no side padding at all beyond the bottom safe-area
       * inset), so the leftmost/rightmost tabs read as cut off on devices
       * with rounded corners or side gesture areas. */}
      <nav
        aria-label="Tabs"
        className="relative z-10 shrink-0 border-t border-border bg-background pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] sm:hidden"
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
    </div>
  )
}
