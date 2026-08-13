import type { CSSProperties } from 'react'

/**
 * #712 — shared Recharts Tooltip settings for every ZoomableScatterSurface
 * correlation chart. Hover activation is unreliable on touch (and a zoomed
 * pan's `preventDefault` used to cancel the synthetic click); click keeps
 * the tooltip open until the next tap elsewhere.
 */
export const CORRELATION_SCATTER_TOOLTIP_TRIGGER = 'click' as const

export const CORRELATION_SCATTER_TOOLTIP_WRAPPER_STYLE = {
  pointerEvents: 'auto',
} satisfies CSSProperties
