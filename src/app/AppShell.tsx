import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'

const navItems = [
  { to: '/', label: 'Today', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history', label: 'History' },
  { to: '/goal', label: 'Goal' },
  { to: '/export', label: 'Export' },
  { to: '/settings', label: 'Settings' },
]

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-4 py-6">
      <nav aria-label="Main">
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
      <main>
        <Outlet />
      </main>
    </div>
  )
}
