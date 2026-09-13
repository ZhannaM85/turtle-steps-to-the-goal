import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/empty-state'

/**
 * Top-level crash fallback (#102) — wired as the router's `errorElement`,
 * which React Router wraps every route in automatically. Without this, an
 * uncaught render error anywhere in the app unmounts the whole tree with
 * nothing shown, indistinguishable from a genuinely broken/slow load.
 * #879 — same EmptyState family as History / Dashboard empty.
 */
export function RouteErrorFallback() {
  const t = useTranslation()

  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <EmptyState
        title={t.error.title}
        description={t.error.description}
        action={
          <Button type="button" onClick={() => window.location.reload()}>
            {t.error.reloadButton}
          </Button>
        }
      />
    </div>
  )
}
