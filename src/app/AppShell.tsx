import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Heart,
  History,
  Home,
  LayoutDashboard,
  Settings,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation, type Dictionary } from '@/i18n'
import { useIsTextInputFocused } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'
import { AppUpdateBanner } from './AppUpdateBanner'
import { PullToRefreshIndicator } from './PullToRefreshIndicator'
import { RouteLoadingFallback } from './RouteLoadingFallback'

function useNavItems(t: Dictionary): {
  to: string
  label: string
  end?: boolean
  icon: LucideIcon
}[] {
  return [
    { to: '/', label: t.nav.today, end: true, icon: Home },
    { to: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { to: '/history', label: t.nav.history, icon: History },
    { to: '/goal', label: t.nav.goal, icon: Target },
    { to: '/settings', label: t.nav.settings, icon: Settings },
    { to: '/about', label: t.nav.about, icon: Heart },
  ]
}

// TEMP DEBUG (#156 follow-up) — live width readout so a real-device
// screenshot carries hard numbers, not just visual impressions. Remove
// once diagnosed.
function DebugWidthBadge() {
  const [info, setInfo] = useState('')
  useEffect(() => {
    function update() {
      setInfo(
        `vw=${window.innerWidth} scrollW=${document.documentElement.scrollWidth} dpr=${window.devicePixelRatio}`,
      )
    }
    update()
    window.addEventListener('resize', update)
    const interval = setInterval(update, 500)
    return () => {
      window.removeEventListener('resize', update)
      clearInterval(interval)
    }
  }, [])
  return (
    <div className="fixed top-0 left-0 z-50 bg-red-600 px-2 py-1 text-xs font-bold text-white">
      {info}
    </div>
  )
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

  return (
    <div className="min-h-svh bg-background">
      <DebugWidthBadge />
      <PullToRefreshIndicator />
      <AppUpdateBanner />
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
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

      {/* TEMP DEBUG (#156 follow-up) — bright outline on the page's own
       * content container, remove once diagnosed. */}
      <main className="mx-auto max-w-3xl px-4 py-6 pb-32 outline outline-4 outline-orange-500 sm:pb-10">
        {/* #102: every non-Today route is now lazy-loaded (see router.tsx)
         * — this single boundary covers all of them, so a route doesn't
         * need its own Suspense wiring. */}
        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>

      {/* Taller tap targets + horizontal safe-area padding (#112) — the
       * original min-h-14 bar sat flush against the screen edges
       * (inset-x-0, no side padding at all beyond the bottom safe-area
       * inset), so the leftmost/rightmost tabs read as cut off on devices
       * with rounded corners or side gesture areas. */}
      {!isTextInputFocused && (
        <nav
          aria-label="Tabs"
          className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] sm:hidden"
        >
          <ul className="flex px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to} className="flex-1">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        // #112 originally bumped this to min-h-[106px] (+50px
                        // from the pre-#112 56px) for bigger tap targets, but
                        // seen live that read as an oversized empty gap above
                        // the icons (#119) — min-h-20 (80px, +24px) keeps a
                        // meaningfully bigger target without the gap.
                        'flex min-h-20 flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors',
                        isActive && 'text-foreground',
                      )
                    }
                  >
                    <Icon aria-hidden="true" className="size-5" />
                    {item.label}
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
