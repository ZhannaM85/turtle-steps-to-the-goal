import { PartyPopper } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { getDateFnsLocale, useLocale, useTranslation } from '@/i18n'
import { useWeeklyGoalCelebration } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/ui/dialog'

/**
 * Intentional exception to this app's usual quiet, no-badges treatment of
 * hitting a target (compare #6/#8/#29/#34) — reaching a weekly goal gets a
 * real modal, decided when #55 was scoped. Fires independently of #38's
 * separate end-of-week banner. #639: now phase-aware — 'inProgress'
 * (mid-week, reframed to not claim final achievement) and 'complete'
 * (the window actually ended with its target still met, the moment a new
 * goal can be started) are two different moments for the same window;
 * see `useWeeklyGoalCelebration.ts`. #778: the complete-week dialog can
 * be offered again after close until a new goal is set.
 */
export function GoalCelebrationModal() {
  const t = useTranslation()
  const locale = useLocale()
  const dateFnsLocale = getDateFnsLocale(locale)
  const { shouldCelebrate, phase, weekEnd, dismiss } =
    useWeeklyGoalCelebration()

  const weekEndLabel =
    weekEnd &&
    format(parseISO(weekEnd), 'PP', { locale: dateFnsLocale })

  return (
    <Dialog
      open={shouldCelebrate}
      onOpenChange={(open) => {
        if (!open) dismiss()
      }}
    >
      <DialogContent closeLabel={t.today.celebrationCloseLabel}>
        <div className="flex flex-col items-center gap-3 pt-1 text-center">
          <PartyPopper aria-hidden="true" className="size-8 text-primary" />
          {phase === 'complete' ? (
            <>
              <DialogTitle>{t.today.celebrationCompleteTitle}</DialogTitle>
              <DialogDescription>
                {t.today.celebrationCompleteDescription}
              </DialogDescription>
              <Button asChild onClick={dismiss}>
                <Link to="/goal">{t.today.celebrationCompleteCta}</Link>
              </Button>
            </>
          ) : (
            <>
              <DialogTitle>{t.today.celebrationTitle}</DialogTitle>
              <DialogDescription>
                {weekEndLabel
                  ? t.today.celebrationDescription(weekEndLabel)
                  : null}
              </DialogDescription>
              <Button asChild onClick={dismiss}>
                <Link to="/goal">{t.today.celebrationCta}</Link>
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
