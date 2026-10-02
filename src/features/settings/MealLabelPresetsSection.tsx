import { useEffect, useState, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { getDictionary, useLocale, useTranslation, type Locale } from '@/i18n'
import { localizeLeftoverEnglishMealPresets } from '@/shared/lib/mealLabel'
import { ConfirmDeleteEntryBar } from '@/features/daily-log/ConfirmDeleteEntryBar'
import { useMealLabelPresetStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

const ALL_LOCALES: Locale[] = ['en', 'ru']

function SortablePresetRow({
  preset,
  children,
}: {
  preset: string
  children: (dragHandle: ReactNode) => ReactNode
}) {
  const t = useTranslation()
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: preset })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const dragHandle = (
    <button
      type="button"
      aria-label={t.settings.reorderPresetLabel(preset)}
      className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden="true" className="size-4" />
    </button>
  )
  return (
    <li ref={setNodeRef} style={style} className="flex flex-col gap-2">
      {children(dragHandle)}
    </li>
  )
}

export function MealLabelPresetsSection() {
  const t = useTranslation()
  const locale = useLocale()
  const presets = useMealLabelPresetStore((state) => state.presets)
  const addPreset = useMealLabelPresetStore((state) => state.addPreset)
  const renamePreset = useMealLabelPresetStore((state) => state.renamePreset)
  const removePreset = useMealLabelPresetStore((state) => state.removePreset)
  const reorderPresets = useMealLabelPresetStore((state) => state.reorderPresets)
  const dragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    reorderPresets(String(active.id), String(over.id))
  }
  const [newPreset, setNewPreset] = useState('')
  const [editingPreset, setEditingPreset] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

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
        <DndContext
          sensors={dragSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={presets} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {presets.map((preset) => (
            <SortablePresetRow key={preset} preset={preset}>
              {(dragHandle) => (
                <>
              {pendingDelete === preset ? (
                <ConfirmDeleteEntryBar
                  label={t.dailyEntry.confirmDeleteNamedLabel(preset)}
                  onConfirm={() => {
                    removePreset(preset)
                    setPendingDelete(null)
                  }}
                  onCancel={() => setPendingDelete(null)}
                />
              ) : null}
              <div className="flex items-center gap-2">
              {dragHandle}
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
                  onClick={() => setPendingDelete(preset)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              </div>
                </>
              )}
            </SortablePresetRow>
          ))}
        </ul>
          </SortableContext>
        </DndContext>
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
