import { useState } from 'react'
import { useTranslation } from '@/i18n'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import { isPdfDebugEnabled, setPdfDebugEnabled } from './pdfDebug'

/**
 * #952 — in-app On/Off for the existing `localStorage pdfDebug` flag so the
 * installed PWA can dump the #939 overlay without a `?pdfDebug=1` URL.
 */
export function PdfDebugToggle() {
  const t = useTranslation()
  const [enabled, setEnabled] = useState(() => isPdfDebugEnabled())

  function handleChange(value: string) {
    if (!value) return
    setPdfDebugEnabled(value === 'on')
    setEnabled(isPdfDebugEnabled())
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{t.export.pdfDebugToggleLabel}</span>
      <span className="text-sm text-muted-foreground">
        {t.export.pdfDebugToggleHelp}
      </span>
      <ToggleGroup
        type="single"
        aria-label={t.export.pdfDebugToggleLabel}
        value={enabled ? 'on' : 'off'}
        onValueChange={handleChange}
      >
        <ToggleGroupItem value="off" className="h-12">
          {t.export.pdfDebugToggleOff}
        </ToggleGroupItem>
        <ToggleGroupItem value="on" className="h-12">
          {t.export.pdfDebugToggleOn}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}
