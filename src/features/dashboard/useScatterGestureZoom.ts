import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SCATTER_ZOOM_MIN_POINTS,
  clampScatterDomain,
  panScatterDomain,
  zoomScatterDomainByScale,
  type ScatterZoomDomain,
} from '@/domain/stats/scatterGestureZoom'

interface PinchState {
  startDistance: number
  startDomain: ScatterZoomDomain
  focusXRatio: number
  focusYRatio: number
}

interface PanState {
  startX: number
  startY: number
  startDomain: ScatterZoomDomain
  widthPx: number
  heightPx: number
  moved: boolean
}

/**
 * #581 — pinch zoom / 2D pan / double-tap reset for correlation scatters.
 * Domain-based (x/y ranges), not the time-series index window #543 uses.
 *
 * `fullDomain` is the padded auto domain for the current points; pass `null`
 * when there aren't enough points to zoom. `surfaceRef` is a callback ref
 * so listeners attach when the chart surface mounts.
 */
export function useScatterGestureZoom(
  resetKey: string,
  fullDomain: ScatterZoomDomain | null,
  pointCount: number,
) {
  const [zoomDomain, setZoomDomain] = useState<ScatterZoomDomain | null>(null)
  const [isGesturing, setIsGesturing] = useState(false)
  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setZoomDomain(null)
    setIsGesturing(false)
  }

  const fullKey = fullDomain
    ? `${fullDomain.xMin}|${fullDomain.xMax}|${fullDomain.yMin}|${fullDomain.yMax}`
    : ''
  const [prevFullKey, setPrevFullKey] = useState(fullKey)
  if (fullKey !== prevFullKey) {
    setPrevFullKey(fullKey)
    if (!fullDomain) {
      setZoomDomain(null)
    } else if (zoomDomain) {
      setZoomDomain(clampScatterDomain(zoomDomain, fullDomain))
    }
  }

  const zoomRef = useRef(zoomDomain)
  useEffect(() => {
    zoomRef.current = zoomDomain
  }, [zoomDomain])

  const fullRef = useRef(fullDomain)
  useEffect(() => {
    fullRef.current = fullDomain
  }, [fullDomain])

  const pinchRef = useRef<PinchState | null>(null)
  const panRef = useRef<PanState | null>(null)
  const lastTapRef = useRef(0)
  const cleanupRef = useRef<(() => void) | null>(null)

  const resetZoom = useCallback(() => {
    setZoomDomain(null)
  }, [])

  const surfaceRef = useCallback((el: HTMLDivElement | null) => {
    cleanupRef.current?.()
    cleanupRef.current = null
    if (!el) return

    const canZoom = () => {
      const full = fullRef.current
      return (
        full !== null &&
        pointCount >= SCATTER_ZOOM_MIN_POINTS &&
        full.xMax > full.xMin &&
        full.yMax > full.yMin
      )
    }

    const applyClamped = (next: ScatterZoomDomain | null) => {
      const full = fullRef.current
      if (!full) {
        setZoomDomain(null)
        return
      }
      setZoomDomain(next ? clampScatterDomain(next, full) : null)
    }

    const onTouchStart = (event: TouchEvent) => {
      if (!canZoom()) return
      const full = fullRef.current!
      const rect = el.getBoundingClientRect()

      if (event.touches.length === 2) {
        panRef.current = null
        setIsGesturing(true)
        const a = event.touches[0]
        const b = event.touches[1]
        const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
        if (distance < 8) return
        const startDomain = zoomRef.current ?? full
        const midX = (a.clientX + b.clientX) / 2
        const midY = (a.clientY + b.clientY) / 2
        const focusXRatio =
          rect.width > 0
            ? Math.min(1, Math.max(0, (midX - rect.left) / rect.width))
            : 0.5
        // Screen Y grows downward; data Y grows upward.
        const focusYRatio =
          rect.height > 0
            ? Math.min(1, Math.max(0, 1 - (midY - rect.top) / rect.height))
            : 0.5
        pinchRef.current = {
          startDistance: distance,
          startDomain,
          focusXRatio,
          focusYRatio,
        }
        return
      }

      if (event.touches.length === 1 && zoomRef.current) {
        pinchRef.current = null
        panRef.current = {
          startX: event.touches[0].clientX,
          startY: event.touches[0].clientY,
          startDomain: zoomRef.current,
          widthPx: Math.max(1, rect.width),
          heightPx: Math.max(1, rect.height),
          moved: false,
        }
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 2 && pinchRef.current && fullRef.current) {
        event.preventDefault()
        const a = event.touches[0]
        const b = event.touches[1]
        const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
        if (distance < 8) return
        const { startDistance, startDomain, focusXRatio, focusYRatio } =
          pinchRef.current
        const scale = distance / startDistance
        applyClamped(
          zoomScatterDomainByScale(
            startDomain,
            fullRef.current,
            scale,
            focusXRatio,
            focusYRatio,
          ),
        )
        return
      }

      if (event.touches.length === 1 && panRef.current && zoomRef.current) {
        const dx = event.touches[0].clientX - panRef.current.startX
        const dy = event.touches[0].clientY - panRef.current.startY
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          panRef.current.moved = true
          setIsGesturing(true)
        }
        event.preventDefault()
        const dxRatio = dx / panRef.current.widthPx
        const dyRatio = dy / panRef.current.heightPx
        applyClamped(
          panScatterDomain(
            panRef.current.startDomain,
            fullRef.current!,
            dxRatio,
            dyRatio,
          ),
        )
      }
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchRef.current = null
      if (event.touches.length === 0) {
        const wasPan = panRef.current
        panRef.current = null
        setIsGesturing(false)

        if (
          event.changedTouches.length === 1 &&
          !wasPan?.moved &&
          zoomRef.current
        ) {
          const now = Date.now()
          if (now - lastTapRef.current < 320) {
            lastTapRef.current = 0
            setZoomDomain(null)
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
  }, [pointCount])

  const activeDomain = zoomDomain ?? fullDomain

  return {
    surfaceRef,
    domain: activeDomain,
    isZoomed: zoomDomain !== null,
    isGesturing,
    resetZoom,
  }
}
