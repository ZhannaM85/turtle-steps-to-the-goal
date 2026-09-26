import { cn } from '@/shared/lib/utils'

/** Same separator `macrosSummaryCompact` uses between Б/Ж/У tokens. */
const MACRO_SEPARATOR = ' · '

/** #1004 — break a live nutrition sentence only between whole tokens
 * (label, kcal, each macro) and before "(было …)" / "(was …)". A plain
 * space inside "У 114г" must not be a wrap point. */
function previewPieces(text: string, splitLabel: boolean): string[] {
  const segments = text.split(MACRO_SEPARATOR)
  const pieces: string[] = []
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]
    if (index === 0 && splitLabel) {
      const colon = segment.indexOf(': ')
      if (colon !== -1) {
        pieces.push(segment.slice(0, colon + 1))
        const value = segment.slice(colon + 2)
        if (value.length > 0) pieces.push(` ${value}`)
        continue
      }
    }
    pieces.push(index === 0 ? segment : `${MACRO_SEPARATOR}${segment}`)
  }
  return pieces
}

function PreviewRow({
  row,
  text,
  splitLabel = false,
}: {
  row: 'current' | 'previous'
  text: string
  splitLabel?: boolean
}) {
  return (
    <span
      data-preview-row={row}
      className="flex min-w-0 flex-wrap items-baseline"
    >
      {previewPieces(text, splitLabel).map((piece, index) => (
        <span key={index} className="whitespace-nowrap">
          {piece}
        </span>
      ))}
    </span>
  )
}

/** Renders one nutrition preview sentence so a phone-width wrap cannot
 * split a macro ("У" / "114г") or a kcal figure. The previous total, when
 * present, is its own line. */
export function ReadableNutritionPreview({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const parenAt = text.indexOf(' (')
  const current = parenAt === -1 ? text : text.slice(0, parenAt)
  const previous = parenAt === -1 ? null : text.slice(parenAt + 1)

  return (
    <p className={cn('flex w-full min-w-0 flex-col gap-0.5', className)}>
      <PreviewRow row="current" text={current} splitLabel />
      {previous !== null && (
        <>
          {/* Keeps the space before "(было …)" in the sentence for reading
           * and copy, without giving the line a wrap point. */}
          <span className="sr-only"> </span>
          <PreviewRow row="previous" text={previous} />
        </>
      )}
    </p>
  )
}
