import { beforeEach, describe, expect, it } from 'vitest'
import {
  isLocalTransferEnabled,
  useLocalTransferStore,
} from './localTransferStore'

describe('useLocalTransferStore (#738)', () => {
  beforeEach(() => {
    localStorage.clear()
    useLocalTransferStore.setState({ enabled: false })
  })

  it('defaults to off', () => {
    expect(useLocalTransferStore.getState().enabled).toBe(false)
    expect(isLocalTransferEnabled()).toBe(false)
  })

  it('turns on via setEnabled', () => {
    useLocalTransferStore.getState().setEnabled(true)
    expect(isLocalTransferEnabled()).toBe(true)
  })
})
