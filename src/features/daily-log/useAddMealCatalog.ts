import { useEffect, useRef, useState } from 'react'
import { foods } from '@/data/foods'
import type { MealItem } from '@/domain/mealItem'
import type { Locale } from '@/i18n'
import { applyFoodOverrides } from '@/shared/lib/applyFoodOverrides'
import { rankBySearchMatch } from '@/shared/lib/searchRank'
import { useFoodOverrideStore, useMealItemStore, useRecipeStore } from '@/stores'
import { foodItemFromOff } from './foodItemFromOff'
import {
  OFF_SEARCH_MIN_CHARS,
  searchOnlineFoods,
  type OnlineFoodHit,
  type OnlineSearchRemoteStatus,
} from './searchOnlineFoods'
import { itemKey, type PickableItem } from './addMealDialogHelpers'
import {
  deleteMealSearchPickable,
  mealSearchDeleteMode,
  type MealSearchDeleteMode,
  type MealSearchDeleteResult,
} from './catalogItemDelete'
import {
  filterToHomemadeDishes,
  isHomemadePickableItem,
} from './homemadeFoodFilter'
import { dedupeMealSearchMatches } from './mealSearchDedupe'

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
  const recipes = useRecipeStore((state) => state.recipes)
  const foodOverrides = useFoodOverrideStore((state) => state.overrides)
  const setFoodFavorite = useFoodOverrideStore((state) => state.setFavorite)
  const toggleMealItemFavorite = useMealItemStore((state) => state.toggleFavorite)
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [homemadeOnly, setHomemadeOnly] = useState(false)
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
  // #989 — recipes live in their own store, not the recent-food library.
  // Search them by name; Recent stays meal items only.
  const recipeItems: PickableItem[] = recipes
    .filter((recipe) => recipe.name.trim() !== '')
    .map((recipe) => ({ source: 'recipe', recipe }))
  const allItems = [...allMealItems, ...recipeItems, ...allFoods]

  const textFor = (item: PickableItem) => {
    if (item.source === 'food') return item.food[locale]
    if (item.source === 'recipe') return item.recipe.name
    return item.mealItem.name
  }

  function isFavorite(item: PickableItem): boolean {
    if (item.source === 'recipe') return false
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
    if (item.source === 'recipe') return
    if (item.source === 'mealItem') toggleMealItemFavorite(item.mealItem.id)
    else setFoodFavorite(item.food.id, !isFavorite(item))
  }

  const query = search.trim().toLowerCase()
  const homemadeItems = sortFavoritesFirst(
    allMealItems.filter(isHomemadePickableItem),
  )
  const recentItems = homemadeOnly
    ? homemadeItems
    : showAllRecent
      ? allMealItems
      : allMealItems.slice(0, RECENT_COUNT)
  const searchableItems = filterToHomemadeDishes(allItems, homemadeOnly)
  const dedupedMatches = query
    ? dedupeMealSearchMatches(
        sortFavoritesFirst(
          rankBySearchMatch(
            searchableItems.filter((item) =>
              textFor(item).toLowerCase().includes(query),
            ),
            query,
            textFor,
          ),
        ),
        textFor,
      )
    : []
  const matches = dedupedMatches.map((hit) => hit.item)

  function hiddenFor(item: PickableItem): PickableItem[] {
    return (
      dedupedMatches.find((hit) => itemKey(hit.item) === itemKey(item))
        ?.hidden ?? []
    )
  }

  function deleteModeFor(item: PickableItem): MealSearchDeleteMode {
    return mealSearchDeleteMode(item, hiddenFor(item))
  }

  function deletePickableItem(
    item: PickableItem,
  ): Promise<MealSearchDeleteResult> {
    return deleteMealSearchPickable(item, hiddenFor(item))
  }

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
    deleteMode: deleteModeFor,
    deletePickableItem,
    query,
    showAllRecent,
    setShowAllRecent,
    recentCount: RECENT_COUNT,
    homemadeOnly,
    toggleHomemadeOnly: () => setHomemadeOnly((current) => !current),
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
