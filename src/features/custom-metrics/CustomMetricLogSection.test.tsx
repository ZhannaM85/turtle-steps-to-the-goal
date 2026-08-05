import 'fake-indexeddb/auto'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useCustomMetricStore } from '@/stores'
import { CustomMetricLogSection } from './CustomMetricLogSection'

beforeEach(async () => {
  await db.customMetrics.clear()
  await db.customMetricEntries.clear()
  useCustomMetricStore.setState({ metrics: [], entries: [], status: 'idle', error: null })
})

afterEach(async () => {
  await db.customMetrics.clear()
  await db.customMetricEntries.clear()
})

describe('CustomMetricLogSection', () => {
  it('renders nothing when no metrics are defined', async () => {
    const { container } = render(<CustomMetricLogSection date="2026-03-01" />)

    // Give loadAll's effect a chance to resolve before asserting emptiness.
    await waitFor(() => expect(useCustomMetricStore.getState().status).toBe('ready'))
    expect(container).toBeEmptyDOMElement()
  })

  it('logs a boolean-kind value for the given date', async () => {
    await db.customMetrics.put({
      id: 'metric-1',
      name: 'Training session',
      inputKind: 'boolean',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    render(<CustomMetricLogSection date="2026-03-01" />)

    await user.click(
      within(await screen.findByLabelText('Training session')).getByRole(
        'radio',
        { name: 'Yes' },
      ),
    )

    await waitFor(async () => {
      const entries = await db.customMetricEntries.toArray()
      expect(entries[0]).toMatchObject({ date: '2026-03-01', value: 1 })
    })
  })

  it('shows a note field only once a value is logged, and persists it (#363)', async () => {
    await db.customMetrics.put({
      id: 'metric-1',
      name: 'Acne',
      inputKind: 'scale5',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    render(<CustomMetricLogSection date="2026-03-01" />)

    await screen.findByLabelText('Acne')
    expect(screen.queryByLabelText('Note')).not.toBeInTheDocument()

    await user.click(
      within(screen.getByLabelText('Acne')).getByRole('radio', {
        name: 'Rate 3 out of 5',
      }),
    )

    const noteInput = await screen.findByLabelText('Note')
    await user.type(noteInput, 'started a new skincare product')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    await waitFor(async () => {
      const entries = await db.customMetricEntries.toArray()
      expect(entries[0]).toMatchObject({
        date: '2026-03-01',
        value: 3,
        note: 'started a new skincare product',
      })
    })
  })

  it('does not save the note on blur alone, since there was no visible confirmation it had (#364)', async () => {
    await db.customMetrics.put({
      id: 'metric-1',
      name: 'Acne',
      inputKind: 'scale5',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    render(<CustomMetricLogSection date="2026-03-01" />)

    await user.click(
      within(await screen.findByLabelText('Acne')).getByRole('radio', {
        name: 'Rate 3 out of 5',
      }),
    )
    const noteInput = await screen.findByLabelText('Note')
    await user.type(noteInput, 'started a new skincare product')
    await user.tab()

    const entries = await db.customMetricEntries.toArray()
    expect(entries[0].note).toBeUndefined()
  })

  it('shows the already-logged value and note for the given date', async () => {
    await db.customMetrics.put({
      id: 'metric-1',
      name: 'Push-ups',
      inputKind: 'number',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    await db.customMetricEntries.put({
      id: 'entry-1',
      metricId: 'metric-1',
      date: '2026-03-01',
      value: 20,
      note: 'felt strong',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    render(<CustomMetricLogSection date="2026-03-01" />)

    expect(await screen.findByLabelText('Push-ups')).toHaveValue('20')
    // An already-saved note starts in read mode (#364 reopened), not the
    // editable Input — matching the day note's own read/edit-mode toggle.
    expect(await screen.findByText('felt strong')).toBeInTheDocument()
    expect(screen.queryByLabelText('Note')).not.toBeInTheDocument()
  })

  it('reopens an already-saved note for editing via its pencil button (#364)', async () => {
    await db.customMetrics.put({
      id: 'metric-1',
      name: 'Push-ups',
      inputKind: 'number',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    await db.customMetricEntries.put({
      id: 'entry-1',
      metricId: 'metric-1',
      date: '2026-03-01',
      value: 20,
      note: 'felt strong',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    render(<CustomMetricLogSection date="2026-03-01" />)

    await user.click(await screen.findByRole('button', { name: 'Edit note' }))
    const noteInput = await screen.findByLabelText('Note')
    expect(noteInput).toHaveValue('felt strong')
    await user.clear(noteInput)
    await user.type(noteInput, 'even stronger now')
    await user.click(screen.getByRole('button', { name: 'Save note' }))

    expect(await screen.findByText('even stronger now')).toBeInTheDocument()
    await waitFor(async () => {
      const entries = await db.customMetricEntries.toArray()
      expect(entries[0].note).toBe('even stronger now')
    })
  })

  it('cancels editing an already-saved note without persisting the change (#437)', async () => {
    await db.customMetrics.put({
      id: 'metric-1',
      name: 'Push-ups',
      inputKind: 'number',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    await db.customMetricEntries.put({
      id: 'entry-1',
      metricId: 'metric-1',
      date: '2026-03-01',
      value: 20,
      note: 'felt strong',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    render(<CustomMetricLogSection date="2026-03-01" />)

    await user.click(await screen.findByRole('button', { name: 'Edit note' }))
    const noteInput = await screen.findByLabelText('Note')
    await user.clear(noteInput)
    await user.type(noteInput, 'a change I want to discard')
    await user.click(
      screen.getByRole('button', { name: 'Cancel editing note' }),
    )

    expect(await screen.findByText('felt strong')).toBeInTheDocument()
    expect(
      screen.queryByText('a change I want to discard'),
    ).not.toBeInTheDocument()
    const entries = await db.customMetricEntries.toArray()
    expect(entries[0].note).toBe('felt strong')
  })

  it('closes a brand-new note without saving via Cancel (#619)', async () => {
    await db.customMetrics.put({
      id: 'metric-1',
      name: 'Push-ups',
      inputKind: 'number',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    await db.customMetricEntries.put({
      id: 'entry-1',
      metricId: 'metric-1',
      date: '2026-03-01',
      value: 20,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    render(<CustomMetricLogSection date="2026-03-01" />)

    const noteInput = await screen.findByLabelText('Note')
    await user.type(noteInput, 'a draft I never meant to save')
    await user.click(
      screen.getByRole('button', { name: 'Cancel editing note' }),
    )

    expect(screen.queryByLabelText('Note')).not.toBeInTheDocument()
    expect(
      screen.queryByText('a draft I never meant to save'),
    ).not.toBeInTheDocument()
    const entries = await db.customMetricEntries.toArray()
    expect(entries[0].note).toBeUndefined()
  })

  it('shows an "Add note" idle state (not an empty saved-looking box) after canceling a brand-new note (#620)', async () => {
    await db.customMetrics.put({
      id: 'metric-1',
      name: 'Push-ups',
      inputKind: 'number',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    await db.customMetricEntries.put({
      id: 'entry-1',
      metricId: 'metric-1',
      date: '2026-03-01',
      value: 20,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const user = userEvent.setup()
    render(<CustomMetricLogSection date="2026-03-01" />)

    await user.click(
      await screen.findByRole('button', { name: 'Cancel editing note' }),
    )

    // The old (buggy) fallback was the read-mode box: an empty text span
    // plus an "Edit note" pencil, which looked like a blank note had been
    // saved. The fix instead shows a real "nothing logged yet" trigger.
    expect(
      screen.getByRole('button', { name: 'Add note' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit note' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add note' }))
    expect(await screen.findByLabelText('Note')).toHaveValue('')
  })

  it('wraps metrics in a bordered collapsible with a collapsed logged/total summary (#478)', async () => {
    await db.customMetrics.put({
      id: 'metric-1',
      name: 'Acne',
      inputKind: 'scale5',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    await db.customMetrics.put({
      id: 'metric-2',
      name: 'Training',
      inputKind: 'boolean',
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    await db.customMetricEntries.put({
      id: 'entry-1',
      metricId: 'metric-1',
      date: '2026-03-01',
      value: 3,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    const user = userEvent.setup()
    render(<CustomMetricLogSection date="2026-03-01" />)

    expect(await screen.findByLabelText('Acne')).toBeInTheDocument()
    expect(screen.getByLabelText('Training')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Hide custom metrics' }),
    )

    expect(screen.queryByLabelText('Acne')).not.toBeInTheDocument()
    expect(screen.getByText('1 logged / 2 metrics')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Show custom metrics' }),
    ).toBeInTheDocument()
  })
})
