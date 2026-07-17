import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { releaseNotes } from '@/data/releaseNotes'
import { getDateFnsLocale, useLocale, useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'

export function ReleaseNotesSection() {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        {isExpanded ? t.settings.hideReleaseNotes : t.settings.showReleaseNotes}
        {isExpanded ? (
          <ChevronUp aria-hidden="true" />
        ) : (
          <ChevronDown aria-hidden="true" />
        )}
      </Button>
      {isExpanded && (
        <ul className="flex max-h-80 flex-col gap-2.5 overflow-y-auto text-sm">
          {releaseNotes.map((note, index) => (
            <li key={index} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">
                {format(parseISO(note.date), 'PPp', { locale: dateFnsLocale })}
              </span>
              <span className="text-foreground">{note[locale]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
