import { PartyPopper } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/i18n'
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
 * separate end-of-week banner.
 */
export function GoalCelebrationModal() {
  const t = useTranslation()
  const { shouldCelebrate, dismiss } = useWeeklyGoalCelebration()

  return (
    <Dialog
      open={shouldCelebrate}
      onOpenChange={(open) => {
        if (!open) dismiss()
      }}
    >
      <DialogContent closeLabel={t.today.celebrationCloseLabel}>
        <div className="flex flex-col items-center gap-3 pt-1 text-center">
          <PartyPopper
            aria-hidden="true"
            className="size-8 text-primary"
          />
          <DialogTitle>{t.today.celebrationTitle}</DialogTitle>
          <DialogDescription>
            {t.today.celebrationDescription}
          </DialogDescription>
          <Button asChild onClick={dismiss}>
            <Link to="/goal">{t.today.celebrationCta}</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
