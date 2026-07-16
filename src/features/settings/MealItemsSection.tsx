import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import type { MealItem } from '@/domain/mealItem'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import {
  formatComputedTotal,
  parseOptionalMacro,
  ratesFromAbsolute,
  scaleFromPer100g,
} from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { useMealItemStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

function MealItemRow({
  item,
  onRename,
  onDelete,
  onSaveNutrition,
}: {
  item: MealItem
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onSaveNutrition: (
    name: string,
    nutrition: {
      amountKcal: number
      proteinG: number | undefined
      fatG: number | undefined
      carbsG: number | undefined
      amountG: number
    },
  ) => void
}) {
  const t = useTranslation()
  const locale = useLocale()
  const [value, setValue] = useState(item.name)
  const [isEditingNutrition, setIsEditingNutrition] = useState(false)
  const [kcal100, setKcal100] = useState('')
  const [protein100, setProtein100] = useState('')
  const [fat100, setFat100] = useState('')
  const [carbs100, setCarbs100] = useState('')
  const [amountG, setAmountG] = useState('100')

  function commit() {
    const trimmed = value.trim()
    if (trimmed && trimmed !== item.name) {
      onRename(item.id, trimmed)
    } else {
      setValue(item.name)
    }
  }

  // Per-100g + quantity (#99), same input model #96 already uses
  // everywhere else — a MealItem's stored lastAmountKcal etc. are the
  // *last logged absolute totals*, so back-calculate a rate + quantity to
  // prefill editing rather than showing the raw totals directly. A bare
  // name with nothing recorded yet just starts blank.
  function startEditNutrition() {
    if (item.lastAmountKcal === undefined) {
      setKcal100('')
      setProtein100('')
      setFat100('')
      setCarbs100('')
      setAmountG('100')
    } else {
      const rates = ratesFromAbsolute(
        item.lastAmountKcal,
        item.lastProteinG,
        item.lastFatG,
        item.lastCarbsG,
        item.lastAmountG,
      )
      setKcal100(String(rates.kcal100))
      setProtein100(
        rates.protein100 === undefined ? '' : String(rates.protein100),
      )
      setFat100(rates.fat100 === undefined ? '' : String(rates.fat100))
      setCarbs100(rates.carbs100 === undefined ? '' : String(rates.carbs100))
      setAmountG(String(rates.quantity))
    }
    setIsEditingNutrition(true)
  }

  function saveNutrition() {
    const parsedKcal100 = parseNumberInput(kcal100)
    if (parsedKcal100 === undefined || parsedKcal100 < 0) return
    const scaled = scaleFromPer100g(
      parsedKcal100,
      parseOptionalMacro(protein100),
      parseOptionalMacro(fat100),
      parseOptionalMacro(carbs100),
      amountG,
    )
    onSaveNutrition(item.name, scaled)
    setIsEditingNutrition(false)
  }

  const kcal100Num = parseNumberInput(kcal100)
  const nutritionPreview =
    kcal100Num && kcal100Num > 0
      ? formatComputedTotal(
          scaleFromPer100g(
            kcal100Num,
            parseOptionalMacro(protein100),
            parseOptionalMacro(fat100),
            parseOptionalMacro(carbs100),
            amountG,
          ),
          locale,
          t,
        )
      : null

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          aria-label={t.settings.mealItemNameLabel}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          className="h-8 flex-1"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t.settings.editMealItemLabel(item.name)}
          onClick={() =>
            isEditingNutrition
              ? setIsEditingNutrition(false)
              : startEditNutrition()
          }
        >
          <Pencil aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t.settings.deleteMealItemLabel(item.name)}
          onClick={() => onDelete(item.id)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      {!isEditingNutrition && item.lastAmountKcal !== undefined && (
        <span className="pl-1 text-xs text-muted-foreground">
          {formatNumber(item.lastAmountKcal, locale, 0)} {t.dailyEntry.kcalUnit}{' '}
          {t.dailyEntry.lastLoggedLabel} ·{' '}
          {macrosSummaryTextCompact(
            item.lastProteinG,
            item.lastFatG,
            item.lastCarbsG,
            locale,
            t,
          )}
        </span>
      )}
      {isEditingNutrition && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 px-2 py-1.5">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t.dailyEntry.addCaloriesLabel}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`${t.dailyEntry.addCaloriesLabel} — ${item.name}`}
                value={kcal100}
                onChange={(e) => setKcal100(e.target.value)}
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
                aria-label={`${t.dailyEntry.proteinLabel} — ${item.name}`}
                value={protein100}
                onChange={(e) => setProtein100(e.target.value)}
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
                aria-label={`${t.dailyEntry.fatLabel} — ${item.name}`}
                value={fat100}
                onChange={(e) => setFat100(e.target.value)}
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
                aria-label={`${t.dailyEntry.carbsLabel} — ${item.name}`}
                value={carbs100}
                onChange={(e) => setCarbs100(e.target.value)}
                className="h-7 w-14"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t.dailyEntry.itemAmountGLabel}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`${t.dailyEntry.itemAmountGLabel} — ${item.name}`}
                value={amountG}
                onChange={(e) => setAmountG(e.target.value)}
                className="h-7 w-14"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={t.settings.saveMealItemLabel(item.name)}
              onClick={saveNutrition}
            >
              {t.dailyEntry.saveButton}
            </Button>
          </div>
          {nutritionPreview && (
            <p className="text-xs text-muted-foreground">
              {t.dailyEntry.computedTotalPrefix} {nutritionPreview}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

export function MealItemsSection() {
  const t = useTranslation()
  const items = useMealItemStore((state) => state.items)
  const loadItems = useMealItemStore((state) => state.loadItems)
  const rename = useMealItemStore((state) => state.rename)
  const deleteItem = useMealItemStore((state) => state.deleteItem)
  const touch = useMealItemStore((state) => state.touch)

  useEffect(() => {
    loadItems()
  }, [loadItems])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t.settings.mealItemsDescription}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t.settings.mealItemsEmpty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <MealItemRow
              key={item.id}
              item={item}
              onRename={rename}
              onDelete={deleteItem}
              onSaveNutrition={touch}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
