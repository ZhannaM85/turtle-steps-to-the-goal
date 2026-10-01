import { useState } from 'react'
import {
  parseCatalogFoodPaste,
  type CatalogFoodPasteError,
  type CatalogFoodPasteFailure,
} from '@/domain/catalogFoodImport'
import { useTranslation, type Dictionary } from '@/i18n'
import { useCatalogFoodImportStore } from '@/stores'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

function pasteErrorText(t: Dictionary, error: CatalogFoodPasteError): string {
  if (error === 'wrong-basis') return t.settings.catalogFoodImportWrongBasis
  if (error === 'empty') return t.settings.catalogFoodImportEmpty
  return t.settings.catalogFoodImportInvalidJson
}

function failureText(t: Dictionary, failure: CatalogFoodPasteFailure): string {
  const reason =
    failure.reason === 'missing-name'
      ? t.settings.catalogFoodImportMissingName
      : failure.reason === 'missing-macros'
        ? t.settings.catalogFoodImportMissingMacros
        : failure.reason === 'wrong-basis'
          ? t.settings.catalogFoodImportWrongBasis
          : t.settings.catalogFoodImportNotFood
  return t.settings.catalogFoodImportFailure(failure.label, reason)
}

/** #1015 — paste JSON into the searchable catalog. Near the LDL toggle.
 * #1054 reuses this form from Add meal (`framed` drops the Settings divider). */
export function CatalogFoodImportSection({
  framed = true,
}: {
  framed?: boolean
} = {}) {
  const t = useTranslation()
  const importFoods = useCatalogFoodImportStore((state) => state.importFoods)
  const [text, setText] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  async function onImport() {
    const parsed = parseCatalogFoodPaste(text)
    if (!parsed.ok) {
      setLines([pasteErrorText(t, parsed.error)])
      return
    }
    const failures = parsed.failures.map((failure) => failureText(t, failure))
    if (parsed.foods.length === 0) {
      setLines(
        failures.length > 0 ? failures : [t.settings.catalogFoodImportEmpty],
      )
      return
    }
    setBusy(true)
    try {
      const { added, updated } = await importFoods(parsed.foods)
      setLines([t.settings.catalogFoodImportSuccess(added, updated), ...failures])
    } catch {
      setLines([t.settings.catalogFoodImportSaveFailed])
    } finally {
      setBusy(false)
    }
  }

  const fieldId = framed ? 'catalog-food-import' : 'catalog-food-import-dialog'
  return (
    <div
      className={
        framed
          ? 'flex flex-col gap-2 border-t border-border pt-4'
          : 'flex flex-col gap-2'
      }
    >
      {framed ? (
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {t.settings.catalogFoodImportLabel}
        </Label>
      ) : null}
      <span className="text-sm text-muted-foreground">
        {t.settings.catalogFoodImportDescription}
      </span>
      <Textarea
        id={fieldId}
        aria-label={framed ? undefined : t.settings.catalogFoodImportLabel}
        value={text}
        rows={6}
        className="min-h-28 font-mono text-xs"
        placeholder={t.settings.catalogFoodImportPlaceholder}
        onChange={(event) => setText(event.target.value)}
      />
      <Button
        type="button"
        size="sm"
        className="self-start"
        disabled={busy || text.trim() === ''}
        onClick={() => void onImport()}
      >
        {t.settings.catalogFoodImportButton}
      </Button>
      {lines.length > 0 && (
        <div role="status" className="flex flex-col gap-1 text-sm">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
    </div>
  )
}
