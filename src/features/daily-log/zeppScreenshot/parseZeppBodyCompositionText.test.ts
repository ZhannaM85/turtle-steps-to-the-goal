import { describe, expect, it } from 'vitest'
import {
  hasZeppBodyCompositionValues,
  parseZeppBodyCompositionText,
} from './parseZeppBodyCompositionText'

const ZEPP_EN = `
Zhanna
17 August at 11:30
1188
Didn't reach goals Reach goal
Reached 6 goals
BMI 21,8 Normal
Body fat 32,7 % Normal
Muscle 37,61 kg Great
Water 48,0 % Normal
Visceral fat 5 Normal
Bone mass 2,33 kg Normal
Other items
Body age 46
`

const TURTLE_STEPS_RU = `
Дата
17 Aug 2026
Состав тела
Мышечная масса
37,61
кг
↑ 0,54 кг по сравнению со вчера
Висцеральный жир
5
Вода в организме
48
%
↑ 0,2% по сравнению со вчера
Костная масса
2,33
кг
Процент жира
32,7
%
`

describe('parseZeppBodyCompositionText', () => {
  it('reads the five fields and date from an English Zepp measurement list', () => {
    expect(parseZeppBodyCompositionText(ZEPP_EN, '2026-08-17')).toEqual({
      bodyFatPercent: 32.7,
      muscleMassKg: 37.61,
      bodyWaterPercent: 48,
      visceralFatRating: 5,
      boneMassKg: 2.33,
      date: '2026-08-17',
    })
  })

  it('reads Russian Day-screen labels when values sit on the next line', () => {
    expect(parseZeppBodyCompositionText(TURTLE_STEPS_RU, '2026-08-17')).toEqual({
      bodyFatPercent: 32.7,
      muscleMassKg: 37.61,
      bodyWaterPercent: 48,
      visceralFatRating: 5,
      boneMassKg: 2.33,
      date: '2026-08-17',
    })
  })

  it('does not treat BMI or body age as tracked fields', () => {
    const reading = parseZeppBodyCompositionText(ZEPP_EN, '2026-08-17')
    expect(reading.bodyFatPercent).toBe(32.7)
    expect(reading.visceralFatRating).toBe(5)
  })

  it('does not take "Reached 6 goals" as visceral fat', () => {
    const reading = parseZeppBodyCompositionText(ZEPP_EN, '2026-08-17')
    expect(reading.visceralFatRating).toBe(5)
  })

  it('parses a Russian month name and comma decimals', () => {
    const text = '17 августа\nЖир 32,7 %\nМышцы 37,61 кг\nВода 48 %\nВисцеральный 5\nКости 2,33 кг'
    expect(parseZeppBodyCompositionText(text, '2026-08-17')).toMatchObject({
      bodyFatPercent: 32.7,
      muscleMassKg: 37.61,
      bodyWaterPercent: 48,
      visceralFatRating: 5,
      boneMassKg: 2.33,
      date: '2026-08-17',
    })
  })

  it('recovers from unlabeled OCR using % / kg ranges', () => {
    const text = '32.7 %  37.61 kg  48.0 %  5  2.33 kg'
    expect(parseZeppBodyCompositionText(text, '2026-08-17')).toEqual({
      bodyFatPercent: 32.7,
      muscleMassKg: 37.61,
      bodyWaterPercent: 48,
      visceralFatRating: 5,
      boneMassKg: 2.33,
    })
  })

  it('returns empty when the text is unrelated', () => {
    const reading = parseZeppBodyCompositionText('hello world', '2026-08-17')
    expect(hasZeppBodyCompositionValues(reading)).toBe(false)
    expect(reading.date).toBeUndefined()
  })
})
