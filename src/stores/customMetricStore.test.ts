import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CustomMetric } from '@/domain/customMetric'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useCustomMetricStore } from './customMetricStore'

function makeMetric(overrides: Partial<CustomMetric> = {}): CustomMetric {
  return {
    id: crypto.randomUUID(),
    name: 'Push-ups',
    inputKind: 'number',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(async () => {
  await db.customMetrics.clear()
  await db.customMetricEntries.clear()
  useCustomMetricStore.setState({
    metrics: [],
    entries: [],
    status: 'idle',
    error: null,
  })
})

afterEach(async () => {
  await db.customMetrics.clear()
  await db.customMetricEntries.clear()
})

describe('useCustomMetricStore', () => {
  it('starts empty', () => {
    expect(useCustomMetricStore.getState().metrics).toEqual([])
    expect(useCustomMetricStore.getState().entries).toEqual([])
  })

  it('loadAll loads both persisted metrics and entries', async () => {
    await db.customMetrics.put(makeMetric({ name: 'Push-ups' }))
    await db.customMetricEntries.put({
      id: 'entry-1',
      metricId: 'metric-1',
      date: '2026-03-01',
      value: 10,
      updatedAt: new Date().toISOString(),
    })

    await useCustomMetricStore.getState().loadAll()

    expect(useCustomMetricStore.getState().metrics.map((m) => m.name)).toEqual([
      'Push-ups',
    ])
    expect(useCustomMetricStore.getState().entries).toHaveLength(1)
    expect(useCustomMetricStore.getState().status).toBe('ready')
  })

  it('addMetric creates a new metric', async () => {
    await useCustomMetricStore.getState().addMetric('Push-ups', 'number', 'reps')

    const metrics = useCustomMetricStore.getState().metrics
    expect(metrics).toHaveLength(1)
    expect(metrics[0]).toMatchObject({
      name: 'Push-ups',
      inputKind: 'number',
      unit: 'reps',
    })
  })

  it('deleteMetric removes the metric and cascades its entries', async () => {
    await useCustomMetricStore.getState().addMetric('Push-ups', 'number')
    const metricId = useCustomMetricStore.getState().metrics[0].id
    await useCustomMetricStore.getState().setEntryValue(metricId, '2026-03-01', 20)
    expect(useCustomMetricStore.getState().entries).toHaveLength(1)

    await useCustomMetricStore.getState().deleteMetric(metricId)

    expect(useCustomMetricStore.getState().metrics).toEqual([])
    expect(useCustomMetricStore.getState().entries).toEqual([])
  })

  it('setEntryValue creates a new entry for a metric/date pair', async () => {
    await useCustomMetricStore.getState().addMetric('Push-ups', 'number')
    const metricId = useCustomMetricStore.getState().metrics[0].id

    await useCustomMetricStore.getState().setEntryValue(metricId, '2026-03-01', 20)

    const entries = useCustomMetricStore.getState().entries
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ metricId, date: '2026-03-01', value: 20 })
  })

  it('setEntryValue overwrites, rather than duplicates, an already-logged day', async () => {
    await useCustomMetricStore.getState().addMetric('Push-ups', 'number')
    const metricId = useCustomMetricStore.getState().metrics[0].id
    await useCustomMetricStore.getState().setEntryValue(metricId, '2026-03-01', 20)

    await useCustomMetricStore.getState().setEntryValue(metricId, '2026-03-01', 30)

    const entries = useCustomMetricStore.getState().entries
    expect(entries).toHaveLength(1)
    expect(entries[0].value).toBe(30)
  })

  it('deleteEntry removes a single logged value', async () => {
    await useCustomMetricStore.getState().addMetric('Push-ups', 'number')
    const metricId = useCustomMetricStore.getState().metrics[0].id
    await useCustomMetricStore.getState().setEntryValue(metricId, '2026-03-01', 20)
    const entryId = useCustomMetricStore.getState().entries[0].id

    await useCustomMetricStore.getState().deleteEntry(entryId)

    expect(useCustomMetricStore.getState().entries).toEqual([])
  })
})
