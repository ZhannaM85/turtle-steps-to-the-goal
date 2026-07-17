import { describe, expect, it } from 'vitest'
import type { CalorieItem, DailyEntry, MealEmotion } from '@/domain/dailyEntry'
import {
  foodReactionTallies,
  mostDislikedFoods,
  mostLikedFoods,
} from './foodReactions'

let idCounter = 0

function item(
  name: string | undefined,
  emotion: MealEmotion | undefined,
): CalorieItem {
  idCounter += 1
  return { id: `item-${idCounter}`, name, amountKcal: 300, emotion }
}

function entry(items: CalorieItem[]): DailyEntry {
  idCounter += 1
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: `entry-${idCounter}`,
    date: `2026-01-${String(idCounter).padStart(2, '0')}`,
    calorieEntries: [
      { id: `meal-${idCounter}`, items, createdAt: now },
    ],
    createdAt: now,
    updatedAt: now,
  }
}

describe('foodReactionTallies', () => {
  it('returns an empty array with no entries', () => {
    expect(foodReactionTallies([])).toEqual([])
  })

  it('counts each reaction type separately for one food', () => {
    const entries = [
      entry([item('Pizza', 'bellissimo')]),
      entry([item('Pizza', 'thumbsUp')]),
      entry([item('Pizza', 'thumbsDown')]),
    ]

    expect(foodReactionTallies(entries)).toEqual([
      { name: 'Pizza', bellissimoCount: 1, thumbsUpCount: 1, thumbsDownCount: 1 },
    ])
  })

  it('accumulates the same food name logged across multiple meals, not once per occurrence', () => {
    const entries = [
      entry([item('Pizza', 'bellissimo')]),
      entry([item('Pizza', 'bellissimo')]),
    ]

    expect(foodReactionTallies(entries)).toEqual([
      { name: 'Pizza', bellissimoCount: 2, thumbsUpCount: 0, thumbsDownCount: 0 },
    ])
  })

  it('keeps different dishes in the same multi-item meal separate (#129)', () => {
    const entries = [
      entry([item('Pizza', 'bellissimo'), item('Milk', 'thumbsDown')]),
    ]

    const tallies = foodReactionTallies(entries)
    expect(tallies).toContainEqual({
      name: 'Pizza',
      bellissimoCount: 1,
      thumbsUpCount: 0,
      thumbsDownCount: 0,
    })
    expect(tallies).toContainEqual({
      name: 'Milk',
      bellissimoCount: 0,
      thumbsUpCount: 0,
      thumbsDownCount: 1,
    })
  })

  it('skips items with no name or no reaction logged', () => {
    const entries = [
      entry([item(undefined, 'bellissimo'), item('Soup', undefined)]),
    ]

    expect(foodReactionTallies(entries)).toEqual([])
  })

  it('treats a whitespace-only name the same as no name', () => {
    const entries = [entry([item('   ', 'thumbsUp')])]

    expect(foodReactionTallies(entries)).toEqual([])
  })
})

describe('mostLikedFoods', () => {
  it('excludes foods with only negative reactions', () => {
    const entries = [entry([item('Milk', 'thumbsDown')])]

    expect(mostLikedFoods(entries)).toEqual([])
  })

  it('ranks bellissimo above thumbsUp even with fewer total reactions (bellissimo counts double)', () => {
    const entries = [
      entry([item('Salad', 'thumbsUp')]),
      entry([item('Salad', 'thumbsUp')]),
      entry([item('Pizza', 'bellissimo')]),
    ]

    const liked = mostLikedFoods(entries)
    expect(liked.map((f) => f.name)).toEqual(['Pizza', 'Salad'])
  })

  it('caps the list at the top 5 foods', () => {
    const entries = Array.from({ length: 7 }, (_, i) =>
      entry([item(`Food ${i}`, 'thumbsUp')]),
    )

    expect(mostLikedFoods(entries)).toHaveLength(5)
  })
})

describe('mostDislikedFoods', () => {
  it('excludes foods with only positive reactions', () => {
    const entries = [entry([item('Pizza', 'bellissimo')])]

    expect(mostDislikedFoods(entries)).toEqual([])
  })

  it('ranks by thumbsDown count, most first', () => {
    const entries = [
      entry([item('Milk', 'thumbsDown')]),
      entry([item('Milk', 'thumbsDown')]),
      entry([item('Broccoli', 'thumbsDown')]),
    ]

    const disliked = mostDislikedFoods(entries)
    expect(disliked.map((f) => f.name)).toEqual(['Milk', 'Broccoli'])
  })

  it('can include a food that also appears in mostLikedFoods (mixed history, not double-counted)', () => {
    const entries = [
      entry([item('Pizza', 'bellissimo')]),
      entry([item('Pizza', 'thumbsDown')]),
    ]

    expect(mostLikedFoods(entries).map((f) => f.name)).toContain('Pizza')
    expect(mostDislikedFoods(entries).map((f) => f.name)).toContain('Pizza')
  })
})
