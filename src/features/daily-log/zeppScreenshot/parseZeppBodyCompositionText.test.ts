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

/** #757 — English goals list with Bone mass first (Insufficient), Body fat under attention. */
const ZEPP_EN_BONE_FIRST = `
Zhanna
23 August at 06:11
once a week.
1203
Didn't reach goals
Reach goal
Bone mass 2,37 kg Insufficient
1 item needs your attention
Body fat 34,6 % Normal
Reached 4 goals
BMI 22,1 Normal
Muscle 36,92 kg Normal
Water 46,6 % Normal
Visceral fat 5 Normal
Other items
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

const ZEPP_RU_GOALS_UNMET_FIRST = `
Антон Мышковский
29 августа в 11:43
6 элементов не достигли цели
ИМТ 26,3 Выше среднего
Жир 28,0 % Высокий
Вода 49,3 % Недостаточный
Основной обмен 1 541 ккал
Висцеральный жир 14 Выше среднего
Костная масса 3,05 кг Недостаточный
Достигнуто 2 цели
Мышцы 56,88 кг Нормальный
Белок 18,9 % Отличный
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

  it('reads an English goals screenshot when Bone mass is listed first (#757)', () => {
    expect(parseZeppBodyCompositionText(ZEPP_EN_BONE_FIRST, '2026-08-23')).toEqual(
      {
        bodyFatPercent: 34.6,
        muscleMassKg: 36.92,
        bodyWaterPercent: 46.6,
        visceralFatRating: 5,
        boneMassKg: 2.37,
        date: '2026-08-23',
      },
    )
  })

  it('does not treat 06:11 or "1 item needs your attention" as body-comp values (#757)', () => {
    const reading = parseZeppBodyCompositionText(
      ZEPP_EN_BONE_FIRST,
      '2026-08-23',
    )
    expect(reading.visceralFatRating).toBe(5)
    expect(reading.boneMassKg).toBe(2.37)
  })

  it('still reads the five fields when OCR concatenates the goals screen into one line (#757)', () => {
    const text = ZEPP_EN_BONE_FIRST.replace(/\s+/g, ' ').trim()
    expect(parseZeppBodyCompositionText(text, '2026-08-23')).toMatchObject({
      bodyFatPercent: 34.6,
      muscleMassKg: 36.92,
      bodyWaterPercent: 46.6,
      visceralFatRating: 5,
      boneMassKg: 2.37,
      date: '2026-08-23',
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

  it('maps Мышцы to muscle mass when unmet/met sections reorder the list (#773)', () => {
    expect(
      parseZeppBodyCompositionText(ZEPP_RU_GOALS_UNMET_FIRST, '2026-08-29'),
    ).toEqual({
      bodyFatPercent: 28,
      muscleMassKg: 56.88,
      bodyWaterPercent: 49.3,
      visceralFatRating: 14,
      boneMassKg: 3.05,
      date: '2026-08-29',
    })
  })

  it('does not take unlabeled BMI 26.3 as muscle when Мышцы kg comes later (#773)', () => {
    const text = `
29 августа
26,3
Жир 28,0 %
Вода 49,3 %
Висцеральный жир 14
Костная масса 3,05 кг
56,88 кг
`
    expect(parseZeppBodyCompositionText(text, '2026-08-29')).toMatchObject({
      bodyFatPercent: 28,
      muscleMassKg: 56.88,
      bodyWaterPercent: 49.3,
      visceralFatRating: 14,
      boneMassKg: 3.05,
    })
  })

  it('leaves muscle empty rather than filling unlabeled BMI (#773)', () => {
    const text = '29 августа\n26,3\nЖир 28,0 %\nВода 49,3 %\nВисцеральный жир 14\nКостная масса 3,05 кг'
    const reading = parseZeppBodyCompositionText(text, '2026-08-29')
    expect(reading.muscleMassKg).toBeUndefined()
    expect(reading.bodyFatPercent).toBe(28)
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

  it('reads visceral 14 from eng-tessdata Latin lookalikes of the Russian goals screen (#773)', () => {
    const text = `
12:24 17 @
AHTOH MbiuiKoBCKHii A
< 2 aryeraa tas G
6 anementos He focturnn Yenn
IMT 26,3
puule cpenHero
Kup 28,0%
pIcoKnit
Bona 49,3%
jenocraTouniit
Q OcHoBHol 06meH 1 541 kkan
Uenn He aoctarHyTo
BucuepanbHbiit Kup 14
pile cpenHero
KoctHaa macca 3,05 kr
jenocraTounbiii
Aocturryto 2 yenu
Mbiwupi 56,88 kr
Hopmanbiii
Benox 18,9 %
`
    expect(parseZeppBodyCompositionText(text, '2026-08-29')).toMatchObject({
      bodyFatPercent: 28,
      muscleMassKg: 56.88,
      bodyWaterPercent: 49.3,
      visceralFatRating: 14,
      boneMassKg: 3.05,
    })
  })

  it('restores OCR l4 / I4 as visceral 14 (#773)', () => {
    expect(
      parseZeppBodyCompositionText(
        'BucuepanbHbiit Kup l4\nKup 28,0%\nBona 49,3%\nMbiwupi 56,88 kr\nKoctHaa macca 3,05 kr',
        '2026-08-29',
      ).visceralFatRating,
    ).toBe(14)
    expect(
      parseZeppBodyCompositionText(
        'BucuepanbHbiit Kup I4\nKup 28,0%\nBona 49,3%\nMbiwupi 56,88 kr\nKoctHaa macca 3,05 kr',
        '2026-08-29',
      ).visceralFatRating,
    ).toBe(14)
  })

  it('does not take the 29 August day from an OCR’d name as muscle (#773)', () => {
    const text = `
AHTOH MbiwKoBCKHii
29 aryeraa
Kup 28,0%
Bona 49,3%
BucuepanbHbiit Kup 14
KoctHaa macca 3,05 kr
Mbiwupi 56,88 kr
`
    expect(parseZeppBodyCompositionText(text, '2026-08-29')).toMatchObject({
      muscleMassKg: 56.88,
      visceralFatRating: 14,
    })
  })

  it('does not take basal 1 541 or IMT as visceral / muscle (#773)', () => {
    const reading = parseZeppBodyCompositionText(
      `
IMT 26,3
OcHoBHol 06meH 1 541 kkan
BucuepanbHbiit Kup 14
Mbiwupi 56,88 kr
`,
      '2026-08-29',
    )
    expect(reading.visceralFatRating).toBe(14)
    expect(reading.muscleMassKg).toBe(56.88)
  })

  it('returns empty when the text is unrelated', () => {
    const reading = parseZeppBodyCompositionText('hello world', '2026-08-17')
    expect(hasZeppBodyCompositionValues(reading)).toBe(false)
    expect(reading.date).toBeUndefined()
  })
})
