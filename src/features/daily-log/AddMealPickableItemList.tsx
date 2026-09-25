import { Star } from 'lucide-react'
import { recipePerServing } from '@/domain/recipe'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { itemKey, type PickableItem } from './addMealDialogHelpers'

export function AddMealPickableItemList({
  items,
  textFor,
  isFavorite,
  onToggleFavorite,
  onPick,
  t,
  locale,
}: {
  items: PickableItem[]
  textFor: (item: PickableItem) => string
  isFavorite: (item: PickableItem) => boolean
  onToggleFavorite: (item: PickableItem) => void
  onPick: (item: PickableItem) => void
  t: ReturnType<typeof useTranslation>
  locale: ReturnType<typeof useLocale>
}) {
  return (
    <ul className="flex max-h-72 flex-col divide-y divide-foreground/15 overflow-y-auto rounded-xl border border-border p-4">
      {items.map((item) => (
        <li
          key={itemKey(item)}
          className="flex items-stretch py-3 first:pt-0 last:pb-0"
        >
          <button
            type="button"
            className="flex w-full min-w-0 items-start gap-2 text-left text-sm text-muted-foreground hover:bg-muted"
            onClick={() => onPick(item)}
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              {item.source === 'food' ? (
                <>
                  <span className="text-base font-medium">
                    {item.food[locale]}
                  </span>
                  <span>
                    {formatNumber(item.food.kcal100, locale, 0)}{' '}
                    {t.dailyEntry.kcalUnit} {t.dailyEntry.per100gLabel} ·{' '}
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
                  <span className="text-base font-medium">
                    {item.mealItem.name}
                  </span>
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
      ))}
    </ul>
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
