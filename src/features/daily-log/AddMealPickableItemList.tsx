import { useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { recipePerServing } from '@/domain/recipe'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { itemKey, type PickableItem } from './addMealDialogHelpers'
import type {
  MealSearchDeleteMode,
  MealSearchDeleteResult,
} from './catalogItemDelete'
import { MealSearchItemDeleteDialog } from './MealSearchItemDeleteDialog'

const LONG_PRESS_MS = 450

export function AddMealPickableItemList({
  items,
  textFor,
  isFavorite,
  onToggleFavorite,
  onPick,
  onDeleteItem,
  deleteMode,
  t,
  locale,
}: {
  items: PickableItem[]
  textFor: (item: PickableItem) => string
  isFavorite: (item: PickableItem) => boolean
  onToggleFavorite: (item: PickableItem) => void
  onPick: (item: PickableItem) => void
  onDeleteItem?: (item: PickableItem) => Promise<MealSearchDeleteResult>
  deleteMode?: (item: PickableItem) => MealSearchDeleteMode
  t: ReturnType<typeof useTranslation>
  locale: ReturnType<typeof useLocale>
}) {
  const [pending, setPending] = useState<PickableItem | null>(null)
  const [pendingMode, setPendingMode] = useState<MealSearchDeleteMode>('none')
  const [blocked, setBlocked] = useState(false)

  function requestDelete(item: PickableItem) {
    const mode = deleteMode?.(item) ?? 'none'
    if (mode === 'none' || !onDeleteItem) return
    setBlocked(false)
    setPending(item)
    setPendingMode(mode)
  }

  function closeDelete() {
    setPending(null)
    setPendingMode('none')
    setBlocked(false)
  }

  return (
    <>
      <ul className="flex max-h-72 flex-col divide-y divide-foreground/15 overflow-y-auto rounded-xl border border-border p-4">
        {items.map((item) => (
          <PickableRow
            key={itemKey(item)}
            item={item}
            textFor={textFor}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            onPick={onPick}
            canDelete={
              onDeleteItem !== undefined &&
              (deleteMode?.(item) ?? 'none') !== 'none'
            }
            onRequestDelete={() => requestDelete(item)}
            t={t}
            locale={locale}
          />
        ))}
      </ul>
      <MealSearchItemDeleteDialog
        item={pending}
        mode={pendingMode}
        name={pending ? textFor(pending) : ''}
        blocked={blocked}
        onClose={closeDelete}
        onConfirm={async () => {
          if (!pending || !onDeleteItem) return
          const result = await onDeleteItem(pending)
          if (result === 'in-use') {
            setBlocked(true)
            return
          }
          closeDelete()
        }}
      />
    </>
  )
}

function PickableRow({
  item,
  textFor,
  isFavorite,
  onToggleFavorite,
  onPick,
  canDelete,
  onRequestDelete,
  t,
  locale,
}: {
  item: PickableItem
  textFor: (item: PickableItem) => string
  isFavorite: (item: PickableItem) => boolean
  onToggleFavorite: (item: PickableItem) => void
  onPick: (item: PickableItem) => void
  canDelete: boolean
  onRequestDelete: () => void
  t: ReturnType<typeof useTranslation>
  locale: ReturnType<typeof useLocale>
}) {
  const timer = useRef<number | null>(null)
  const armed = useRef(false)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)

  function clearTimer() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  function cancelPress() {
    clearTimer()
    armed.current = false
    origin.current = null
  }

  function ignoredTarget(target: EventTarget | null): boolean {
    return (
      target instanceof Element &&
      target.closest('[data-meal-search-actions]') !== null
    )
  }

  return (
    <li
      className="flex items-stretch py-3 first:pt-0 last:pb-0"
      onPointerDown={(event) => {
        if (!canDelete || ignoredTarget(event.target) || event.button !== 0) {
          return
        }
        cancelPress()
        origin.current = { x: event.clientX, y: event.clientY }
        timer.current = window.setTimeout(() => {
          armed.current = true
        }, LONG_PRESS_MS)
      }}
      onPointerMove={(event) => {
        const start = origin.current
        if (!start) return
        const dx = event.clientX - start.x
        const dy = event.clientY - start.y
        if (dx * dx + dy * dy > 100) cancelPress()
      }}
      onPointerUp={() => {
        const open = armed.current
        cancelPress()
        if (!open) return
        suppressClick.current = true
        onRequestDelete()
      }}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onContextMenu={(event) => {
        if (!canDelete || ignoredTarget(event.target)) return
        event.preventDefault()
        suppressClick.current = true
        onRequestDelete()
      }}
    >
      <button
        type="button"
        className="flex w-full min-w-0 items-start gap-2 text-left text-sm text-muted-foreground hover:bg-muted"
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false
            return
          }
          onPick(item)
        }}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          {item.source === 'food' ? (
            <>
              <span className="text-base font-medium">{item.food[locale]}</span>
              <span>
                {formatNumber(item.food.kcal100, locale, 0)} {t.dailyEntry.kcalUnit}{' '}
                {t.dailyEntry.per100gLabel} ·{' '}
                {macrosSummaryTextCompact(
                  item.food.protein100,
                  item.food.fat100,
                  item.food.carbs100,
                  locale,
                  t,
                )}
              </span>
            </>
          ) : item.source === 'recipe' ? (
            <RecipePickableSummary item={item} locale={locale} t={t} />
          ) : (
            <>
              <span className="text-base font-medium">{item.mealItem.name}</span>
              <span>
                {formatNumber(item.mealItem.lastAmountKcal, locale, 0)}{' '}
                {t.dailyEntry.kcalUnit} {t.dailyEntry.lastLoggedLabel} ·{' '}
                {macrosSummaryTextCompact(
                  item.mealItem.lastProteinG,
                  item.mealItem.lastFatG,
                  item.mealItem.lastCarbsG,
                  locale,
                  t,
                )}
              </span>
            </>
          )}
        </span>
      </button>
      {item.source !== 'recipe' && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-meal-search-actions
          className="mr-1 shrink-0 self-center"
          aria-label={
            isFavorite(item)
              ? t.dailyEntry.unfavoriteFoodLabel(textFor(item))
              : t.dailyEntry.favoriteFoodLabel(textFor(item))
          }
          aria-pressed={isFavorite(item)}
          onClick={() => onToggleFavorite(item)}
        >
          <Star
            aria-hidden="true"
            className={cn(isFavorite(item) && 'fill-current')}
          />
        </Button>
      )}
    </li>
  )
}

function RecipePickableSummary({
  item,
  locale,
  t,
}: {
  item: PickableItem & { source: 'recipe' }
  locale: ReturnType<typeof useLocale>
  t: ReturnType<typeof useTranslation>
}) {
  const perServing = recipePerServing(item.recipe)
  return (
    <>
      <span className="text-base font-medium">{item.recipe.name}</span>
      <span>
        {formatNumber(perServing.amountKcal, locale, 0)} {t.dailyEntry.kcalUnit}{' '}
        {t.dailyEntry.perServingLabel} ·{' '}
        {macrosSummaryTextCompact(
          perServing.proteinG,
          perServing.fatG,
          perServing.carbsG,
          locale,
          t,
        )}
      </span>
    </>
  )
}
