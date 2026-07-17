import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry, MealEmotion } from '@/domain/dailyEntry'
import { FoodReactionsView } from './FoodReactionsView'

let idCounter = 0

function item(name: string, emotion: MealEmotion | undefined): CalorieItem {
  idCounter += 1
  return { id: `item-${idCounter}`, name, amountKcal: 300, emotion }
}

function entry(items: CalorieItem[]): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${idCounter}`,
    date: `2026-01-${String(idCounter).padStart(2, '0')}`,
    calorieEntries: [{ id: `meal-${idCounter}`, items, createdAt: now }],
    createdAt: now,
    updatedAt: now,
  }
}

describe('FoodReactionsView', () => {
  it('renders nothing when no item has ever been logged with a reaction', () => {
    const entries = [entry([item('Rice', undefined)])]
    const { container } = render(<FoodReactionsView entries={entries} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing with no entries at all', () => {
    const { container } = render(<FoodReactionsView entries={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lists a food under Most liked with its reaction count', () => {
    const entries = [
      entry([item('Pizza', 'bellissimo')]),
      entry([item('Pizza', 'thumbsUp')]),
    ]
    render(<FoodReactionsView entries={entries} />)

    expect(screen.getByText('Most liked')).toBeInTheDocument()
    expect(screen.getByText('Pizza')).toBeInTheDocument()
    expect(screen.getByText('🤌 1')).toBeInTheDocument()
    expect(screen.getByText('👍 1')).toBeInTheDocument()
    expect(screen.queryByText('Most disliked')).not.toBeInTheDocument()
  })

  it('lists a food under Most disliked with its reaction count', () => {
    const entries = [entry([item('Milk', 'thumbsDown')])]
    render(<FoodReactionsView entries={entries} />)

    expect(screen.getByText('Most disliked')).toBeInTheDocument()
    expect(screen.getByText('Milk')).toBeInTheDocument()
    expect(screen.getByText('👎 1')).toBeInTheDocument()
    expect(screen.queryByText('Most liked')).not.toBeInTheDocument()
  })

  it('shows a food under both lists when its history is mixed (#129)', () => {
    const entries = [
      entry([item('Pizza', 'bellissimo'), item('Milk', 'thumbsDown')]),
      entry([item('Pizza', 'thumbsDown')]),
    ]
    render(<FoodReactionsView entries={entries} />)

    const pizzaMentions = screen.getAllByText('Pizza')
    expect(pizzaMentions).toHaveLength(2)
  })
})
