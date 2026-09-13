import { useEffect, useRef, useState } from 'react'
import { foods } from '@/data/foods'
import type { MealItem } from '@/domain/mealItem'
import type { Locale } from '@/i18n'
import { applyFoodOverrides } from '@/shared/lib/applyFoodOverrides'
import { rankBySearchMatch } from '@/shared/lib/searchRank'
import { useFoodOverrideStore, useMealItemStore } from '@/stores'
import { foodItemFromOff } from './foodItemFromOff'
import {
  OFF_SEARCH_MIN_CHARS,
  searchOnlineFoods,
  type OnlineFoodHit,
  type OnlineSearchRemoteStatus,
} from './searchOnlineFoods'
import type { PickableItem } from './addMealDialogHelpers'

const RECENT_COUNT = 3

export function useAddMealCatalog({
  locale,
  isOnline,
  search,
  setSearch,
  openPickedItemSheet,
}: {
  locale: Locale
  isOnline: boolean
  search: string
  setSearch: (value: string) => void
  openPickedItemSheet: (
    item: PickableItem,
    options?: { brandOverride?: string; barcodeOverride?: string },
  ) => void
}) {
  const mealItems = useMealItemStore((state) => state.items)
  const foodOverrides = useFoodOverrideStore((state) => state.overrides)
  const setFoodFavorite = useFoodOverrideStore((state) => state.setFavorite)
  const toggleMealItemFavorite = useMealItemStore((state) => state.toggleFavorite)
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [onlineHits, setOnlineHits] = useState<OnlineFoodHit[]>([])
  const [onlineSearchStatus, setOnlineSearchStatus] = useState<
    'idle' | 'loading' | 'done'
  >('idle')
  const [onlineRemoteStatus, setOnlineRemoteStatus] =
    useState<OnlineSearchRemoteStatus | null>(null)
  const onlineSearchAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      onlineSearchAbortRef.current?.abort()
    }
  }, [])

  function clearOnlineSearch() {
    onlineSearchAbortRef.current?.abort()
    onlineSearchAbortRef.current = null
    setOnlineHits([])
    setOnlineSearchStatus('idle')
    setOnlineRemoteStatus(null)
  }

  const visibleFoods = applyFoodOverrides(foods, foodOverrides)
  const allMealItems: PickableItem[] = mealItems
    .filter(
      (item): item is MealItem & { lastAmountKcal: number } =>
        item.lastAmountKcal !== undefined,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((mealItem) => ({ source: 'mealItem', mealItem }))
  const allFoods: PickableItem[] = visibleFoods.map((food) => ({
    source: 'food',
    food,
  }))
  const allItems = [...allMealItems, ...allFoods]

  const textFor = (item: PickableItem) =>
    item.source === 'food' ? item.food[locale] : item.mealItem.name

  function isFavorite(item: PickableItem): boolean {
    if (item.source === 'mealItem') return item.mealItem.favorite === true
    return (
      foodOverrides.find((override) => override.foodId === item.food.id)
        ?.favorite === true
    )
  }

  function sortFavoritesFirst(list: PickableItem[]): PickableItem[] {
    return [...list].sort(
      (a, b) => Number(isFavorite(b)) - Number(isFavorite(a)),
    )
  }

  function handleToggleFavorite(item: PickableItem) {
    if (item.source === 'mealItem') toggleMealItemFavorite(item.mealItem.id)
    else setFoodFavorite(item.food.id, !isFavorite(item))
  }

  const query = search.trim().toLowerCase()
  const recentItems = showAllRecent
    ? allMealItems
    : allMealItems.slice(0, RECENT_COUNT)
  const matches = query
    ? sortFavoritesFirst(
        rankBySearchMatch(
          allItems.filter((item) => textFor(item).toLowerCase().includes(query)),
          query,
          textFor,
        ),
      )
    : []

  async function runOnlineSearch() {
    const rawQuery = search.trim()
    if (rawQuery.length < OFF_SEARCH_MIN_CHARS) return
    onlineSearchAbortRef.current?.abort()
    const controller = new AbortController()
    onlineSearchAbortRef.current = controller
    setOnlineSearchStatus('loading')
    setOnlineHits([])
    setOnlineRemoteStatus(null)
    const result = await searchOnlineFoods(rawQuery, {
      signal: controller.signal,
      online: isOnline,
    })
    if (controller.signal.aborted) return
    setOnlineHits(result.hits)
    setOnlineRemoteStatus(result.remoteStatus)
    setOnlineSearchStatus('done')
  }

  function pickOnlineHit(hit: OnlineFoodHit) {
    const food = foodItemFromOff(hit)
    openPickedItemSheet(
      { source: 'food', food },
      { brandOverride: hit.brand, barcodeOverride: hit.code },
    )
  }

  function changeSearch(value: string) {
    setSearch(value)
    clearOnlineSearch()
  }

  function clearSearch() {
    setSearch('')
    clearOnlineSearch()
  }

  return {
    mealItems,
    allMealItems,
    recentItems,
    matches,
    query,
    showAllRecent,
    setShowAllRecent,
    recentCount: RECENT_COUNT,
    onlineHits,
    onlineSearchStatus,
    onlineRemoteStatus,
    textFor,
    isFavorite,
    handleToggleFavorite,
    runOnlineSearch,
    pickOnlineHit,
    changeSearch,
    clearSearch,
  }
}
