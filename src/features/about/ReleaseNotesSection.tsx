import { format, parseISO } from 'date-fns'
import { releaseNotes } from '@/data/releaseNotes'
import { getDateFnsLocale, useLocale } from '@/i18n'

export function ReleaseNotesSection() {
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)

  return (
    <ul className="flex max-h-80 flex-col gap-2.5 overflow-y-auto text-sm">
      {releaseNotes.map((note) => (
        <li key={note.version} className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">
            v{note.version} ·{' '}
            {format(parseISO(note.date), 'PPp', { locale: dateFnsLocale })}
          </span>
          <span className="text-foreground">{note[locale]}</span>
        </li>
      ))}
    </ul>
  )
}
