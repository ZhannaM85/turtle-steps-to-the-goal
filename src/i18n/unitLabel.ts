import type { Dictionary } from './Dictionary'

export function unitLabel(unit: 'kg' | 'lb', t: Dictionary): string {
  return unit === 'lb' ? t.common.lb : t.common.kg
}
