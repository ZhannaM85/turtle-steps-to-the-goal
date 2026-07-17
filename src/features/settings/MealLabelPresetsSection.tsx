import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { useMealLabelPresetStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

export function MealLabelPresetsSection() {
  const t = useTranslation()
  const presets = useMealLabelPresetStore((state) => state.presets)
  const addPreset = useMealLabelPresetStore((state) => state.addPreset)
  const removePreset = useMealLabelPresetStore((state) => state.removePreset)
  const [newPreset, setNewPreset] = useState('')

  function submitNewPreset() {
    if (!newPreset.trim()) return
    addPreset(newPreset)
    setNewPreset('')
  }

  // Built-in suggestions are offered as one-click adds rather than
  // auto-seeded into the store (see useMealLabelPresetStore) — only show
  // ones not already added.
  const unaddedDefaults = t.dailyEntry.defaultMealNamePresets.filter(
    (name) => !presets.includes(name),
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
              <span className="flex-1 text-sm">{preset}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t.settings.deletePresetLabel(preset)}
                onClick={() => removePreset(preset)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
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
