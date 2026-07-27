import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useCustomCorrelationStore } from './customCorrelationStore'

beforeEach(async () => {
  await db.customCorrelations.clear()
  useCustomCorrelationStore.setState({
    correlations: [],
    status: 'idle',
    error: null,
  })
})

afterEach(async () => {
  await db.customCorrelations.clear()
})

describe('useCustomCorrelationStore', () => {
  it('starts empty', () => {
    expect(useCustomCorrelationStore.getState().correlations).toEqual([])
  })

  it('addCorrelation creates a new correlation', async () => {
    await useCustomCorrelationStore
      .getState()
      .addCorrelation('Acne vs. carbs', { kind: 'custom', metricId: 'metric-1' }, {
        kind: 'builtin',
        key: 'carbs',
      })

    const correlations = useCustomCorrelationStore.getState().correlations
    expect(correlations).toHaveLength(1)
    expect(correlations[0]).toMatchObject({
      name: 'Acne vs. carbs',
      metricA: { kind: 'custom', metricId: 'metric-1' },
      metricB: { kind: 'builtin', key: 'carbs' },
    })
  })

  it('deleteCorrelation removes a correlation by id', async () => {
    await useCustomCorrelationStore
      .getState()
      .addCorrelation(undefined, { kind: 'builtin', key: 'weight' }, {
        kind: 'builtin',
        key: 'calories',
      })
    const id = useCustomCorrelationStore.getState().correlations[0].id

    await useCustomCorrelationStore.getState().deleteCorrelation(id)

    expect(useCustomCorrelationStore.getState().correlations).toEqual([])
  })

  it('deleteCorrelationsReferencingMetric removes only correlations touching that metric', async () => {
    const store = useCustomCorrelationStore.getState()
    await store.addCorrelation(undefined, { kind: 'custom', metricId: 'metric-1' }, {
      kind: 'builtin',
      key: 'weight',
    })
    await store.addCorrelation(undefined, { kind: 'builtin', key: 'weight' }, {
      kind: 'custom',
      metricId: 'metric-1',
    })
    await store.addCorrelation(undefined, { kind: 'builtin', key: 'weight' }, {
      kind: 'builtin',
      key: 'calories',
    })

    await useCustomCorrelationStore
      .getState()
      .deleteCorrelationsReferencingMetric('metric-1')

    const remaining = useCustomCorrelationStore.getState().correlations
    expect(remaining).toHaveLength(1)
    expect(remaining[0].metricA).toEqual({ kind: 'builtin', key: 'weight' })
    expect(remaining[0].metricB).toEqual({ kind: 'builtin', key: 'calories' })
  })
})
