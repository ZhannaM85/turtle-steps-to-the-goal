import * as React from 'react'

import { cn } from '@/shared/lib/utils'

/**
 * #417 — auto-grows to fit its content as the user types, instead of
 * scrolling text sideways inside a single fixed-height row (the plain
 * `Input` a longer day note used to sit in). Resized via a plain
 * `onInput` height recalculation (`scrollHeight`) rather than the newer
 * CSS `field-sizing: content` — this app is used on iOS Safari in
 * practice, and that property isn't reliably supported there yet, so a
 * JS-based resize is the one approach guaranteed to work everywhere.
 * Same `forwardRef` shape as `Input` (#241) — a caller's `ref` (e.g. React
 * Hook Form's `register()`) needs to reach the real `<textarea>` element.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, onInput, rows = 1, ...props }, ref) => {
  function resize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  return (
    <textarea
      ref={(el) => {
        // #449 — the forwarded ref (react-hook-form's register()) must run
        // first: for an uncontrolled field, RHF sets el.value from the
        // registered default *inside its own ref callback*, since there's
        // no React `value` prop doing it. Measuring scrollHeight before
        // that runs sees an empty textarea (always the 1-row min-height),
        // so a previous day's already-long note never grew to fit until
        // the user's own typing triggered a later onInput-driven resize.
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
        if (el) resize(el)
      }}
      rows={rows}
      data-slot="textarea"
      onInput={(e) => {
        resize(e.currentTarget)
        onInput?.(e)
      }}
      className={cn(
        'min-h-8 w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
