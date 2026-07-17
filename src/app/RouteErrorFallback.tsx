import { useTranslation } from '@/i18n'
import { Button } from '@/shared/ui/button'

/**
 * Top-level crash fallback (#102) — wired as the router's `errorElement`,
 * which React Router wraps every route in automatically. Without this, an
 * uncaught render error anywhere in the app unmounts the whole tree with
 * nothing shown, indistinguishable from a genuinely broken/slow load.
 */
export function RouteErrorFallback() {
  const t = useTranslation()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">{t.error.title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t.error.description}
      </p>
      <Button type="button" onClick={() => window.location.reload()}>
        {t.error.reloadButton}
      </Button>
    </div>
  )
}
