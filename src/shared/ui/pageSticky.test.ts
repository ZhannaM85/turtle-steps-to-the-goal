import { describe, expect, it } from 'vitest'
import { PAGE_STICKY_UNDER_APP_HEADER_CLASSNAME } from './pageSticky'

describe('pageStickyUnderAppHeader (#970)', () => {
  it('sticks to the top of the inner scrollport, not under a window-sticky header', () => {
    expect(PAGE_STICKY_UNDER_APP_HEADER_CLASSNAME).toContain('sticky')
    expect(PAGE_STICKY_UNDER_APP_HEADER_CLASSNAME).toContain('top-0')
    expect(PAGE_STICKY_UNDER_APP_HEADER_CLASSNAME).not.toContain('2.75rem')
    expect(PAGE_STICKY_UNDER_APP_HEADER_CLASSNAME).not.toContain('3.5rem')
  })
})
