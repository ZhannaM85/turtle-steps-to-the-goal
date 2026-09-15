import { cn } from '@/shared/lib/utils'

/**
 * #499 / #910 — pin page chrome under AppShell's sticky app header
 * (`sticky top-0`, ~2.75rem mobile / ~3.5rem sm+ with desktop nav + border).
 * Negative horizontal margin + matching px bleed the opaque strip to the
 * main column edges so scrolled content does not show through.
 */
export const PAGE_STICKY_UNDER_APP_HEADER_CLASSNAME =
  'sticky top-[calc(2.75rem+1px)] z-10 -mx-4 border-b border-border bg-background px-4 sm:top-[calc(3.5rem+1px)]'

export function pageStickyUnderAppHeader(
  ...extra: Array<string | false | null | undefined>
): string {
  return cn(PAGE_STICKY_UNDER_APP_HEADER_CLASSNAME, ...extra)
}
