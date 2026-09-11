import type { ComponentProps } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'

export interface NoteEditRowProps {
  textareaProps: ComponentProps<typeof Textarea>
  saveLabel: string
  onSave: () => void
  cancelLabel: string
  onCancel: () => void
}

/**
 * Shared Day note-style edit row (#850): auto-growing textarea (#417)
 * plus a **fixed-size** save checkmark and clear ×. The field still floors
 * at 48px so a short note matches the `icon-xl` buttons (#420 / #841), but
 * the buttons stay 48×48 when the textarea grows — they must not stretch
 * with multi-line height. Empty / single-line text (and the placeholder)
 * is padded into that 48px floor so it sits vertically centered; multi-line
 * growth keeps the same padding so the first line doesn’t jump.
 *
 * Clear × is always shown (day note, morning note, Night food reason,
 * What helped) so peers stay consistent: discard a draft, or revert a
 * saved note.
 */
export function NoteEditRow({
  textareaProps,
  saveLabel,
  onSave,
  cancelLabel,
  onCancel,
}: NoteEditRowProps) {
  const { className: textareaClassName, ...restTextareaProps } = textareaProps

  return (
    <div className="flex items-start gap-3">
      <Textarea
        {...restTextareaProps}
        className={cn(
          textareaClassName,
          // 48px min-height − 1px border × 2 − 24px `leading-6`, split as
          // padding so one line is centered without growing past the floor.
          'min-h-12 flex-1 py-[11px] leading-6',
        )}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-xl"
        aria-label={saveLabel}
        onClick={onSave}
      >
        <Check aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xl"
        aria-label={cancelLabel}
        onClick={onCancel}
      >
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}
