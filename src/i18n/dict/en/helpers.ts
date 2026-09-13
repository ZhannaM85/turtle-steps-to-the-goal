export function goalCount(n: number): string {
  return `${n} goal${n === 1 ? '' : 's'}`
}

export function entryCount(n: number): string {
  return `${n} daily ${n === 1 ? 'entry' : 'entries'}`
}
