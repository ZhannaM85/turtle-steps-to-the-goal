import { describe, expect, it } from 'vitest'
import {
  applyUserCholesterol,
  cholesterolChoice,
} from './applyUserCholesterol'

describe('cholesterolChoice (#1013)', () => {
  it('drops a blank reason and keeps a typed one', () => {
    expect(cholesterolChoice('unknown', '  ')).toEqual({
      cholesterolImpact: 'unknown',
    })
    expect(cholesterolChoice('limit', '  Много насыщенных жиров. ')).toEqual({
      cholesterolImpact: 'limit',
      cholesterolReason: 'Много насыщенных жиров.',
    })
  })
})

describe('applyUserCholesterol (#1013)', () => {
  it('replaces a catalog label without changing macros', () => {
    const food = applyUserCholesterol(
      {
        name: 'Мой суп',
        lastAmountKcal: 90,
        cholesterolImpact: 'beneficial' as const,
        cholesterolReason: 'Овёс содержит клетчатку.',
      },
      cholesterolChoice('moderate', ''),
    )

    expect(food).toEqual({
      name: 'Мой суп',
      lastAmountKcal: 90,
      cholesterolImpact: 'moderate',
    })
  })
})
