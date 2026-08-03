/**
 * #564 — best-effort tap-to-focus on a live camera `MediaStreamTrack`.
 *
 * Uses Image Capture-style constrainable properties (`pointsOfInterest`,
 * `focusMode`) when the browser/device exposes them (typically Chrome on
 * Android). iOS Safari usually has no focus constraints — this is a quiet
 * no-op there rather than an error. Manual barcode entry (#291) remains
 * the fallback when focus still won't cooperate.
 */

export interface FocusPoint {
  /** Normalized 0–1 within the video element's content box. */
  x: number
  y: number
}

type ImageCaptureCapabilities = {
  focusMode?: string[]
  pointsOfInterest?: boolean
}

type FocusCapableTrack = MediaStreamTrack & {
  getCapabilities?: () => MediaTrackCapabilities & ImageCaptureCapabilities
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/**
 * Ask the camera to refocus near `(x, y)` in normalized video coordinates.
 * Returns whether any focus-related constraint was successfully applied.
 */
export async function focusVideoTrackAtPoint(
  track: MediaStreamTrack | null | undefined,
  point: FocusPoint,
): Promise<boolean> {
  if (!track || track.readyState !== 'live') return false
  if (typeof track.applyConstraints !== 'function') return false

  const capable = track as FocusCapableTrack
  const capabilities = (
    typeof capable.getCapabilities === 'function'
      ? capable.getCapabilities()
      : {}
  ) as ImageCaptureCapabilities

  const x = clamp01(point.x)
  const y = clamp01(point.y)
  const attempts: MediaTrackConstraints[] = []

  if (capabilities.pointsOfInterest) {
    attempts.push({
      // Chrome expects advanced constraints for Image Capture properties.
      advanced: [{ pointsOfInterest: [{ x, y }] } as MediaTrackConstraintSet],
    })
    if (capabilities.focusMode?.includes('single-shot')) {
      attempts.push({
        advanced: [
          {
            focusMode: 'single-shot',
            pointsOfInterest: [{ x, y }],
          } as MediaTrackConstraintSet,
        ],
      })
    }
  }

  if (capabilities.focusMode?.includes('continuous')) {
    attempts.push({
      advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
    })
  } else if (capabilities.focusMode?.includes('single-shot')) {
    attempts.push({
      advanced: [{ focusMode: 'single-shot' } as MediaTrackConstraintSet],
    })
  }

  // Last resort: some Android builds accept pointsOfInterest without
  // advertising it on getCapabilities().
  if (attempts.length === 0) {
    attempts.push({
      advanced: [{ pointsOfInterest: [{ x, y }] } as MediaTrackConstraintSet],
    })
  }

  for (const constraints of attempts) {
    try {
      await track.applyConstraints(constraints)
      return true
    } catch {
      // Try the next shape — unsupported constraints throw.
    }
  }
  return false
}

/** Video track from a `<video>` element's current `srcObject`, if any. */
export function videoTrackFromElement(
  video: HTMLVideoElement | null,
): MediaStreamTrack | null {
  const stream = video?.srcObject
  if (!stream || typeof (stream as MediaStream).getVideoTracks !== 'function') {
    return null
  }
  return (stream as MediaStream).getVideoTracks()[0] ?? null
}
