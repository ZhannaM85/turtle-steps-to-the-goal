import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/app/AppShell'
import { TodayScreen } from '@/features/daily-log'
import { DashboardScreen } from '@/features/dashboard'
import { HistoryScreen } from '@/features/history'
import { GoalScreen } from '@/features/goal-setup'
import { SettingsScreen } from '@/features/settings'
import { AboutScreen } from '@/features/about'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <TodayScreen /> },
      { path: '/dashboard', element: <DashboardScreen /> },
      { path: '/history', element: <HistoryScreen /> },
      { path: '/goal', element: <GoalScreen /> },
      // #24: Export folded into Settings; redirect for anyone with the old
      // tab bookmarked rather than a dead link.
      { path: '/export', element: <Navigate to="/settings" replace /> },
      { path: '/settings', element: <SettingsScreen /> },
      { path: '/about', element: <AboutScreen /> },
    ],
  },
]

export const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL,
})
