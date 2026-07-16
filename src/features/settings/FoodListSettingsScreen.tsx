import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { type FoodItem, foods } from '@/data/foods'
import type { FoodOverride } from '@/domain/foodOverride'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import { effectiveFoodItem } from '@/shared/lib/applyFoodOverrides'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { cn } from '@/shared/lib/utils'
import { useFoodOverrideStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { PageHeader } from '@/shared/ui/page-header'

interface FoodRowProps {
  food: FoodItem
  override: FoodOverride | undefined
  onHide: (foodId: string, hidden: boolean) => void
  onSave: (
    foodId: string,
    nutrition: {
      kcal100: number
      protein100: number
      fat100: number
      carbs100: number
    },
  ) => void
  onRestoreDefault: (foodId: string) => void
}

function FoodRow({
  food,
  override,
  onHide,
  onSave,
  onRestoreDefault,
}: FoodRowProps) {
  const t = useTranslation()
  const locale = useLocale()
  const [isEditing, setIsEditing] = useState(false)
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')
  const [carbs, setCarbs] = useState('')

  const name = food[locale]
  const hidden = override?.hidden ?? false
  const { kcal100, protein100, fat100, carbs100 } = effectiveFoodItem(
    food,
    override,
  )
  const hasOverride = override !== undefined

  function startEdit() {
    setKcal(String(kcal100))
    setProtein(String(protein100))
    setFat(String(fat100))
    setCarbs(String(carbs100))
    setIsEditing(true)
  }

  function save() {
    const parsedKcal = parseNumberInput(kcal)
    const parsedProtein = parseNumberInput(protein)
    const parsedFat = parseNumberInput(fat)
    const parsedCarbs = parseNumberInput(carbs)
    if (parsedKcal === undefined || parsedKcal < 0) return
    onSave(food.id, {
      kcal100: parsedKcal,
      protein100: parsedProtein ?? 0,
      fat100: parsedFat ?? 0,
      carbs100: parsedCarbs ?? 0,
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <li className="flex flex-col gap-1.5 rounded-lg bg-muted/40 px-2 py-1.5">
        <span className="text-sm font-medium">{name}</span>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.kcalUnit}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              aria-label={`${t.dailyEntry.kcalUnit} — ${name}`}
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              className="h-7 w-16"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.proteinLabel}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              aria-label={`${t.dailyEntry.proteinLabel} — ${name}`}
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              className="h-7 w-14"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.fatLabel}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              aria-label={`${t.dailyEntry.fatLabel} — ${name}`}
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              className="h-7 w-14"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.carbsLabel}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              aria-label={`${t.dailyEntry.carbsLabel} — ${name}`}
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              className="h-7 w-14"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={t.settings.saveFoodLabel(name)}
            onClick={save}
          >
            {t.dailyEntry.saveButton}
          </Button>
        </div>
      </li>
    )
  }

  return (
    <li
      className={cn(
        'flex items-center justify-between gap-2 px-2 py-1.5',
        hidden && 'opacity-50',
      )}
    >
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-sm">
          {name}
          {hidden && (
            <span className="text-xs text-muted-foreground">
              ({t.settings.hiddenBadgeLabel})
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatNumber(kcal100, locale, 0)} {t.dailyEntry.kcalUnit}{' '}
          {t.dailyEntry.per100gLabel} ·{' '}
          {macrosSummaryTextCompact(protein100, fat100, carbs100, locale, t)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {hasOverride && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={t.settings.restoreDefaultLabel(name)}
            onClick={() => onRestoreDefault(food.id)}
          >
            {t.settings.restoreDefaultButtonLabel}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t.settings.editFoodLabel(name)}
          onClick={startEdit}
        >
          <Pencil aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={hidden}
          aria-label={
            hidden ? t.settings.showFoodLabel(name) : t.settings.hideFoodLabel(name)
          }
          onClick={() => onHide(food.id, !hidden)}
        >
          {hidden ? t.settings.showButtonLabel : t.settings.hideButtonLabel}
        </Button>
      </div>
    </li>
  )
}

export function FoodListSettingsScreen() {
  const t = useTranslation()
  const locale = useLocale()
  const [search, setSearch] = useState('')

  const overrides = useFoodOverrideStore((state) => state.overrides)
  const loadOverrides = useFoodOverrideStore((state) => state.loadOverrides)
  const setHiddenAction = useFoodOverrideStore((state) => state.setHidden)
  const setNutritionAction = useFoodOverrideStore((state) => state.setNutrition)
  const restoreDefaultAction = useFoodOverrideStore((state) => state.restoreDefault)

  useEffect(() => {
    loadOverrides()
  }, [loadOverrides])

  const query = search.trim().toLowerCase()
  const visibleFoods = query
    ? foods.filter((food) => food[locale].toLowerCase().includes(query))
    : foods
  const overrideByFoodId = new Map(overrides.map((o) => [o.foodId, o]))

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/settings"
        className="self-start text-sm text-muted-foreground hover:text-foreground"
      >
        {t.settings.backToSettingsLabel}
      </Link>
      <PageHeader
        title={t.settings.foodListLabel}
        description={t.settings.foodListDescription}
      />
      <Input
        type="text"
        aria-label={t.dailyEntry.foodSearchLabel}
        placeholder={t.dailyEntry.foodSearchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {visibleFoods.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t.dailyEntry.noFoodResultsText}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {visibleFoods.map((food) => (
            <FoodRow
              key={food.id}
              food={food}
              override={overrideByFoodId.get(food.id)}
              onHide={setHiddenAction}
              onSave={setNutritionAction}
              onRestoreDefault={restoreDefaultAction}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
