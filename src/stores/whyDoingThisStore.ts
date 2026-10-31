import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * #1115 — reasons for losing weight, shown on every Day date. Not stored
 * on a day log or a goal, so a new goal does not clear them. The Day
 * switch only hides the section.
 */
export interface WhyDoingThisCard {
  id: string
  text: string
}

interface WhyDoingThisState {
  cards: WhyDoingThisCard[]
  setCards: (cards: WhyDoingThisCard[]) => void
}

export const useWhyDoingThisStore = create<WhyDoingThisState>()(
  persist(
    (set) => ({
      cards: [],
      setCards: (cards) => set({ cards }),
    }),
    {
      name: 'turtle-steps-why-doing-this',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

/** Draft reorder for the Day editor. Nothing is written until Save. */
export function reorderWhyDoingThisDraft(
  cards: WhyDoingThisCard[],
  activeId: string,
  overId: string,
): WhyDoingThisCard[] {
  const oldIndex = cards.findIndex((card) => card.id === activeId)
  const newIndex = cards.findIndex((card) => card.id === overId)
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return cards
  const next = [...cards]
  const [moved] = next.splice(oldIndex, 1)
  if (!moved) return cards
  next.splice(newIndex, 0, moved)
  return next
}
