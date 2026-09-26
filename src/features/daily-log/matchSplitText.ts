/** Matcher for a sentence split into nowrap tokens (#1004).
 * `getByText` only reads an element's own text nodes, so the full
 * preview lives on the parent. */
export function matchSplitText(expected: string) {
  return (_content: string, element: Element | null) =>
    element?.textContent === expected &&
    [...element.children].every((child) => child.textContent !== expected)
}
