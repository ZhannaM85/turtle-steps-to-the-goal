import type { CSSProperties } from 'react'
import type { MouseHandlerDataParam } from 'recharts'

/**
 * #712 — shared Recharts Tooltip settings for every ZoomableScatterSurface
 * correlation chart. Hover activation is unreliable on touch (and a zoomed
 * pan's `preventDefault` used to cancel the synthetic click); click keeps
 * the tooltip open until dismissed (#713 close / empty-chart tap).
 */
export const CORRELATION_SCATTER_TOOLTIP_TRIGGER = 'click' as const

export const CORRELATION_SCATTER_TOOLTIP_WRAPPER_STYLE = {
  pointerEvents: 'auto',
} satisfies CSSProperties

/**
 * #712/#713 — force the tooltip off while pinching/panning or after an
 * explicit dismiss; otherwise leave control to Recharts.
 */
export function correlationScatterTooltipActive(
  isGesturing: boolean,
  tooltipSuppressed: boolean,
): boolean | undefined {
  return isGesturing || tooltipSuppressed ? false : undefined
}

/**
 * #713 — empty-chart tap dismisses; tapping a point clears suppression so
 * the click trigger can open (or switch) the tooltip again.
 * Recharts 3 chart `onClick` exposes `isTooltipActive` (no `activePayload`).
 */
export function handleCorrelationScatterChartClick(
  state: MouseHandlerDataParam | null | undefined,
  dismissTooltip: () => void,
  revealTooltip: () => void,
): void {
  if (state?.isTooltipActive) {
    revealTooltip()
    return
  }
  dismissTooltip()
}
