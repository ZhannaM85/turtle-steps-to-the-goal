import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  focusVideoTrackAtPoint,
  videoTrackFromElement,
} from './focusVideoTrackAtPoint'

afterEach(() => {
  vi.restoreAllMocks()
})

function makeTrack(
  overrides: Partial<{
    readyState: MediaStreamTrackState
    capabilities: Record<string, unknown>
    applyConstraints: ReturnType<typeof vi.fn>
  }> = {},
): MediaStreamTrack {
  const applyConstraints =
    overrides.applyConstraints ?? vi.fn().mockResolvedValue(undefined)
  return {
    readyState: overrides.readyState ?? 'live',
    applyConstraints,
    getCapabilities: () => overrides.capabilities ?? {},
  } as unknown as MediaStreamTrack
}

describe('focusVideoTrackAtPoint (#564)', () => {
  it('returns false when there is no live track', async () => {
    expect(await focusVideoTrackAtPoint(null, { x: 0.5, y: 0.5 })).toBe(false)
    expect(
      await focusVideoTrackAtPoint(makeTrack({ readyState: 'ended' }), {
        x: 0.5,
        y: 0.5,
      }),
    ).toBe(false)
  })

  it('applies pointsOfInterest when the device advertises it', async () => {
    const applyConstraints = vi.fn().mockResolvedValue(undefined)
    const track = makeTrack({
      capabilities: { pointsOfInterest: true, focusMode: ['continuous'] },
      applyConstraints,
    })

    await expect(
      focusVideoTrackAtPoint(track, { x: 0.25, y: 0.75 }),
    ).resolves.toBe(true)

    expect(applyConstraints).toHaveBeenCalledWith({
      advanced: [{ pointsOfInterest: [{ x: 0.25, y: 0.75 }] }],
    })
  })

  it('clamps normalized coordinates to 0–1', async () => {
    const applyConstraints = vi.fn().mockResolvedValue(undefined)
    const track = makeTrack({
      capabilities: { pointsOfInterest: true },
      applyConstraints,
    })

    await focusVideoTrackAtPoint(track, { x: -0.2, y: 1.4 })

    expect(applyConstraints).toHaveBeenCalledWith({
      advanced: [{ pointsOfInterest: [{ x: 0, y: 1 }] }],
    })
  })

  it('falls back to continuous focusMode when pointsOfInterest fails', async () => {
    const applyConstraints = vi
      .fn()
      .mockRejectedValueOnce(new Error('unsupported'))
      .mockResolvedValueOnce(undefined)
    const track = makeTrack({
      capabilities: {
        pointsOfInterest: true,
        focusMode: ['continuous'],
      },
      applyConstraints,
    })

    await expect(
      focusVideoTrackAtPoint(track, { x: 0.5, y: 0.5 }),
    ).resolves.toBe(true)

    expect(applyConstraints).toHaveBeenCalledTimes(2)
    expect(applyConstraints).toHaveBeenLastCalledWith({
      advanced: [{ focusMode: 'continuous' }],
    })
  })

  it('returns false when every constraint shape is rejected', async () => {
    const applyConstraints = vi.fn().mockRejectedValue(new Error('nope'))
    const track = makeTrack({
      capabilities: { focusMode: ['continuous'] },
      applyConstraints,
    })

    await expect(
      focusVideoTrackAtPoint(track, { x: 0.5, y: 0.5 }),
    ).resolves.toBe(false)
  })
})

describe('videoTrackFromElement (#564)', () => {
  it('reads the first video track from srcObject', () => {
    const track = makeTrack()
    const stream = {
      getVideoTracks: () => [track],
    } as unknown as MediaStream
    const video = { srcObject: stream } as HTMLVideoElement

    expect(videoTrackFromElement(video)).toBe(track)
  })

  it('returns null without a MediaStream srcObject', () => {
    expect(videoTrackFromElement(null)).toBeNull()
    expect(
      videoTrackFromElement({ srcObject: null } as HTMLVideoElement),
    ).toBeNull()
  })
})
