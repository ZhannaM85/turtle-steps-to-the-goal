import { lazy } from 'react'

// #102: route-based code splitting. The production bundle was previously a
// single ~1.3MB (380KB gzipped) JS file that had to fully download, parse,
// and execute before *any* route could paint, regardless of which screen
// was actually being opened — a plausible contributor to the slow cold
// load reported through the iOS home-screen shortcut. Today stays eagerly
// imported in router.tsx since it's the default route and would need to
// load immediately either way; every other screen is its own chunk here,
// fetched on first visit. AppShell wraps the routed content in a single
// Suspense boundary, so no per-route fallback wiring is needed.
//
// Split into its own file (rather than living in router.tsx) because
// react-refresh/only-export-components flags a file that exports both
// components and non-component values (router.tsx also exports `routes`
// and `router`).
export const DashboardScreen = lazy(() =>
  import('@/features/dashboard').then((m) => ({
    default: m.DashboardScreen,
  })),
)
export const HistoryScreen = lazy(() =>
  import('@/features/history').then((m) => ({ default: m.HistoryScreen })),
)
export const GoalScreen = lazy(() =>
  import('@/features/goal-setup').then((m) => ({ default: m.GoalScreen })),
)
export const SettingsScreen = lazy(() =>
  import('@/features/settings').then((m) => ({ default: m.SettingsScreen })),
)
export const FoodListSettingsScreen = lazy(() =>
  import('@/features/settings').then((m) => ({
    default: m.FoodListSettingsScreen,
  })),
)
export const AboutScreen = lazy(() =>
  import('@/features/about').then((m) => ({ default: m.AboutScreen })),
)
