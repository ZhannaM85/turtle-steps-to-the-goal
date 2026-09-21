import { cn } from '@/shared/lib/utils'

/**
 * #499 / #910 / #970 — pin page chrome at the top of AppShell's inner
 * `#main-content` scrollport. The app header is `shrink-0` outside that
 * scrollport, so sticky offset is `top-0` (not the old header-height
 * calc used when header and page shared window scroll).
 * Negative horizontal margin + matching px bleed the opaque strip to the
 * main column edges so scrolled content does not show through.
 */
export const PAGE_STICKY_UNDER_APP_HEADER_CLASSNAME =
  'sticky top-0 z-10 -mx-4 border-b border-border bg-background px-4'

export function pageStickyUnderAppHeader(
  ...extra: Array<string | false | null | undefined>
): string {
  return cn(PAGE_STICKY_UNDER_APP_HEADER_CLASSNAME, ...extra)
}
