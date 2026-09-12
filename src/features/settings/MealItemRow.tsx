import { useState } from 'react'
import { Check, Pencil, Share2, Star, Trash2 } from 'lucide-react'
import { formatNumber, useLocale, useTranslation } from '@/i18n'
import type { MealItem, MealItemServing } from '@/domain/mealItem'
import { formatBarcodeDisplay } from '@/shared/lib/formatBarcode'
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
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import {
  macroFieldLabel,
  nutritionFieldClassName,
} from './mealItemsSectionShared'

export function MealItemRow({
  item,
  onRename,
  onDelete,
  onSaveNutrition,
  onSaveBarcode,
  onReassignBarcode,
  onBarcodeMoved,
  onSaveBrand,
  onToggleFavorite,
  onSaveServings,
  onShare,
}: {
  item: MealItem
  onRename: (id: string, name: string) => void | Promise<void>
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
  ) => void | Promise<void>
  onSaveBarcode: (
    id: string,
    barcode: string | undefined,
  ) => Promise<{ takenBy?: string; takenById?: string }>
  onReassignBarcode: (
    fromId: string,
    toId: string,
    barcode: string,
  ) => void | Promise<void>
  onBarcodeMoved: (other: { id: string; name: string }) => void
  onSaveBrand: (id: string, brand: string | undefined) => void | Promise<void>
  onToggleFavorite: (id: string) => void
  onSaveServings: (id: string, servings: MealItemServing[]) => void
  onShare: (item: MealItem) => void
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
  // #779 — typed onto an existing food so the next scan matches locally.
  const [barcodeDraft, setBarcodeDraft] = useState(item.barcode ?? '')
  const [brandDraft, setBrandDraft] = useState(item.brand ?? '')
  const [barcodeError, setBarcodeError] = useState('')
  const [barcodeTaken, setBarcodeTaken] = useState<{
    id: string
    name: string
  } | null>(null)
  // #603 — draft fields for the "add a serving" row only; the list itself
  // reads straight from `item.servings` and commits immediately on
  // add/remove, same "doesn't wait for Save" shape favoriting already has.
  const [draftServingName, setDraftServingName] = useState('')
  const [draftServingGrams, setDraftServingGrams] = useState('')
  // Per 100g / Per portion entry mode (#170, extending #111's toggle from
  // manual meal entry to this screen's editor).
  const [macroMode, setMacroMode] = useState<'per100g' | 'perPortion'>(
    'per100g',
  )

  async function commit() {
    const trimmed = value.trim()
    if (trimmed && trimmed !== item.name) {
      await onRename(item.id, trimmed)
    } else {
      setValue(item.name)
    }
  }

  /** #589 — leave edit without saving nutrition or renaming. */
  function cancelEditing() {
    setValue(item.name)
    setBarcodeDraft(item.barcode ?? '')
    setBrandDraft(item.brand ?? '')
    setBarcodeError('')
    setBarcodeTaken(null)
    setIsEditingNutrition(false)
  }

  // Per-100g + quantity (#99), same input model #96 already uses
  // everywhere else — a MealItem's stored lastAmountKcal etc. are the
  // *last logged absolute totals*, so back-calculate a rate + quantity to
  // prefill editing rather than showing the raw totals directly. A bare
  // name with nothing recorded yet just starts blank. Always resets to
  // per100g mode (#170) — same as restoring a suggestion elsewhere in the
  // app, since MealItem.lastAmountKcal etc. don't carry a mode of their own.
  // #584: the same pencil also reveals the name Input (plain text until then).
  function startEditNutrition() {
    setValue(item.name)
    setBarcodeDraft(item.barcode ?? '')
    setBrandDraft(item.brand ?? '')
    setBarcodeError('')
    setBarcodeTaken(null)
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

  async function saveNutrition() {
    const nextBarcode = barcodeDraft.replace(/\s+/g, '').trim() || undefined
    const nextBrand = brandDraft.trim() || undefined
    const parsedKcal100 = parseNumberInput(kcal100)
    // #784 — brand is not unique and is not rewritten by `touch()`. Barcode
    // is unique (`&barcode`) and `touch()` used to put an explicit undefined
    // barcode field. Write nutrition first, barcode last, and surface a
    // collision instead of silently dropping the code.
    await commit()
    await onSaveBrand(item.id, nextBrand)
    if (parsedKcal100 !== undefined && parsedKcal100 >= 0) {
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
      const nameForSave = value.trim() || item.name
      await onSaveNutrition(nameForSave, {
        ...scaled,
        amountG: scaled.amountG ?? 100,
      })
    }
    const barcodeResult = await onSaveBarcode(item.id, nextBarcode)
    if (barcodeResult.takenBy && barcodeResult.takenById) {
      setBarcodeError(
        t.settings.mealItemBarcodeTakenMessage(barcodeResult.takenBy),
      )
      setBarcodeTaken({
        id: barcodeResult.takenById,
        name: barcodeResult.takenBy,
      })
      return
    }
    setBarcodeError('')
    setBarcodeTaken(null)
    setIsEditingNutrition(false)
  }

  async function moveBarcodeHere() {
    if (!barcodeTaken) return
    const nextBarcode = barcodeDraft.replace(/\s+/g, '').trim()
    if (!nextBarcode) return
    const other = barcodeTaken
    await onReassignBarcode(other.id, item.id, nextBarcode)
    setBarcodeError('')
    setBarcodeTaken(null)
    setIsEditingNutrition(false)
    onBarcodeMoved(other)
  }

  // #603 — stores the same label in both `en`/`ru` rather than asking a
  // single-language user to also type a translation; see `MealItemServing`'s
  // own doc comment for the reasoning.
  const draftServingGramsNum = parseNumberInput(draftServingGrams)
  const canAddServing =
    draftServingName.trim() !== '' &&
    draftServingGramsNum !== undefined &&
    draftServingGramsNum > 0

  function addServing() {
    if (!canAddServing || draftServingGramsNum === undefined) return
    const name = draftServingName.trim()
    onSaveServings(item.id, [
      ...(item.servings ?? []),
      { en: name, ru: name, grams: draftServingGramsNum },
    ])
    setDraftServingName('')
    setDraftServingGrams('')
  }

  function removeServing(index: number) {
    onSaveServings(
      item.id,
      (item.servings ?? []).filter((_, i) => i !== index),
    )
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
    <li className="flex flex-col gap-1.5" data-meal-item-id={item.id}>
      {isEditingNutrition ? (
        // #583 rework — one bordered panel around name + nutrition so the
        // edit chrome reads as a single card (name was outside the border).
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/40 px-2 py-1.5">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">
                {t.settings.mealItemNameLabel}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    item.favorite
                      ? t.dailyEntry.unfavoriteFoodLabel(item.name)
                      : t.dailyEntry.favoriteFoodLabel(item.name)
                  }
                  aria-pressed={item.favorite ?? false}
                  onClick={() => onToggleFavorite(item.id)}
                >
                  <Star
                    aria-hidden="true"
                    className={cn(item.favorite && 'fill-current')}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.settings.saveMealItemLabel(item.name)}
                  onClick={() => void saveNutrition()}
                >
                  <Check aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.settings.shareMealItemLabel(item.name)}
                  onClick={() => onShare(item)}
                >
                  <Share2 aria-hidden="true" />
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
            </div>
            <Input
              type="text"
              aria-label={t.settings.mealItemNameLabel}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  // #589 — commit name with Save / check, not blur,
                  // so Cancel can discard a typed rename.
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              className={cn('h-12 w-full text-base', nutritionFieldClassName)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">
              {t.dailyEntry.itemBrandLabel}
            </span>
            <Input
              type="text"
              aria-label={`${t.dailyEntry.itemBrandLabel} — ${item.name}`}
              placeholder={t.dailyEntry.itemBrandPlaceholder}
              value={brandDraft}
              onChange={(e) => setBrandDraft(e.target.value)}
              className={cn('h-12 text-base', nutritionFieldClassName)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-muted-foreground">
              {t.settings.mealItemBarcodeLabel}
            </span>
            <Input
              type="text"
              inputMode="numeric"
              aria-label={`${t.settings.mealItemBarcodeLabel} — ${item.name}`}
              placeholder={t.dailyEntry.scanBarcodeManualPlaceholder}
              value={barcodeDraft}
              onChange={(e) => {
                setBarcodeDraft(e.target.value)
                if (barcodeError) setBarcodeError('')
                if (barcodeTaken) setBarcodeTaken(null)
              }}
              className={cn('h-12 text-base', nutritionFieldClassName)}
              aria-invalid={barcodeError ? true : undefined}
            />
            {barcodeError ? (
              <p className="text-sm text-destructive" role="alert">
                {barcodeError}
              </p>
            ) : null}
            {barcodeTaken ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full text-base"
                onClick={() => void moveBarcodeHere()}
              >
                {t.settings.mealItemBarcodeMoveHereButton}
              </Button>
            ) : null}
          </div>
          <ToggleGroup
            type="single"
            aria-label={`${t.dailyEntry.macroModeLabel} — ${item.name}`}
            value={macroMode}
            onValueChange={(value) =>
              value && handleMacroModeChange(value as 'per100g' | 'perPortion')
            }
            className="w-fit gap-2 p-0.5"
          >
            <ToggleGroupItem value="per100g" className="h-10 px-4 text-sm">
              {t.dailyEntry.macroModePer100gOption}
            </ToggleGroupItem>
            <ToggleGroupItem value="perPortion" className="h-10 px-4 text-sm">
              {t.dailyEntry.macroModePerPortionOption}
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-sm font-medium text-foreground">
            {t.dailyEntry.itemNutritionSectionLabel(macroMode === 'per100g')}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {macroMode === 'per100g'
                  ? t.dailyEntry.addCaloriesLabel
                  : t.dailyEntry.addCaloriesPortionLabel}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`${
                  macroMode === 'per100g'
                    ? t.dailyEntry.addCaloriesLabel
                    : t.dailyEntry.addCaloriesPortionLabel
                } — ${item.name}`}
                value={kcal100}
                onChange={(e) => setKcal100(e.target.value)}
                className={cn('h-12 text-base', nutritionFieldClassName)}
              />
            </div>
            {macroMode === 'per100g' ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">
                  {t.dailyEntry.itemPortionsLabel}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={`${t.dailyEntry.itemPortionsLabel} — ${item.name}`}
                  value={amountG}
                  onChange={(e) => setAmountG(e.target.value)}
                  className={cn('h-12 text-base', nutritionFieldClassName)}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm text-muted-foreground">&nbsp;</span>
                <span className="flex h-12 items-center text-base text-muted-foreground">
                  {t.dailyEntry.macroModePerPortionOption}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {macroFieldLabel('protein', macroMode, t)}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`${macroFieldLabel('protein', macroMode, t)} — ${item.name}`}
                value={protein100}
                onChange={(e) => setProtein100(e.target.value)}
                className={cn('h-12 text-base', nutritionFieldClassName)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {macroFieldLabel('fat', macroMode, t)}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`${macroFieldLabel('fat', macroMode, t)} — ${item.name}`}
                value={fat100}
                onChange={(e) => setFat100(e.target.value)}
                className={cn('h-12 text-base', nutritionFieldClassName)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-muted-foreground">
                {macroFieldLabel('carbs', macroMode, t)}
              </span>
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`${macroFieldLabel('carbs', macroMode, t)} — ${item.name}`}
                value={carbs100}
                onChange={(e) => setCarbs100(e.target.value)}
                className={cn('h-12 text-base', nutritionFieldClassName)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void saveNutrition()}
            >
              {t.dailyEntry.saveButton}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t.settings.cancelAddMealItemLabel}
              onClick={cancelEditing}
            >
              {t.settings.cancelAddMealItemLabel}
            </Button>
          </div>
          {nutritionPreview && (
            <p className="text-xs text-muted-foreground">
              {t.dailyEntry.computedTotalPrefix} {nutritionPreview}
            </p>
          )}
          {/* #603 — named serving descriptors, same convenience #254 gave
           * curated foods; picked up automatically by FoodPickerDialog's
           * own servings toggle once at least one exists. */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-foreground">
              {t.settings.mealItemServingsLabel}
            </p>
            {item.servings && item.servings.length > 0 && (
              <ul className="flex flex-col gap-1">
                {item.servings.map((serving, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1 text-xs text-foreground"
                  >
                    <span>
                      {serving[locale]} —{' '}
                      {formatNumber(serving.grams, locale, 0)}g
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.settings.removeMealItemServingLabel(
                        serving[locale],
                      )}
                      onClick={() => removeServing(index)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {t.settings.mealItemServingNameLabel}
                </span>
                <Input
                  type="text"
                  aria-label={`${t.settings.mealItemServingNameLabel} — ${item.name}`}
                  placeholder={t.settings.mealItemServingNamePlaceholder}
                  value={draftServingName}
                  onChange={(e) => setDraftServingName(e.target.value)}
                  className={cn('h-7 w-28', nutritionFieldClassName)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">
                  {t.settings.mealItemServingGramsLabel}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  aria-label={`${t.settings.mealItemServingGramsLabel} — ${item.name}`}
                  value={draftServingGrams}
                  onChange={(e) => setDraftServingGrams(e.target.value)}
                  className={cn('h-7 w-16', nutritionFieldClassName)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canAddServing}
                onClick={addServing}
              >
                {t.settings.addMealItemServingButton}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {/* #584 — plain text until pencil (same pencil opens nutrition edit). */}
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">
              {item.name}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                item.favorite
                  ? t.dailyEntry.unfavoriteFoodLabel(item.name)
                  : t.dailyEntry.favoriteFoodLabel(item.name)
              }
              aria-pressed={item.favorite ?? false}
              onClick={() => onToggleFavorite(item.id)}
            >
              <Star
                aria-hidden="true"
                className={cn(item.favorite && 'fill-current')}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.settings.editMealItemLabel(item.name)}
              onClick={() => startEditNutrition()}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t.settings.shareMealItemLabel(item.name)}
              onClick={() => onShare(item)}
            >
              <Share2 aria-hidden="true" />
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
          {item.lastAmountKcal !== undefined && (
            <span className="pl-1 text-xs text-muted-foreground">
              {formatNumber(item.lastAmountKcal, locale, 0)}{' '}
              {t.dailyEntry.kcalUnit} {t.dailyEntry.lastLoggedLabel} ·{' '}
              {macrosSummaryTextCompact(
                item.lastProteinG,
                item.lastFatG,
                item.lastCarbsG,
                locale,
                t,
              )}
            </span>
          )}
          {item.brand && (
            <span className="pl-1 text-xs text-muted-foreground">
              {item.brand}
            </span>
          )}
          {item.barcode && (
            <span className="pl-1 text-xs text-muted-foreground">
              {t.dailyEntry.itemBarcodeLabel(formatBarcodeDisplay(item.barcode))}
            </span>
          )}
        </>
      )}
    </li>
  )
}
