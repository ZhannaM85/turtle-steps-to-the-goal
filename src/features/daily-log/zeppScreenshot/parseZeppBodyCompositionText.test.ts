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

const ZEPP_RU_GOALS = `
Антон Мышковский
17 августа в 11:30
Не достигли цели
Мышцы 56,57 кг Отлично
Костная масса 3,03 кг Нормально
Достигли цели
ИМТ 24,1 Нормально
Жир 28,0 % Нормально
Вода 49,3 % Нормально
Висцеральный жир 14 Нормально
Базовый обмен 1800 ккал
Белок 16,5 %
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

  it('reads a Russian Zepp goals screenshot including muscle and bone (#747)', () => {
    expect(parseZeppBodyCompositionText(ZEPP_RU_GOALS, '2026-08-17')).toEqual({
      bodyFatPercent: 28,
      muscleMassKg: 56.57,
      bodyWaterPercent: 49.3,
      visceralFatRating: 14,
      boneMassKg: 3.03,
      date: '2026-08-17',
    })
  })

  it('keeps kg readings glued onto цели headers when labels OCR poorly (#747)', () => {
    const text = `
17 августа
Не достигли цели 56,57 кг
Не достигли цели 3,03 кг
Жир 28,0 %
Вода 49,3 %
Висцеральный жир 14
`
    expect(parseZeppBodyCompositionText(text, '2026-08-17')).toMatchObject({
      bodyFatPercent: 28,
      muscleMassKg: 56.57,
      bodyWaterPercent: 49.3,
      visceralFatRating: 14,
      boneMassKg: 3.03,
      date: '2026-08-17',
    })
  })

  it('treats OCR апреля as августа when the open day is 17 August (#747)', () => {
    const text = '17 апреля\nЖир 28,0 %\nМышцы 56,57 кг\nВода 49,3 %\nВисцеральный 14\nКости 3,03 кг'
    expect(parseZeppBodyCompositionText(text, '2026-08-17').date).toBe(
      '2026-08-17',
    )
  })

  it('still reads a real April screenshot when that day is open', () => {
    const text = '17 апреля\nЖир 28,0 %\nМышцы 56,57 кг\nВода 49,3 %\nВисцеральный 14\nКости 3,03 кг'
    expect(parseZeppBodyCompositionText(text, '2026-04-17').date).toBe(
      '2026-04-17',
    )
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
