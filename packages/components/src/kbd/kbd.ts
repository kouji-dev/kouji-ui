import { Component, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';

/**
 * Themed `<kbd>` for keyboard shortcuts (e.g., ⌘K, Ctrl+S).
 * Presentation-only: no headless directive, no inputs.
 *
 * @example
 * ```html
 * <kj-kbd>⌘K</kj-kbd>
 * <kj-kbd>Ctrl</kj-kbd>+<kj-kbd>S</kj-kbd>
 * ```
 * @doc
 *   @doc-file kbd.example.ts
 * @category Library/Data display
 */
@Component({
  selector: 'kj-kbd',
  standalone: true,
  template: `<kbd class="kj-kbd"><ng-content /></kbd>`,
  styleUrl: './kbd.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjKbdComponent {}
