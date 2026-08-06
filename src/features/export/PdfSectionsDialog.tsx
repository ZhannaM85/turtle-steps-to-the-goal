import { useState } from 'react'
import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group'
import type { PdfSections } from './exportPdf'

export interface PdfSectionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (sections: PdfSections) => void
  submitting: boolean
}

const ALL_SECTION_KEYS = ['weightTrend', 'weeklyAverages', 'bodyMeasurements']

/**
 * #629 — lets the user pick which optional sections go into the PDF
 * summary (#609) before it's generated, instead of always bundling all of
 * them. Same multi-select `ToggleGroup` shape Settings' own "what to
 * track" groups already use, rather than introducing a new checkbox
 * primitive. The disclaimer footer isn't offered here — #609's own
 * acceptance criteria keep it unconditional.
 */
export function PdfSectionsDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: PdfSectionsDialogProps) {
  const t = useTranslation()
  const [selected, setSelected] = useState<string[]>(ALL_SECTION_KEYS)

  function handleSubmit() {
    onSubmit({
      weightTrend: selected.includes('weightTrend'),
      weeklyAverages: selected.includes('weeklyAverages'),
      bodyMeasurements: selected.includes('bodyMeasurements'),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t.export.closePdfSectionsDialogLabel}>
        <DialogTitle>{t.export.pdfSectionsDialogTitle}</DialogTitle>
        <DialogDescription>
          {t.export.pdfSectionsDialogDescription}
        </DialogDescription>
        <div className="flex flex-col gap-4 pt-4">
          <ToggleGroup
            type="multiple"
            aria-label={t.export.pdfSectionsDialogTitle}
            value={selected}
            onValueChange={setSelected}
            className="flex-wrap"
          >
            <ToggleGroupItem value="weightTrend" className="h-12">
              {t.export.pdfSectionWeightTrendLabel}
            </ToggleGroupItem>
            <ToggleGroupItem value="weeklyAverages" className="h-12">
              {t.export.pdfSectionWeeklyAveragesLabel}
            </ToggleGroupItem>
            <ToggleGroupItem value="bodyMeasurements" className="h-12">
              {t.export.pdfSectionBodyMeasurementsLabel}
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="self-start"
          >
            {submitting
              ? t.export.exportingPdfButton
              : t.export.pdfSectionsGenerateButton}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
