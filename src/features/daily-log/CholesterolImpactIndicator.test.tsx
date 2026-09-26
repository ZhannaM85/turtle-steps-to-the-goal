import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { CholesterolImpact } from '@/domain/cholesterol'
import { useLocaleStore, useTranslation, type Locale } from '@/i18n'
import { useNutritionFactsStore } from '@/stores'
import { CholesterolImpactIndicator } from './CholesterolImpactIndicator'
import { MealListItem } from './MealListItem'

const CASES: { impact: CholesterolImpact; label: string; reason: string }[] = [
  { impact: 'beneficial', label: 'Helps', reason: 'Legumes add fiber.' },
  { impact: 'neutral', label: 'Neutral', reason: 'Low saturated fat, little LDL effect.' },
  { impact: 'moderate', label: 'Moderate', reason: 'Mixed dish, depends on the recipe.' },
  {
    impact: 'limit',
    label: 'Limit',
    reason: 'Hard cheese is a concentrated source of saturated dairy fat.',
  },
  { impact: 'high', label: 'High', reason: 'Concentrated saturated dairy fat.' },
  { impact: 'unknown', label: 'Unknown', reason: 'Not enough information to classify.' },
]

function HistoricalRow({
  impact,
  reason,
  name,
}: {
  impact?: CholesterolImpact
  reason?: string
  name: string
}) {
  const t = useTranslation()
  return (
    <MealListItem
      entry={{
        id: 'meal-1',
        createdAt: '2026-09-01T08:00:00.000Z',
        timeEaten: '08:15',
        items: [
          {
            id: 'dish-1',
            name,
            amountKcal: 180,
            proteinG: 12,
            fatG: 14,
            carbsG: 1,
            amountG: 40,
            cholesterolImpact: impact,
            cholesterolReason: reason,
          },
        ],
      }}
      position={1}
      t={t}
      locale="en"
      isConfirmingDelete={false}
      sincePreviousMeal={null}
      viewedDate="2026-09-01"
      kcalVsYesterdayDelta={null}
      kcalBaselineDate={null}
      onStartEdit={() => {}}
      onRequestDelete={() => {}}
      onConfirmDelete={() => {}}
      onCancelDelete={() => {}}
    />
  )
}

beforeEach(() => {
  useLocaleStore.setState({ locale: 'en' })
  useNutritionFactsStore.setState({ enabled: false })
})

describe('CholesterolImpactIndicator (#1008)', () => {
  it('renders all six labels and reveals the reason', async () => {
    const user = userEvent.setup()
    render(
      <ul>
        {CASES.map((item) => (
          <li key={item.impact}>
            <CholesterolImpactIndicator
              impact={item.impact}
              reason={item.reason}
            />
          </li>
        ))}
      </ul>,
    )

    for (const item of CASES) {
      const button = screen.getByRole('button', {
        name: `LDL impact: ${item.label}`,
      })
      expect(button).toHaveAttribute('data-cholesterol-impact', item.impact)
      expect(button).toHaveTextContent(item.label)
      await user.click(button)
    }

    for (const item of CASES) {
      expect(screen.getByText(new RegExp(item.reason))).toBeInTheDocument()
      expect(
        screen.getByText(new RegExp(`LDL impact / .* ${item.label} / ${item.reason}`)),
      ).toBeInTheDocument()
    }
  })

  it('uses the Russian level names', () => {
    useLocaleStore.setState({ locale: 'ru' satisfies Locale })
    render(
      <CholesterolImpactIndicator impact="beneficial" reason="Fiber." />,
    )
    expect(
      screen.getByRole('button', { name: 'Влияние на ЛПНП: Помогает' }),
    ).toBeInTheDocument()
  })
})

describe('Day food row cholesterol label (#1008)', () => {
  it('shows a backfilled historical dish and its reason', async () => {
    const user = userEvent.setup()
    render(
      <HistoricalRow
        name="Сыр фасованный Маасдам"
        impact="limit"
        reason="Hard cheese is a concentrated source of saturated dairy fat."
      />,
    )

    expect(screen.getByText('Сыр фасованный Маасдам')).toBeInTheDocument()
    expect(screen.getAllByText(/180/).length).toBeGreaterThan(0)
    const button = screen.getByRole('button', { name: 'LDL impact: Limit' })
    await user.click(button)
    expect(
      screen.getByTestId('cholesterol-impact-reason'),
    ).toHaveTextContent('Hard cheese is a concentrated source of saturated dairy fat.')
  })

  it('shows unknown for a new dish that is not in the seed', () => {
    render(<HistoricalRow name="Сырник из нового кафе" />)
    expect(
      screen.getByRole('button', { name: 'LDL impact: Unknown' }),
    ).toHaveAttribute('data-cholesterol-impact', 'unknown')
  })

  it('classifies a saved dish from its name when the field is still empty', () => {
    render(<HistoricalRow name="Масло сливочное" />)
    expect(
      screen.getByRole('button', { name: 'LDL impact: High' }),
    ).toBeInTheDocument()
  })
})
