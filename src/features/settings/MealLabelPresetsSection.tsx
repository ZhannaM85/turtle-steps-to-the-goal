import { useEffect, useState } from 'react'
import { Check, Pencil, Trash2 } from 'lucide-react'
import { getDictionary, useLocale, useTranslation, type Locale } from '@/i18n'
import { localizeLeftoverEnglishMealPresets } from '@/shared/lib/mealLabel'
import { useMealLabelPresetStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

const ALL_LOCALES: Locale[] = ['en', 'ru']

export function MealLabelPresetsSection() {
  const t = useTranslation()
  const locale = useLocale()
  const presets = useMealLabelPresetStore((state) => state.presets)
  const addPreset = useMealLabelPresetStore((state) => state.addPreset)
  const renamePreset = useMealLabelPresetStore((state) => state.renamePreset)
  const removePreset = useMealLabelPresetStore((state) => state.removePreset)
  const [newPreset, setNewPreset] = useState('')
  const [editingPreset, setEditingPreset] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  useEffect(() => {
    const next = localizeLeftoverEnglishMealPresets(presets, locale)
    if (
      next.length === presets.length &&
      next.every((name, index) => name === presets[index])
    ) {
      return
    }
    useMealLabelPresetStore.setState({ presets: next })
  }, [locale, presets])

  function submitNewPreset() {
    if (!newPreset.trim()) return
    addPreset(newPreset)
    setNewPreset('')
  }

  function startEdit(preset: string) {
    setEditingPreset(preset)
    setEditDraft(preset)
  }

  function commitEdit(from: string) {
    if (!editDraft.trim()) return
    renamePreset(from, editDraft)
    setEditingPreset(null)
  }

  // Built-in suggestions are offered as one-click adds rather than
  // auto-seeded into the store (see useMealLabelPresetStore) — only show
  // ones not already added. Checked against *every* locale's translation
  // of each default (#142), not just the active one — the four defaults
  // are positionally aligned across en.ts/ru.ts (same index = same
  // concept, e.g. "Breakfast"/"Завтрак" both at index 0), so a preset
  // already added in one language shouldn't also be suggested in another.
  const unaddedDefaults = t.dailyEntry.defaultMealNamePresets.filter(
    (_, index) =>
      !ALL_LOCALES.some((locale) =>
        presets.includes(
          getDictionary(locale).dailyEntry.defaultMealNamePresets[index],
        ),
      ),
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t.settings.mealNamePresetsDescription}
      </p>
      {presets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t.settings.mealNamePresetsEmpty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {presets.map((preset) => (
            <li key={preset} className="flex items-center gap-2">
              {editingPreset === preset ? (
                <Input
                  type="text"
                  aria-label={t.settings.editPresetLabel(preset)}
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitEdit(preset)
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      setEditingPreset(null)
                    }
                  }}
                  className="h-8 flex-1"
                />
              ) : (
                <span className="flex-1 text-sm">{preset}</span>
              )}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    editingPreset === preset
                      ? t.settings.savePresetLabel(preset)
                      : t.settings.editPresetLabel(preset)
                  }
                  onClick={() => {
                    if (editingPreset === preset) {
                      commitEdit(preset)
                      return
                    }
                    startEdit(preset)
                  }}
                >
                  {editingPreset === preset ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <Pencil aria-hidden="true" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.settings.deletePresetLabel(preset)}
                  onClick={() => removePreset(preset)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          aria-label={t.settings.addPresetPlaceholder}
          placeholder={t.settings.addPresetPlaceholder}
          value={newPreset}
          onChange={(e) => setNewPreset(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submitNewPreset()
            }
          }}
          className="h-8 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!newPreset.trim()}
          onClick={submitNewPreset}
        >
          {t.dailyEntry.addButton}
        </Button>
      </div>
      {unaddedDefaults.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unaddedDefaults.map((name) => (
            <Button
              key={name}
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t.settings.addDefaultPresetLabel(name)}
              onClick={() => addPreset(name)}
            >
              + {name}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
