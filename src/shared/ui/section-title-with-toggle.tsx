import type { ReactNode } from 'react'
import { VisibilityToggleButton } from '@/shared/ui/visibility-toggle-button'

export interface SectionTitleWithToggleProps {
  title: string
  visible: boolean
  onToggle: () => void
  hideLabel: string
  showLabel: string
  /** An extra control to render next to the eye toggle — e.g. a
   * correlation card's own "Show chart"/chevron expand button. */
  extraAction?: ReactNode
  /** #355 — Dashboard's on-demand reorder-mode drag handle (#319), passed
   * all the way down from `DashboardScreen.tsx`'s `SortableDashboardSection`
   * through every section's own props and its `ChartTitleWithToggle` call,
   * so it renders inline beside *this* title instead of stacked above the
   * whole section — previously `SortableDashboardSection` rendered it
   * itself, above whatever the section's own first line happened to be. */
  dragHandle?: ReactNode
}

/**
 * Store-agnostic building block behind #245/#247's per-chart show/hide
 * toggle (`ChartTitleWithToggle.tsx`, which now just wires this up to
 * `dashboardChartVisibilityStore`) and #232's Today/Goal section toggles
 * (`sectionVisibilityStore`) — purely presentational, takes `visible`/
 * `onToggle` as props instead of reading any particular store itself, so
 * any page's own visibility store can drive it. Always rendered by its
 * caller regardless of the section's own visibility state (the #238
 * lesson) — the control that turns a section back on can never be the
 * thing hidden along with it.
 *
 * Only for sections with no other visible label of their own (a chart, a
 * banner) — a section built around `StatCard` instead uses the plain
 * `VisibilityToggleButton` slotted into `StatCard`'s own `action` prop
 * when visible, since `StatCard` already renders the label; this
 * component would duplicate it.
 */
export function SectionTitleWithToggle({
  title,
  visible,
  onToggle,
  hideLabel,
  showLabel,
  extraAction,
  dragHandle,
}: SectionTitleWithToggleProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {dragHandle}
        <h2 className="truncate text-sm font-medium text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {extraAction}
        <VisibilityToggleButton
          visible={visible}
          onToggle={onToggle}
          hideLabel={hideLabel}
          showLabel={showLabel}
        />
      </div>
    </div>
  )
}
