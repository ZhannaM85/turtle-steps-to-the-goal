import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/** Opens the Add… menu when an action is not already showing, then returns it. */
export async function openAddMealAction(user: UserEvent, name: string) {
  const already = screen.queryByRole('menuitem', { name })
  if (already) return already
  await user.click(screen.getByRole('button', { name: 'Add…' }))
  return screen.getByRole('menuitem', { name })
}
