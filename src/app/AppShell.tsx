import { NavLink, Outlet } from 'react-router-dom'
import {
  Download,
  History,
  Home,
  LayoutDashboard,
  Settings,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'

const navItems: {
  to: string
  label: string
  end?: boolean
  icon: LucideIcon
}[] = [
  { to: '/', label: 'Today', end: true, icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/history', label: 'History', icon: History },
  { to: '/goal', label: 'Goal', icon: Target },
  { to: '/export', label: 'Export', icon: Download },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell() {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">
            Turtle Steps to the Goal
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

      <main className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:pb-10">
        <Outlet />
      </main>

      <nav
        aria-label="Tabs"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="flex">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors',
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
    </div>
  )
}
