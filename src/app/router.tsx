import type { RouteObject } from 'react-router-dom'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/app/AppShell'
import { RouteErrorFallback } from '@/app/RouteErrorFallback'
import { TodayScreen } from '@/features/daily-log'
import {
  AboutScreen,
  DashboardScreen,
  FoodListSettingsScreen,
  GoalScreen,
  HistoryScreen,
  MealEditScreen,
  RecipesSettingsScreen,
  SettingsScreen,
} from './lazyRoutes'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    // #102: catches uncaught render errors anywhere below AppShell — React
    // Router wraps the whole route subtree in an error boundary when
    // errorElement is set, so a crash shows RouteErrorFallback instead of
    // silently unmounting to a blank screen.
    errorElement: <RouteErrorFallback />,
    children: [
      { path: '/', element: <TodayScreen /> },
      { path: '/dashboard', element: <DashboardScreen /> },
      { path: '/history', element: <HistoryScreen /> },
      { path: '/goal', element: <GoalScreen /> },
      // #157: dedicated single-meal edit route, replacing #145's inline
      // expand-in-place — reached from a meal's pencil on Today/History.
      { path: '/entry/:date/meal/:mealId', element: <MealEditScreen /> },
      // #24: Export folded into Settings; redirect for anyone with the old
      // tab bookmarked rather than a dead link.
      { path: '/export', element: <Navigate to="/settings" replace /> },
      { path: '/settings', element: <SettingsScreen /> },
      { path: '/settings/foods', element: <FoodListSettingsScreen /> },
      { path: '/settings/recipes', element: <RecipesSettingsScreen /> },
      { path: '/about', element: <AboutScreen /> },
    ],
  },
]

export const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL,
})
