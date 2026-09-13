import { useState } from 'react'
import { Check, Pencil, Trash2 } from 'lucide-react'
import {
  EATING_REASONS,
  isBuiltInEatingReason,
  rewriteMealEatingReason,
  type EatingReason,
} from '@/domain/dailyEntry'
import { IndexedDbDailyEntryRepository } from '@/infrastructure/persistence/indexeddb/dailyEntryRepository'
import { getDictionary, useTranslation, type Locale } from '@/i18n'
import { useEatingReasonTrackingStore } from '@/stores'
import { eatingReasonDisplayLabel } from '@/shared/lib/eatingReasonDisplay'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { TrackedFieldToggleRow } from './TrackedFieldToggleRow'

const ALL_LOCALES: Locale[] = ['en', 'ru']

function isReservedCustomEatingReason(
  label: string,
  extraReserved: string[] = [],
): boolean {
  const trimmed = label.trim()
  if (!trimmed) return true
  if (isBuiltInEatingReason(trimmed.toLowerCase())) return true
  const lower = trimmed.toLowerCase()
  if (extraReserved.some((reason) => reason.toLowerCase() === lower)) {
    return true
  }
  return ALL_LOCALES.some((locale) => {
    const dict = getDictionary(locale)
    if (dict.dailyEntry.eatingReasonNoneOption.toLowerCase() === lower) {
      return true
    }
    return EATING_REASONS.some(
      (reason) =>
        dict.dailyEntry.eatingReasonLabel(reason).toLowerCase() === lower,
    )
  })
}

export function CustomEatingReasonsEditor() {
  const t = useTranslation()
  const enabled = useEatingReasonTrackingStore((state) => state.enabled)
  const setEnabled = useEatingReasonTrackingStore((state) => state.setEnabled)
  const customReasons = useEatingReasonTrackingStore(
    (state) => state.customReasons,
  )
  const builtinLabelOverrides = useEatingReasonTrackingStore(
    (state) => state.builtinLabelOverrides,
  )
  const addCustomReason = useEatingReasonTrackingStore(
    (state) => state.addCustomReason,
  )
  const removeCustomReason = useEatingReasonTrackingStore(
    (state) => state.removeCustomReason,
  )
  const renameCustomReason = useEatingReasonTrackingStore(
    (state) => state.renameCustomReason,
  )
  const setBuiltinLabelOverride = useEatingReasonTrackingStore(
    (state) => state.setBuiltinLabelOverride,
  )
  const [newReason, setNewReason] = useState('')
  const [editingReason, setEditingReason] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  function displayLabel(reason: string): string {
    return eatingReasonDisplayLabel(reason, t, builtinLabelOverrides)
  }

  function extraReservedLabels(exceptBuiltin?: EatingReason): string[] {
    const overrideLabels = EATING_REASONS.flatMap((reason) => {
      if (reason === exceptBuiltin) return []
      const label = builtinLabelOverrides[reason]
      return label ? [label] : []
    })
    return [...overrideLabels, ...customReasons]
  }

  function submitNewReason() {
    if (isReservedCustomEatingReason(newReason, extraReservedLabels())) return
    addCustomReason(newReason)
    setNewReason('')
  }

  function commitBuiltinEdit(reason: EatingReason) {
    const trimmed = editDraft.trim()
    const defaultLabel = t.dailyEntry.eatingReasonLabel(reason)
    if (!trimmed || trimmed === defaultLabel) {
      setBuiltinLabelOverride(reason, undefined)
      setEditingReason(null)
      return
    }
    if (isReservedCustomEatingReason(trimmed, extraReservedLabels(reason))) {
      return
    }
    setBuiltinLabelOverride(reason, trimmed)
    setEditingReason(null)
  }

  async function commitCustomEdit(from: string) {
    const trimmed = editDraft.trim()
    if (!trimmed || trimmed === from) {
      setEditingReason(null)
      return
    }
    if (isReservedCustomEatingReason(trimmed, extraReservedLabels())) return
    renameCustomReason(from, trimmed)
    if (useEatingReasonTrackingStore.getState().customReasons.includes(from)) {
      return
    }
    const repo = new IndexedDbDailyEntryRepository()
    const changed = rewriteMealEatingReason(await repo.getAll(), from, trimmed)
    for (const entry of changed) {
      await repo.upsert(entry)
    }
    setEditingReason(null)
  }

  function commitRowEdit(key: string) {
    if (isBuiltInEatingReason(key)) {
      commitBuiltinEdit(key)
      return
    }
    void commitCustomEdit(key)
  }

  function startEdit(key: string, currentLabel: string) {
    setEditingReason(key)
    setEditDraft(currentLabel)
  }

  return (
    <TrackedFieldToggleRow
      id="tracked-field-eatingReason"
      label={t.settings.eatingReasonTrackingLabel}
      description={t.settings.trackedFieldHintEatingReason}
      checked={enabled}
      onCheckedChange={setEnabled}
    >
      {enabled ? (
        <>
          <Label>{t.settings.customEatingReasonsLabel}</Label>
          <p className="text-sm text-muted-foreground">
            {t.settings.customEatingReasonsDescription}
          </p>
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto overscroll-y-contain">
        {EATING_REASONS.map((reason) => {
          const label = displayLabel(reason)
          return (
            <li key={reason} className="flex items-center gap-2">
              {editingReason === reason ? (
                <Input
                  type="text"
                  aria-label={t.settings.editCustomEatingReasonLabel(label)}
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitRowEdit(reason)
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      setEditingReason(null)
                    }
                  }}
                  className="h-8 flex-1"
                />
              ) : (
                <span className="flex-1 text-sm">{label}</span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  editingReason === reason
                    ? t.settings.saveCustomEatingReasonLabel(label)
                    : t.settings.editCustomEatingReasonLabel(label)
                }
                onClick={() => {
                  if (editingReason === reason) {
                    commitRowEdit(reason)
                    return
                  }
                  startEdit(reason, label)
                }}
              >
                {editingReason === reason ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Pencil aria-hidden="true" />
                )}
              </Button>
            </li>
          )
        })}
        {customReasons.map((reason) => (
          <li key={reason} className="flex items-center gap-2">
            {editingReason === reason ? (
              <Input
                type="text"
                aria-label={t.settings.editCustomEatingReasonLabel(reason)}
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void commitCustomEdit(reason)
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    setEditingReason(null)
                  }
                }}
                className="h-8 flex-1"
              />
            ) : (
              <span className="flex-1 text-sm">{reason}</span>
            )}
            <div className="flex shrink-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  editingReason === reason
                    ? t.settings.saveCustomEatingReasonLabel(reason)
                    : t.settings.editCustomEatingReasonLabel(reason)
                }
                onClick={() => {
                  if (editingReason === reason) {
                    void commitCustomEdit(reason)
                    return
                  }
                  startEdit(reason, reason)
                }}
              >
                {editingReason === reason ? (
                  <Check aria-hidden="true" />
                ) : (
                  <Pencil aria-hidden="true" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t.settings.deleteCustomEatingReasonLabel(reason)}
                onClick={() => removeCustomReason(reason)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
          </ul>
          <div className="flex items-center gap-2">
        <Input
          type="text"
          aria-label={t.settings.customEatingReasonsPlaceholder}
          placeholder={t.settings.customEatingReasonsPlaceholder}
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submitNewReason()
            }
          }}
          className="h-8 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={submitNewReason}
        >
          {t.dailyEntry.addButton}
        </Button>
          </div>
        </>
      ) : null}
    </TrackedFieldToggleRow>
  )
}
