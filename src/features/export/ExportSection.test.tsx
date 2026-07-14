import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import { ExportSection } from './ExportSection'

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    targetWeeklyLossKg: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEntry(overrides: Partial<DailyEntry> = {}): DailyEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date: '2026-03-01',
    weightKg: 80,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeFile(content: unknown, name = 'backup.json'): File {
  return new File([JSON.stringify(content)], name, {
    type: 'application/json',
  })
}

beforeEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  // jsdom doesn't implement object URLs or real navigation on anchor clicks;
  // ExportSection only needs these to not throw.
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

afterEach(async () => {
  await db.goals.clear()
  await db.dailyEntries.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ExportSection', () => {
  it('exports and reports how much data was included', async () => {
    await db.goals.put(makeGoal())
    await db.dailyEntries.put(makeEntry())
    await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))
    const user = userEvent.setup()

    render(<ExportSection />)
    await user.click(screen.getByRole('button', { name: 'Export backup' }))

    expect(
      await screen.findByText('Exported 1 goal and 2 daily entries.'),
    ).toBeInTheDocument()
  })

  it('imports a valid backup file and reports the result', async () => {
    const user = userEvent.setup()
    const bundle = {
      version: 3,
      exportedAt: new Date().toISOString(),
      goals: [makeGoal()],
      dailyEntries: [makeEntry(), makeEntry({ date: '2026-03-02' })],
    }

    render(<ExportSection />)
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    await user.upload(input, makeFile(bundle))

    expect(
      await screen.findByText('Imported 1 goal and 2 daily entries.'),
    ).toBeInTheDocument()
    expect(await db.goals.toArray()).toHaveLength(1)
    expect(await db.dailyEntries.toArray()).toHaveLength(2)
  })

  it('shows a clear error for a file that is valid JSON but not a backup', async () => {
    const user = userEvent.setup()

    render(<ExportSection />)
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    await user.upload(input, makeFile({ hello: 'world' }))

    expect(
      await screen.findByText(
        "This file doesn't look like a valid Turtle Steps backup.",
      ),
    ).toBeInTheDocument()
  })

  it('shows a clear error for a file that is not valid JSON at all', async () => {
    const user = userEvent.setup()

    render(<ExportSection />)
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    const badFile = new File(['not json'], 'backup.json', {
      type: 'application/json',
    })
    await user.upload(input, badFile)

    expect(
      await screen.findByText("That file isn't valid JSON."),
    ).toBeInTheDocument()
  })
})
