import 'fake-indexeddb/auto'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useCustomCorrelationStore, useCustomMetricStore } from '@/stores'
import { CustomMetricsScreen } from './CustomMetricsScreen'

beforeEach(async () => {
  await db.customMetrics.clear()
  await db.customMetricEntries.clear()
  await db.customCorrelations.clear()
  useCustomMetricStore.setState({ metrics: [], entries: [], status: 'idle', error: null })
  useCustomCorrelationStore.setState({
    correlations: [],
    status: 'idle',
    error: null,
  })
})

afterEach(async () => {
  await db.customMetrics.clear()
  await db.customMetricEntries.clear()
  await db.customCorrelations.clear()
})

function renderScreen() {
  return render(<CustomMetricsScreen />, { wrapper: MemoryRouter })
}

describe('CustomMetricsScreen', () => {
  it('shows empty states with nothing defined yet', async () => {
    renderScreen()

    expect(await screen.findByText('No custom metrics yet.')).toBeInTheDocument()
    expect(screen.getByText('No custom correlations yet.')).toBeInTheDocument()
  })

  it('creates a new number-kind metric end to end', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: '+ Add metric' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Push-ups')
    await user.type(within(dialog).getByLabelText('Unit (optional)'), 'reps')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Push-ups')).toBeInTheDocument()
    await waitFor(async () =>
      expect((await db.customMetrics.toArray())[0]).toMatchObject({
        name: 'Push-ups',
        inputKind: 'number',
        unit: 'reps',
      }),
    )
  })

  it('creates a boolean-kind metric', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: '+ Add metric' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Training session')
    // ToggleGroupItem renders `role="radio"` (a radiogroup), not a button.
    await user.click(within(dialog).getByRole('radio', { name: 'Yes / No' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Training session')).toBeInTheDocument()
    await waitFor(async () =>
      expect((await db.customMetrics.toArray())[0]).toMatchObject({
        name: 'Training session',
        inputKind: 'boolean',
      }),
    )
  })

  // Per-date value entry (including the #363 note field) moved to
  // CustomMetricLogSection.tsx (#362) — see that file's own test.

  it('deletes a metric, removing it from the list and the database', async () => {
    await db.customMetrics.put({
      id: 'metric-1',
      name: 'Push-ups',
      inputKind: 'number',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    renderScreen()

    await screen.findByText('Push-ups')
    await user.click(screen.getByRole('button', { name: 'Delete Push-ups' }))

    await waitFor(() =>
      expect(screen.queryByText('Push-ups')).not.toBeInTheDocument(),
    )
    expect(await db.customMetrics.toArray()).toEqual([])
  })

  it('shows a note pointing to Today once a metric is defined', async () => {
    await db.customMetrics.put({
      id: 'metric-1',
      name: 'Push-ups',
      inputKind: 'number',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    renderScreen()

    expect(
      await screen.findByText("Log today's values from the Day screen."),
    ).toBeInTheDocument()
  })

  it('creates a correlation between a custom metric and a built-in one', async () => {
    await db.customMetrics.put({
      id: 'metric-1',
      name: 'Push-ups',
      inputKind: 'number',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    useCustomMetricStore.setState({
      metrics: [
        {
          id: 'metric-1',
          name: 'Push-ups',
          inputKind: 'number',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })
    const user = userEvent.setup()
    renderScreen()

    await screen.findByText('Push-ups')
    await user.click(screen.getByRole('button', { name: '+ Add correlation' }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(
      within(dialog).getByLabelText('First metric'),
      'Push-ups',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/Push-ups vs\./)).toBeInTheDocument()
    await waitFor(async () =>
      expect((await db.customCorrelations.toArray())[0]).toMatchObject({
        metricA: { kind: 'custom', metricId: 'metric-1' },
      }),
    )
  })

  it('deletes a correlation', async () => {
    await db.customCorrelations.put({
      id: 'correlation-1',
      metricA: { kind: 'builtin', key: 'weight' },
      metricB: { kind: 'builtin', key: 'calories' },
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    renderScreen()

    const name = await screen.findByText(/vs\./)
    await user.click(
      screen.getByRole('button', { name: `Delete ${name.textContent}` }),
    )

    await waitFor(() => expect(screen.queryByText(/vs\./)).not.toBeInTheDocument())
    expect(await db.customCorrelations.toArray()).toEqual([])
  })
})
