import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/app/AppShell'
import { TodayScreen } from '@/features/daily-log'
import { DashboardScreen } from '@/features/dashboard'
import { HistoryScreen } from '@/features/history'
import { GoalScreen } from '@/features/goal-setup'
import { ExportScreen } from '@/features/export'
import { SettingsScreen } from '@/features/settings'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <TodayScreen /> },
      { path: '/dashboard', element: <DashboardScreen /> },
      { path: '/history', element: <HistoryScreen /> },
      { path: '/goal', element: <GoalScreen /> },
      { path: '/export', element: <ExportScreen /> },
      { path: '/settings', element: <SettingsScreen /> },
    ],
  },
]

export const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL,
})
