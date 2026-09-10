import type { ComponentProps } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'

export interface NoteEditRowProps {
  textareaProps: ComponentProps<typeof Textarea>
  saveLabel: string
  onSave: () => void
  cancelLabel?: string
  onCancel?: () => void
}

/**
 * Shared Day note-style edit row (#840 / #841): auto-growing textarea (#417)
 * plus save checkmark (and optional cancel X). Same-row-same-height (#420):
 * the field floors at 48px so a short note matches the action buttons, and
 * the buttons stretch to the field’s height as it grows, with the icons
 * vertically centered (`icon-stretch`). Empty / single-line text (and the
 * placeholder) is padded into that 48px floor so it sits vertically
 * centered; multi-line growth keeps the same padding so the first line
 * doesn’t jump and the stretch checkmark still tracks the field.
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
    <div className="flex items-stretch gap-3">
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
        size="icon-stretch"
        aria-label={saveLabel}
        onClick={onSave}
      >
        <Check aria-hidden="true" />
      </Button>
      {onCancel && cancelLabel && (
        <Button
          type="button"
          variant="ghost"
          size="icon-stretch"
          aria-label={cancelLabel}
          onClick={onCancel}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}
