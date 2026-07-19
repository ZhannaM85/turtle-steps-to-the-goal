import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import type { MealItem } from '@/domain/mealItem'
import { macrosSummaryTextCompact } from '@/shared/lib/macroDisplay'
import {
  formatComputedTotal,
  parseOptionalMacro,
  portionsToGrams,
  ratesFromAbsolute,
  scaleFromPer100g,
  totalFromPortion,
} from '@/shared/lib/macroScaling'
import { parseNumberInput } from '@/shared/lib/parseNumberInput'
import { useMealItemStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'

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
  const [amountG, setAmountG] = useState('1')
  // Per 100g / Per portion entry mode (#170, extending #111's toggle from
  // manual meal entry to this screen's editor).
  const [macroMode, setMacroMode] = useState<'per100g' | 'perPortion'>(
    'per100g',
  )

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
  // name with nothing recorded yet just starts blank. Always resets to
  // per100g mode (#170) — same as restoring a suggestion elsewhere in the
  // app, since MealItem.lastAmountKcal etc. don't carry a mode of their own.
  function startEditNutrition() {
    if (item.lastAmountKcal === undefined) {
      setKcal100('')
      setProtein100('')
      setFat100('')
      setCarbs100('')
      setAmountG('1')
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
      setAmountG(String(rates.portions))
    }
    setMacroMode('per100g')
    setIsEditingNutrition(true)
  }

  // Mirrors handleAddMacroModeChange in MealList.tsx — converts the
  // currently-typed numbers rather than silently reinterpreting them under
  // the new mode.
  function handleMacroModeChange(newMode: 'per100g' | 'perPortion') {
    if (newMode === macroMode) return
    const amountNum = parseNumberInput(kcal100)
    if (amountNum && amountNum > 0) {
      if (newMode === 'perPortion') {
        const scaled = scaleFromPer100g(
          amountNum,
          parseOptionalMacro(protein100),
          parseOptionalMacro(fat100),
          parseOptionalMacro(carbs100),
          amountG,
        )
        setKcal100(String(scaled.amountKcal))
        setProtein100(
          scaled.proteinG === undefined ? '' : String(scaled.proteinG),
        )
        setFat100(scaled.fatG === undefined ? '' : String(scaled.fatG))
        setCarbs100(scaled.carbsG === undefined ? '' : String(scaled.carbsG))
      } else {
        const rates = ratesFromAbsolute(
          amountNum,
          parseOptionalMacro(protein100),
          parseOptionalMacro(fat100),
          parseOptionalMacro(carbs100),
          portionsToGrams(amountG),
        )
        setKcal100(String(rates.kcal100))
        setProtein100(
          rates.protein100 === undefined ? '' : String(rates.protein100),
        )
        setFat100(rates.fat100 === undefined ? '' : String(rates.fat100))
        setCarbs100(rates.carbs100 === undefined ? '' : String(rates.carbs100))
        setAmountG(String(rates.portions))
      }
    }
    setMacroMode(newMode)
  }

  function saveNutrition() {
    const parsedKcal100 = parseNumberInput(kcal100)
    if (parsedKcal100 === undefined || parsedKcal100 < 0) return
    const scaled =
      macroMode === 'per100g'
        ? scaleFromPer100g(
            parsedKcal100,
            parseOptionalMacro(protein100),
            parseOptionalMacro(fat100),
            parseOptionalMacro(carbs100),
            amountG,
          )
        : totalFromPortion(
            parsedKcal100,
            parseOptionalMacro(protein100),
            parseOptionalMacro(fat100),
            parseOptionalMacro(carbs100),
            amountG,
          )
    onSaveNutrition(item.name, { ...scaled, amountG: scaled.amountG ?? 100 })
    setIsEditingNutrition(false)
  }

  const kcal100Num = parseNumberInput(kcal100)
  const nutritionPreview =
    kcal100Num && kcal100Num > 0
      ? formatComputedTotal(
          macroMode === 'per100g'
            ? scaleFromPer100g(
                kcal100Num,
                parseOptionalMacro(protein100),
                parseOptionalMacro(fat100),
                parseOptionalMacro(carbs100),
                amountG,
              )
            : totalFromPortion(
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
          <ToggleGroup
            type="single"
            aria-label={`${t.dailyEntry.macroModeLabel} — ${item.name}`}
            value={macroMode}
            onValueChange={(value) =>
              value && handleMacroModeChange(value as 'per100g' | 'perPortion')
            }
            className="w-fit gap-2 p-0.5"
          >
            <ToggleGroupItem value="per100g" className="h-7 px-3 text-xs">
              {t.dailyEntry.macroModePer100gOption}
            </ToggleGroupItem>
            <ToggleGroupItem value="perPortion" className="h-7 px-3 text-xs">
              {t.dailyEntry.macroModePerPortionOption}
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {macroMode === 'per100g'
                  ? t.dailyEntry.addCaloriesLabel
                  : t.dailyEntry.addCaloriesPortionLabel}
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
            {/* Grams is a pure memory aid in Portion mode (#111/#121), not a
             * multiplier — an editable "100" next to a portion total read
             * as confusing clutter, replaced with a plain "Portion" badge,
             * same as everywhere else in the app. */}
            {macroMode === 'per100g' ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {t.dailyEntry.itemPortionsLabel}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={`${t.dailyEntry.itemPortionsLabel} — ${item.name}`}
                  value={amountG}
                  onChange={(e) => setAmountG(e.target.value)}
                  className="h-7 w-14"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">&nbsp;</span>
                <span className="flex h-7 items-center text-xs text-muted-foreground">
                  {t.dailyEntry.macroModePerPortionOption}
                </span>
              </div>
            )}
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

/**
 * Creates a brand-new dictionary entry (#149) — same name + per-100g
 * nutrition fields `MealItemRow`'s own pencil-triggered editor already
 * uses, just starting from a blank draft instead of an existing `MealItem`.
 * `touch(name, nutrition)` is already a create-or-update primitive
 * independent of any day's log, so no new store action is needed here.
 */
function AddMealItemForm({
  onAdd,
  onCancel,
}: {
  onAdd: (
    name: string,
    nutrition: {
      amountKcal: number
      proteinG: number | undefined
      fatG: number | undefined
      carbsG: number | undefined
      amountG: number
    },
  ) => void
  onCancel: () => void
}) {
  const t = useTranslation()
  const locale = useLocale()
  const [name, setName] = useState('')
  const [kcal100, setKcal100] = useState('')
  const [protein100, setProtein100] = useState('')
  const [fat100, setFat100] = useState('')
  const [carbs100, setCarbs100] = useState('')
  const [amountG, setAmountG] = useState('1')
  // Per 100g / Per portion entry mode (#170).
  const [macroMode, setMacroMode] = useState<'per100g' | 'perPortion'>(
    'per100g',
  )

  function handleMacroModeChange(newMode: 'per100g' | 'perPortion') {
    if (newMode === macroMode) return
    const amountNum = parseNumberInput(kcal100)
    if (amountNum && amountNum > 0) {
      if (newMode === 'perPortion') {
        const scaled = scaleFromPer100g(
          amountNum,
          parseOptionalMacro(protein100),
          parseOptionalMacro(fat100),
          parseOptionalMacro(carbs100),
          amountG,
        )
        setKcal100(String(scaled.amountKcal))
        setProtein100(
          scaled.proteinG === undefined ? '' : String(scaled.proteinG),
        )
        setFat100(scaled.fatG === undefined ? '' : String(scaled.fatG))
        setCarbs100(scaled.carbsG === undefined ? '' : String(scaled.carbsG))
      } else {
        const rates = ratesFromAbsolute(
          amountNum,
          parseOptionalMacro(protein100),
          parseOptionalMacro(fat100),
          parseOptionalMacro(carbs100),
          portionsToGrams(amountG),
        )
        setKcal100(String(rates.kcal100))
        setProtein100(
          rates.protein100 === undefined ? '' : String(rates.protein100),
        )
        setFat100(rates.fat100 === undefined ? '' : String(rates.fat100))
        setCarbs100(rates.carbs100 === undefined ? '' : String(rates.carbs100))
        setAmountG(String(rates.portions))
      }
    }
    setMacroMode(newMode)
  }

  const kcal100Num = parseNumberInput(kcal100)
  const canSave = name.trim() !== '' && kcal100Num !== undefined && kcal100Num >= 0
  const scale = (kcalRate: number) =>
    macroMode === 'per100g'
      ? scaleFromPer100g(
          kcalRate,
          parseOptionalMacro(protein100),
          parseOptionalMacro(fat100),
          parseOptionalMacro(carbs100),
          amountG,
        )
      : totalFromPortion(
          kcalRate,
          parseOptionalMacro(protein100),
          parseOptionalMacro(fat100),
          parseOptionalMacro(carbs100),
          amountG,
        )
  const nutritionPreview =
    kcal100Num && kcal100Num > 0
      ? formatComputedTotal(scale(kcal100Num), locale, t)
      : null

  function save() {
    if (!canSave || kcal100Num === undefined) return
    const scaled = scale(kcal100Num)
    onAdd(name.trim(), { ...scaled, amountG: scaled.amountG ?? 100 })
  }

  return (
    <li className="flex flex-col gap-1.5 rounded-lg bg-muted/40 px-2 py-1.5">
      <Input
        type="text"
        aria-label={t.settings.mealItemNameLabel}
        placeholder={t.settings.mealItemNameLabel}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8"
      />
      <ToggleGroup
        type="single"
        aria-label={t.dailyEntry.macroModeLabel}
        value={macroMode}
        onValueChange={(value) =>
          value && handleMacroModeChange(value as 'per100g' | 'perPortion')
        }
        className="w-fit gap-2 p-0.5"
      >
        <ToggleGroupItem value="per100g" className="h-7 px-3 text-xs">
          {t.dailyEntry.macroModePer100gOption}
        </ToggleGroupItem>
        <ToggleGroupItem value="perPortion" className="h-7 px-3 text-xs">
          {t.dailyEntry.macroModePerPortionOption}
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {macroMode === 'per100g'
              ? t.dailyEntry.addCaloriesLabel
              : t.dailyEntry.addCaloriesPortionLabel}
          </span>
          <Input
            type="text"
            inputMode="decimal"
            aria-label={t.dailyEntry.addCaloriesLabel}
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
            aria-label={t.dailyEntry.proteinLabel}
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
            aria-label={t.dailyEntry.fatLabel}
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
            aria-label={t.dailyEntry.carbsLabel}
            value={carbs100}
            onChange={(e) => setCarbs100(e.target.value)}
            className="h-7 w-14"
          />
        </div>
        {macroMode === 'per100g' ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {t.dailyEntry.itemPortionsLabel}
            </span>
            <Input
              type="text"
              inputMode="decimal"
              aria-label={t.dailyEntry.itemPortionsLabel}
              value={amountG}
              onChange={(e) => setAmountG(e.target.value)}
              className="h-7 w-14"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">&nbsp;</span>
            <span className="flex h-7 items-center text-xs text-muted-foreground">
              {t.dailyEntry.macroModePerPortionOption}
            </span>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canSave}
          onClick={save}
        >
          {t.dailyEntry.saveButton}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t.settings.cancelAddMealItemLabel}
        </Button>
      </div>
      {nutritionPreview && (
        <p className="text-xs text-muted-foreground">
          {t.dailyEntry.computedTotalPrefix} {nutritionPreview}
        </p>
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
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    loadItems()
  }, [loadItems])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t.settings.mealItemsDescription}
      </p>
      {items.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground">
          {t.settings.mealItemsEmpty}
        </p>
      )}
      {(items.length > 0 || isAdding) && (
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
          {isAdding && (
            <AddMealItemForm
              onAdd={(name, nutrition) => {
                touch(name, nutrition)
                setIsAdding(false)
              }}
              onCancel={() => setIsAdding(false)}
            />
          )}
        </ul>
      )}
      {!isAdding && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setIsAdding(true)}
        >
          {t.settings.addMealItemButton}
        </Button>
      )}
    </div>
  )
}
