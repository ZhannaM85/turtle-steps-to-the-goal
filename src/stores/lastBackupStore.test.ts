import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useLastBackupStore } from './lastBackupStore'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('useLastBackupStore.backdateFirstSeenAt', () => {
  it('moves firstSeenAt earlier when the given date predates it (#599)', () => {
    useLastBackupStore.setState({ firstSeenAt: '2026-08-01T00:00:00.000Z' })

    useLastBackupStore.getState().backdateFirstSeenAt('2026-06-01T00:00:00.000Z')

    expect(useLastBackupStore.getState().firstSeenAt).toBe(
      '2026-06-01T00:00:00.000Z',
    )
  })

  it('leaves firstSeenAt unchanged when the given date is later (#599)', () => {
    useLastBackupStore.setState({ firstSeenAt: '2026-06-01T00:00:00.000Z' })

    useLastBackupStore.getState().backdateFirstSeenAt('2026-08-01T00:00:00.000Z')

    expect(useLastBackupStore.getState().firstSeenAt).toBe(
      '2026-06-01T00:00:00.000Z',
    )
  })

  it('leaves firstSeenAt unchanged when the given date is equal', () => {
    useLastBackupStore.setState({ firstSeenAt: '2026-06-01T00:00:00.000Z' })

    useLastBackupStore.getState().backdateFirstSeenAt('2026-06-01T00:00:00.000Z')

    expect(useLastBackupStore.getState().firstSeenAt).toBe(
      '2026-06-01T00:00:00.000Z',
    )
  })
})
