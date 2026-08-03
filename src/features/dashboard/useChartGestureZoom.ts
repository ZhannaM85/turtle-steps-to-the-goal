import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CHART_ZOOM_MIN_SPAN,
  clampZoomWindow,
  panZoomWindow,
  zoomWindowByScale,
  type ChartZoomWindow,
} from '@/domain/stats/chartGestureZoom'

interface PinchState {
  startDistance: number
  startWindow: ChartZoomWindow
  focusRatio: number
}

interface PanState {
  startX: number
  startY: number
  startWindow: ChartZoomWindow
  widthPx: number
  moved: boolean
}

function readPointCount(el: HTMLElement): number {
  const raw = el.dataset.pointCount
  const n = raw ? Number(raw) : 0
  return Number.isFinite(n) ? n : 0
}

/**
 * #543 — pinch zoom / horizontal pan / double-tap reset for Compare Data.
 * Uses non-passive `touchmove` so pinch/pan can call `preventDefault` without
 * fighting the browser. Vertical page scroll stays free unless the gesture
 * is clearly a two-finger pinch or a mostly-horizontal pan while zoomed.
 *
 * `surfaceRef` is a callback ref so listeners attach when the chart surface
 * mounts (Compare Data often early-returns before the chart exists).
 * Point count is read from `data-point-count` on the surface element.
 */
export function useChartGestureZoom(resetKey: string) {
  const [zoomWindow, setZoomWindow] = useState<ChartZoomWindow | null>(null)
  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setZoomWindow(null)
  }

  const zoomRef = useRef(zoomWindow)
  useEffect(() => {
    zoomRef.current = zoomWindow
  }, [zoomWindow])

  const pinchRef = useRef<PinchState | null>(null)
  const panRef = useRef<PanState | null>(null)
  const lastTapRef = useRef(0)
  const cleanupRef = useRef<(() => void) | null>(null)

  const resetZoom = useCallback(() => {
    setZoomWindow(null)
  }, [])

  const surfaceRef = useCallback((el: HTMLDivElement | null) => {
    cleanupRef.current?.()
    cleanupRef.current = null
    if (!el) return

    const applyClamped = (next: ChartZoomWindow | null) => {
      const count = readPointCount(el)
      setZoomWindow(
        next ? clampZoomWindow(next, count, CHART_ZOOM_MIN_SPAN) : null,
      )
    }

    const onTouchStart = (event: TouchEvent) => {
      const count = readPointCount(el)
      if (count <= CHART_ZOOM_MIN_SPAN) return

      if (event.touches.length === 2) {
        panRef.current = null
        const a = event.touches[0]
        const b = event.touches[1]
        const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
        if (distance < 8) return
        const startWindow =
          zoomRef.current ??
          ({ startIndex: 0, endIndex: count - 1 } as ChartZoomWindow)
        const midX = (a.clientX + b.clientX) / 2
        const rect = el.getBoundingClientRect()
        const focusRatio =
          rect.width > 0
            ? Math.min(1, Math.max(0, (midX - rect.left) / rect.width))
            : 0.5
        pinchRef.current = { startDistance: distance, startWindow, focusRatio }
        return
      }

      if (event.touches.length === 1 && zoomRef.current) {
        pinchRef.current = null
        const rect = el.getBoundingClientRect()
        panRef.current = {
          startX: event.touches[0].clientX,
          startY: event.touches[0].clientY,
          startWindow: zoomRef.current,
          widthPx: Math.max(1, rect.width),
          moved: false,
        }
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      const count = readPointCount(el)

      if (event.touches.length === 2 && pinchRef.current) {
        event.preventDefault()
        const a = event.touches[0]
        const b = event.touches[1]
        const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
        if (distance < 8) return
        const { startDistance, startWindow, focusRatio } = pinchRef.current
        const scale = distance / startDistance
        applyClamped(zoomWindowByScale(startWindow, count, scale, focusRatio))
        return
      }

      if (event.touches.length === 1 && panRef.current && zoomRef.current) {
        const dx = event.touches[0].clientX - panRef.current.startX
        const dy = event.touches[0].clientY - panRef.current.startY
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) panRef.current.moved = true
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 12) return
        event.preventDefault()
        const span =
          panRef.current.startWindow.endIndex -
          panRef.current.startWindow.startIndex +
          1
        const deltaIndices = Math.round((-dx / panRef.current.widthPx) * span)
        applyClamped(
          panZoomWindow(panRef.current.startWindow, count, deltaIndices),
        )
      }
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchRef.current = null
      if (event.touches.length === 0) {
        const wasPan = panRef.current
        panRef.current = null

        if (
          event.changedTouches.length === 1 &&
          !wasPan?.moved &&
          zoomRef.current
        ) {
          const now = Date.now()
          if (now - lastTapRef.current < 320) {
            lastTapRef.current = 0
            setZoomWindow(null)
          } else {
            lastTapRef.current = now
          }
        }
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    cleanupRef.current = () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  return {
    surfaceRef,
    zoomWindow,
    isZoomed: zoomWindow !== null,
    resetZoom,
  }
}
