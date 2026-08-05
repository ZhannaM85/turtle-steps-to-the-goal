import 'fake-indexeddb/auto'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DailyEntry } from '@/domain/dailyEntry'
import type { Goal } from '@/domain/goal'
import { db } from '@/infrastructure/persistence/indexeddb'
import { useLastBackupStore, useMealItemStore } from '@/stores'
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
  await db.mealItems.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
  // #599 — no backup recorded yet by default; individual tests seed a real
  // value where the reminder status matters.
  useLastBackupStore.setState({
    firstSeenAt: new Date().toISOString(),
    lastExportedAt: null,
    dismissedUntil: null,
  })
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
  await db.mealItems.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  // jsdom has no built-in navigator.storage (#176) — reset whatever a test
  // defined so it doesn't leak into the next one.
  Object.defineProperty(navigator, 'storage', {
    value: undefined,
    configurable: true,
  })
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

  it('records the backup timestamp on a successful export, but not before (#599)', async () => {
    const user = userEvent.setup()
    render(<ExportSection />)

    expect(
      screen.getByText("You haven't exported a backup yet."),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Export backup' }))

    expect(await screen.findByText('Last backup: today.')).toBeInTheDocument()
    expect(useLastBackupStore.getState().lastExportedAt).not.toBeNull()
  })

  it(
    'exports an Excel file and reports how much data was included',
    async () => {
      await db.goals.put(makeGoal())
      await db.dailyEntries.put(makeEntry())
      await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))
      const user = userEvent.setup()

      render(<ExportSection />)
      await user.click(screen.getByRole('button', { name: 'Export as Excel' }))

      // exceljs is a sizeable dynamic import (#123) — under full-suite
      // parallel load its first transform can take longer than findByText's
      // default 1000ms timeout, same reasoning as router.test.tsx's Dashboard
      // chunk. The test's own timeout (3rd `it` arg, below) needs its own
      // bump too — left at Vitest's 5000ms default, this findByText's own
      // 5000ms wait left zero margin for render/click/import-kickoff before
      // it even started, a real timeout race under load rather than a fluke
      // (confirmed live: timed out during a full-suite run competing with
      // unrelated stale background processes for CPU).
      expect(
        await screen.findByText(
          'Exported 1 goal and 2 daily entries.',
          {},
          { timeout: 5000 },
        ),
      ).toBeInTheDocument()
    },
    10000,
  )

  it('exports a CSV file and reports how many entries were included', async () => {
    await db.goals.put(makeGoal())
    await db.dailyEntries.put(makeEntry())
    await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))
    const user = userEvent.setup()

    render(<ExportSection />)
    await user.click(screen.getByRole('button', { name: 'Export as CSV' }))

    // No goals in the summary (#125) — CSV only covers the daily log.
    expect(
      await screen.findByText('Exported 2 daily entries.'),
    ).toBeInTheDocument()
  })

  it('limits Excel/CSV/Markdown exports to the chosen period, without affecting the JSON backup (#240)', async () => {
    await db.goals.put(makeGoal())
    await db.dailyEntries.put(makeEntry({ date: '2026-02-15' }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-10' }))
    const user = userEvent.setup()

    render(<ExportSection />)
    fireEvent.change(screen.getByLabelText('Export period — Start date'), {
      target: { value: '2026-03-01' },
    })
    fireEvent.change(screen.getByLabelText('Export period — End date'), {
      target: { value: '2026-03-31' },
    })

    await user.click(screen.getByRole('button', { name: 'Export as CSV' }))
    expect(
      await screen.findByText('Exported 2 daily entries.'),
    ).toBeInTheDocument()

    // The JSON backup ignores the period entirely — a backup should stay
    // complete regardless of whatever range happens to be set for the
    // other formats.
    await user.click(screen.getByRole('button', { name: 'Export backup' }))
    expect(
      await screen.findByText('Exported 1 goal and 3 daily entries.'),
    ).toBeInTheDocument()
  })

  it('scopes the ranged backup to the chosen period, keeping all goals (#370)', async () => {
    await db.goals.put(makeGoal())
    await db.dailyEntries.put(makeEntry({ date: '2026-02-15' }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-01' }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-10' }))
    const user = userEvent.setup()

    render(<ExportSection />)
    fireEvent.change(screen.getByLabelText('Export period — Start date'), {
      target: { value: '2026-03-01' },
    })
    fireEvent.change(screen.getByLabelText('Export period — End date'), {
      target: { value: '2026-03-31' },
    })

    await user.click(
      screen.getByRole('button', { name: 'Export ranged backup' }),
    )

    // 2 daily entries within the period, but still both goals — goals
    // aren't date-scoped the same way, same reasoning Excel/CSV/Markdown
    // already apply to daily entries only.
    expect(
      await screen.findByText('Exported 1 goal and 2 daily entries.'),
    ).toBeInTheDocument()
  })

  it('exports everything when the ranged backup is used with no period set', async () => {
    await db.goals.put(makeGoal())
    await db.dailyEntries.put(makeEntry({ date: '2026-02-15' }))
    await db.dailyEntries.put(makeEntry({ date: '2026-03-10' }))
    const user = userEvent.setup()

    render(<ExportSection />)
    await user.click(
      screen.getByRole('button', { name: 'Export ranged backup' }),
    )

    expect(
      await screen.findByText('Exported 1 goal and 2 daily entries.'),
    ).toBeInTheDocument()
  })

  it('exports a Markdown file and reports how many entries were included (#219)', async () => {
    await db.goals.put(makeGoal())
    await db.dailyEntries.put(makeEntry())
    await db.dailyEntries.put(makeEntry({ date: '2026-03-02' }))
    const user = userEvent.setup()

    render(<ExportSection />)
    await user.click(
      screen.getByRole('button', { name: 'Export as Markdown' }),
    )

    // No goals in the summary, same reasoning as the CSV export above.
    expect(
      await screen.findByText('Exported 2 entries as Markdown.'),
    ).toBeInTheDocument()
  })

  it('imports a valid backup file and reports the result', async () => {
    const user = userEvent.setup()
    const bundle = {
      version: 4,
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

  it('refreshes the already-loaded meal-item store after import, not just IndexedDB (#285)', async () => {
    // Simulates useMealItemStore already having loaded (stale) data before
    // the import runs — e.g. MealItemsSection already mounted on this same
    // Settings page — the bug this regression test guards against.
    useMealItemStore.setState({
      items: [
        {
          id: 'existing-1',
          name: 'Protein Bar',
          favorite: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      status: 'ready',
      error: null,
    })
    const user = userEvent.setup()
    const bundle = {
      version: 7,
      exportedAt: new Date().toISOString(),
      goals: [],
      dailyEntries: [],
      mealItems: [
        {
          id: 'existing-1',
          name: 'Protein Bar',
          favorite: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    }

    render(<ExportSection />)
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    await user.upload(input, makeFile(bundle))

    await screen.findByText('Imported 0 goals and 0 daily entries.')
    expect(useMealItemStore.getState().items).toContainEqual(
      expect.objectContaining({ id: 'existing-1', favorite: true }),
    )
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

  it('shows just usage when quota is unavailable', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: { estimate: vi.fn().mockResolvedValue({ usage: 51200 }) },
      configurable: true,
    })

    render(<ExportSection />)

    expect(
      await screen.findByText('~50 KB used on this device'),
    ).toBeInTheDocument()
  })

  it('shows usage alongside quota when both are available (#191)', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi
          .fn()
          .mockResolvedValue({ usage: 51200, quota: 1024 * 1024 * 1024 }),
      },
      configurable: true,
    })

    render(<ExportSection />)

    expect(
      await screen.findByText('~50 KB used of ~1.0 GB available on this device'),
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

  it('encrypts and downloads a backup via a password (#608)', async () => {
    await db.goals.put(makeGoal())
    await db.dailyEntries.put(makeEntry())
    const user = userEvent.setup()

    render(<ExportSection />)
    await user.click(screen.getByRole('button', { name: 'Encrypted backup' }))
    await user.type(
      await screen.findByLabelText('Password'),
      'correct horse battery staple',
    )
    await user.type(
      screen.getByLabelText('Confirm password'),
      'correct horse battery staple',
    )
    await user.click(
      screen.getByRole('button', { name: 'Encrypt and download' }),
    )

    expect(
      await screen.findByText('Encrypted backup downloaded.'),
    ).toBeInTheDocument()
  })

  it('shows a mismatch warning and blocks submit until both passwords match (#608)', async () => {
    const user = userEvent.setup()

    render(<ExportSection />)
    await user.click(screen.getByRole('button', { name: 'Encrypted backup' }))
    await user.type(await screen.findByLabelText('Password'), 'first-try')
    await user.type(screen.getByLabelText('Confirm password'), 'second-try')

    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Encrypt and download' }),
    ).toBeDisabled()
  })

  it('imports an encrypted backup after entering the correct password (#608)', async () => {
    const { encryptBackupJson } = await import('./encryptedBackup')
    const bundle = {
      version: 4,
      exportedAt: new Date().toISOString(),
      goals: [makeGoal()],
      dailyEntries: [makeEntry(), makeEntry({ date: '2026-03-02' })],
    }
    const envelope = await encryptBackupJson(
      JSON.stringify(bundle),
      'correct horse battery staple',
    )
    const user = userEvent.setup()

    render(<ExportSection />)
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    await user.upload(input, makeFile(envelope))

    await user.type(
      await screen.findByLabelText('Password'),
      'correct horse battery staple',
    )
    await user.click(
      screen.getByRole('button', { name: 'Decrypt and import' }),
    )

    expect(
      await screen.findByText('Imported 1 goal and 2 daily entries.'),
    ).toBeInTheDocument()
    expect(await db.goals.toArray()).toHaveLength(1)
    expect(await db.dailyEntries.toArray()).toHaveLength(2)
  })

  it('shows an inline error for a wrong encrypted backup password, and allows retrying (#608)', async () => {
    const { encryptBackupJson } = await import('./encryptedBackup')
    const bundle = {
      version: 4,
      exportedAt: new Date().toISOString(),
      goals: [makeGoal()],
      dailyEntries: [],
    }
    const envelope = await encryptBackupJson(
      JSON.stringify(bundle),
      'the-real-password',
    )
    const user = userEvent.setup()

    render(<ExportSection />)
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    await user.upload(input, makeFile(envelope))

    const passwordField = await screen.findByLabelText('Password')
    await user.type(passwordField, 'a-wrong-guess')
    await user.click(
      screen.getByRole('button', { name: 'Decrypt and import' }),
    )

    expect(
      await screen.findByText('Wrong password, or the file is corrupted.'),
    ).toBeInTheDocument()

    await user.clear(passwordField)
    await user.type(passwordField, 'the-real-password')
    await user.click(
      screen.getByRole('button', { name: 'Decrypt and import' }),
    )

    expect(
      await screen.findByText('Imported 1 goal and 0 daily entries.'),
    ).toBeInTheDocument()
  })

  describe('per-field import picker (#369)', () => {
    // Weight/Steps/Body fat % appear in both the Zepp Life and Apple Health
    // pickers — scoped via `within` on each picker's own group (identified
    // by its distinct aria-label) rather than a page-wide query.
    function zeppLifeFieldGroup() {
      return screen.getByRole('toolbar', {
        name: 'Import from Zepp Life — Data to import',
      })
    }

    it('starts with every Zepp Life field selected, matching pre-#369 behavior', () => {
      render(<ExportSection />)

      expect(
        within(zeppLifeFieldGroup()).getByRole('button', {
          name: 'Weight (kg)',
          pressed: true,
        }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Import from Zepp Life' }),
      ).toBeEnabled()
    })

    it('disables the Zepp Life import button once every field is unchecked', async () => {
      const user = userEvent.setup()
      render(<ExportSection />)
      const group = within(zeppLifeFieldGroup())

      for (const label of [
        'Weight (kg)',
        'Body fat',
        'Body water',
        'Bone mass',
        'Visceral fat',
        'Muscle mass',
        'Steps',
      ]) {
        await user.click(group.getByRole('button', { name: label }))
      }

      expect(
        screen.getByRole('button', { name: 'Import from Zepp Life' }),
      ).toBeDisabled()
    })

    it('starts with every MyFitnessPal field selected, and disables its button once all are unchecked (#367)', async () => {
      const user = userEvent.setup()
      render(<ExportSection />)
      const group = within(
        screen.getByRole('toolbar', {
          name: 'Import from MyFitnessPal — Data to import',
        }),
      )

      expect(
        group.getByRole('button', { name: 'Meals', pressed: true }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Import from MyFitnessPal' }),
      ).toBeEnabled()

      for (const label of ['Meals', 'Weight (kg)']) {
        await user.click(group.getByRole('button', { name: label }))
      }

      expect(
        screen.getByRole('button', { name: 'Import from MyFitnessPal' }),
      ).toBeDisabled()
    })
  })

  describe('import conflict mode (#496)', () => {
    it('defaults each wearable/MFP import to Fill gaps only', () => {
      render(<ExportSection />)

      for (const source of [
        'Import from Zepp Life',
        'Import from Apple Health',
        'Import from MyFitnessPal',
      ]) {
        const group = within(
          screen.getByRole('radiogroup', {
            name: `${source} — If a day already has a value`,
          }),
        )
        expect(
          group.getByRole('radio', {
            name: 'Fill gaps only',
            checked: true,
          }),
        ).toBeInTheDocument()
        expect(
          group.getByRole('radio', {
            name: 'Overwrite with import',
            checked: false,
          }),
        ).toBeInTheDocument()
      }
    })

    it('lets the user switch a source to Overwrite with import', async () => {
      const user = userEvent.setup()
      render(<ExportSection />)
      const group = within(
        screen.getByRole('radiogroup', {
          name: 'Import from Zepp Life — If a day already has a value',
        }),
      )

      await user.click(
        group.getByRole('radio', { name: 'Overwrite with import' }),
      )

      expect(
        group.getByRole('radio', {
          name: 'Overwrite with import',
          checked: true,
        }),
      ).toBeInTheDocument()
      expect(
        group.getByRole('radio', { name: 'Fill gaps only', checked: false }),
      ).toBeInTheDocument()
    })
  })

  describe('"How do I get this file?" disclosure (#381)', () => {
    // Native <details>/<summary> — jsdom doesn't apply the UA stylesheet
    // that hides collapsed content visually, so this only asserts the
    // steps are present in a <details> alongside the right toggle label,
    // not the collapsed/expanded visual state.
    it('pairs the Zepp Life export steps with a "How do I get this file?" toggle', () => {
      render(<ExportSection />)

      const [zeppLifeToggle] = screen.getAllByText('How do I get this file?')
      const details = zeppLifeToggle.closest('details')
      expect(details).not.toBeNull()
      expect(within(details!).getByText(/Exercising user rights/)).toBeInTheDocument()
    })

    it('pairs the Apple Health export steps with their own toggle', () => {
      render(<ExportSection />)

      const [, appleHealthToggle] = screen.getAllByText(
        'How do I get this file?',
      )
      const details = appleHealthToggle.closest('details')
      expect(details).not.toBeNull()
      expect(
        within(details!).getByText(/Export All Health Data/),
      ).toBeInTheDocument()
    })

    it('pairs the MyFitnessPal export steps with their own toggle (#367)', () => {
      render(<ExportSection />)

      const [, , myFitnessPalToggle] = screen.getAllByText(
        'How do I get this file?',
      )
      const details = myFitnessPalToggle.closest('details')
      expect(details).not.toBeNull()
      expect(
        within(details!).getByText(/Data Access Request/),
      ).toBeInTheDocument()
    })
  })
})
