import 'fake-indexeddb/auto'
import { render as rtlRender, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import type { CalorieEntry } from '@/domain/dailyEntry'
import { db } from '@/infrastructure/persistence/indexeddb'
import {
  useDigestionTrackingStore,
  useMealItemStore,
  useMealLabelPresetStore,
  useTodaySectionsCollapseStore,
  DEFAULT_TODAY_SECTIONS,
  useTrackedFieldsStore,
  useWaterTrackingStore,
} from '@/stores'

/**
 * Shared DailyEntryForm test setup (#863). Side-effect import registers
 * the suite hooks; call sites keep the original helpers and assertions.
 */

// MemoryRouter (#157) — MealList (mounted by every DailyEntryForm) now
// calls useNavigate() for its meal-pencil navigation, which throws
// outside a Router context. Shadowing `render` here instead of touching
// every one of this file's many call sites individually.
export function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: MemoryRouter })
}

// #454 replaced the always-visible inline add-row with a dedicated flyout
// (AddMealDialog) opened via "+ Add another meal", with manual entry now
// one level deeper behind the "Add food" quick-action card (#459 restyled
// this from a plain "Can't find it? Add manually" text link into a
// bordered card, same underlying action) — this opens the same
// MealItemEditorSheet these pre-#454 tests already exercise, whether the
// flyout is already open (a second add within the same test) or not. Once
// open, the trigger button itself becomes `aria-hidden` (covered by the
// fullscreen dialog), so `queryByRole` — which respects that, unlike
// `getByText` — reliably tells the two cases apart.
export async function openAddItemFlow(
  user: ReturnType<typeof userEvent.setup>,
) {
  // #691 — empty day: "+ Add a meal"; day with meals: "+ Add another meal".
  const trigger =
    screen.queryByRole('button', { name: '+ Add a meal' }) ??
    screen.queryByRole('button', { name: '+ Add another meal' })
  if (trigger) await user.click(trigger)
  await user.click(screen.getByRole('button', { name: 'Add food' }))
}

// #473 split the meal card's old single "Breakfast — 200 kcal" header line
// into a label-only title plus a calorie/macro summary line below it, so a
// saved meal can no longer be asserted with one exact string. Scoping to
// the card's own <li> also keeps these from matching AddMealDialog's
// same-named heading while the flyout is still open.
export function expectMealCard(label: string, kcalText: string) {
  const card = screen
    .getAllByText(label)
    .map((el) => el.closest('li'))
    .find((li): li is HTMLLIElement => li !== null)
  expect(card).toBeDefined()
  expect(
    within(card as HTMLElement).getAllByText(kcalText, { exact: false }).length,
  ).toBeGreaterThan(0)
}

// #515 replaced Body composition's single "Muscle 30kg · …" summary line
// with a grid of label/value cells, so its readings are separate nodes now.
// Scoping to the section keeps short values like a visceral-fat rating from
// matching an unrelated number elsewhere in the form.
export function expectBodyCompositionValues(values: string[]) {
  const heading = screen.getByText('Body composition')
  const section = heading.closest('div')?.parentElement as HTMLElement
  for (const value of values) {
    expect(within(section).getByText(value)).toBeInTheDocument()
  }
}

// #516 — Weight value and unit are separate nodes (large value, muted unit).
// #798 — heading's closest div is the title row (icons only); the value
// lives in the sibling muted card, so walk up to the section.
export function expectWeightDisplay(value: string) {
  const heading = screen.getByText('Weight (kg)')
  const section = heading.closest('div')?.parentElement as HTMLElement
  const valueEl = within(section).getByText(value)
  expect(valueEl).toHaveClass('text-2xl', 'font-semibold')
  expect(within(section).getByText('kg')).toBeInTheDocument()
}

// The food-picker tests below mount FoodPickerDialog, which renders the
// 300+ item curated food list (same reason FoodPickerDialog.test.tsx and
// FoodListSettingsScreen.test.tsx need this) — under full-suite parallel
// load the default 5000ms can be too tight.
vi.setConfig({ testTimeout: 15000 })

export const now = '2026-03-01T00:00:00.000Z'

export function calories(
  amountKcal: number,
  id: string = crypto.randomUUID(),
): CalorieEntry {
  return {
    id,
    items: [{ id: crypto.randomUUID(), amountKcal }],
    createdAt: now,
  }
}

beforeEach(async () => {
  await db.mealItems.clear()
  useMealItemStore.setState({ items: [], status: 'idle', error: null })
  useMealLabelPresetStore.setState({ presets: [] })
  useDigestionTrackingStore.setState({ enabled: false })
  useWaterTrackingStore.setState({ enabled: false })
  // #221: many tests below share date="2026-03-01" and don't always carry
  // the add-row's meal-item sheet through to a real Save — without this,
  // a leftover add-row draft (now persisted to localStorage) from one test
  // would silently pre-fill the next one's fresh render for the same date.
  localStorage.clear()
  useTodaySectionsCollapseStore.setState({
    sections: { ...DEFAULT_TODAY_SECTIONS },
  })
  // #528 — Body composition defaults off; most tests still expect the
  // section present, so enable every tracked field for the suite. The
  // optional-visibility describe below overrides where it needs the real
  // defaults.
  useTrackedFieldsStore.setState((state) => ({
    tracked: Object.fromEntries(
      Object.keys(state.tracked).map((key) => [key, true]),
    ) as typeof state.tracked,
  }))
  // #201 made MealList's add row default collapsed for a past `date` —
  // freeze "now" to this file's own fixture "today" (2026-03-01) so it
  // keeps reading as today, matching the pre-#201 always-expanded
  // behavior these tests were written against.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-03-01T12:00:00.000Z'))
})

afterEach(async () => {
  await db.mealItems.clear()
  useDigestionTrackingStore.setState({ enabled: false })
  useWaterTrackingStore.setState({ enabled: false })
  localStorage.clear()
  vi.useRealTimers()
})
