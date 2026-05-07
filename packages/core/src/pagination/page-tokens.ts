import type { KjPageToken } from './pagination.context';

/**
 * Computes the windowed list of page tokens for a paginator.
 *
 * Given a `current` page (1-indexed), a `total` count, the `siblings`
 * count (pages adjacent to `current` on each side), and the `boundary`
 * count (pages anchored at the start and end), produces the array of
 * stable tokens that drives the rendered list — for example
 * `[1, 'ellipsis-left', 4, 5, 6, 'ellipsis-right', 10]`.
 *
 * Edge cases handled:
 *
 * - `total <= 0` → returns `[]` (the empty-dataset state).
 * - `boundary*2 + siblings*2 + 3 >= total` → no ellipses, every page
 *   number rendered (small datasets).
 * - `current` near `1` → only the right ellipsis appears; the left
 *   sibling window meets the boundary directly.
 * - `current` near `total` → mirror case; only the left ellipsis appears.
 * - `current` in the middle → both ellipses appear.
 * - Degenerate `siblings = 0` and/or `boundary = 0` are valid; the
 *   sibling window collapses to `[current]` and the boundary anchors
 *   disappear, with ellipses bridging whatever gap remains.
 *
 * @internal
 */
export function computePageTokens(
  current: number,
  total: number,
  siblings: number,
  boundary: number,
): readonly KjPageToken[] {
  if (total <= 0) return [];

  const safeBoundary = Math.max(0, boundary);
  const safeSiblings = Math.max(0, siblings);
  const safeCurrent = Math.min(Math.max(1, current), total);

  // Total pages renderable without ellipses:
  // boundary + 1 (left ellipsis or filler) + (siblings*2 + 1) + 1 (right ellipsis) + boundary
  const totalNumbers = safeBoundary * 2 + safeSiblings * 2 + 3;

  if (totalNumbers >= total) {
    // No ellipses needed — render every page.
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(safeCurrent - safeSiblings, safeBoundary + 2);
  const rightSiblingIndex = Math.min(safeCurrent + safeSiblings, total - safeBoundary - 1);
  const showLeftEllipsis = leftSiblingIndex > safeBoundary + 2;
  const showRightEllipsis = rightSiblingIndex < total - safeBoundary - 1;

  const tokens: KjPageToken[] = [];

  // Left boundary anchor.
  for (let i = 1; i <= safeBoundary; i++) tokens.push(i);

  if (!showLeftEllipsis) {
    // Sibling window meets the boundary — fill the gap with numbers.
    for (let i = safeBoundary + 1; i < leftSiblingIndex; i++) tokens.push(i);
  } else {
    tokens.push('ellipsis-left');
  }

  // Sibling window.
  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) tokens.push(i);

  if (!showRightEllipsis) {
    for (let i = rightSiblingIndex + 1; i < total - safeBoundary + 1; i++) tokens.push(i);
  } else {
    tokens.push('ellipsis-right');
  }

  // Right boundary anchor.
  for (let i = total - safeBoundary + 1; i <= total; i++) tokens.push(i);

  return tokens;
}
