import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  input,
} from '@angular/core';
import {
  KjPaginationNext,
} from '@kouji-ui/core';

/**
 * Boundary control that advances one page. Disabled when the parent is on
 * the last page or the dataset is empty.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name pagination
 */
@Component({
  selector: 'kj-pagination-next',
  standalone: true,
  imports: [KjPaginationNext],
  template: `
    <button
      type="button"
      kjPaginationNext
      class="kj-pagination-action kj-pagination-action--next"
      [class]="kjClass()"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
    >
      <ng-content />
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjPaginationNextComponent {
  /**
   * Class names added to the **styled root element** — the inner `.kj-pagination-action`,
   * not this `display: contents` host. See "Customizing a component" in
   * `rules/code_style.md`.
   */
  readonly kjClass = input<string>('');
  /** Forwarded to the item's `KjVariant`. Unset falls back to the pagination root's cascade. */
  readonly kjVariant = input<string | undefined>(undefined);
  /** Forwarded to the item's `KjSize`. Unset falls back to the pagination root's cascade. */
  readonly kjSize = input<string | undefined>(undefined);
}
