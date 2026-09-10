/**
 * Vitest 5 changed Assertion/Matchers to two type params (return, received).
 * @testing-library/jest-dom still augments the old one-param Assertion, which
 * no longer merges — so DOM matchers disappear from expect() under tsc.
 * Augment Matchers the Vitest 5 way until jest-dom ships a compatible types fix.
 * @see https://vitest.dev/guide/extending-matchers
 * @see #846
 */
/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars -- jest-dom ↔ Vitest 5 Matchers bridge */
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers'
import 'vitest'

declare module 'vitest' {
  interface Matchers<R = void, T = any>
    extends TestingLibraryMatchers<any, R> {}
}
