import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';
import {
  KjPaginationItem,
} from '@kouji-ui/core';

/**
 * Per-page button within a `<kj-pagination>`. Wraps `KjPaginationItem` and
 * forwards the required `kjPage` plus optional `kjDisabled` / `kjVariant` /
 * `kjSize` inputs. Reflects `aria-current="page"` on the active page.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name pagination
 */
@Component({
  selector: 'kj-pagination-item',
  standalone: true,
  imports: [KjPaginationItem],
  template: `
    <button
      type="button"
      kjPaginationItem
      class="kj-pagination-item"
      [class]="kjClass()"
      [kjPage]="kjPage()"
      [kjDisabled]="kjDisabled()"
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
export class KjPaginationItemComponent {
  /**
   * Class names added to the **styled root element** — the inner `.kj-pagination-item`,
   * not this `display: contents` host. See "Customizing a component" in
   * `rules/code_style.md`.
   */
  readonly kjClass = input<string>('');
  /** Page number this item navigates to (1-indexed). Required. */
  readonly kjPage = input.required<number>();
  /** Per-item disabled state. Suppresses click and reflects `aria-disabled`. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });
  /** Forwarded to the item's `KjVariant`. Unset falls back to the pagination root's cascade. */
  readonly kjVariant = input<string | undefined>(undefined);
  /** Forwarded to the item's `KjSize`. Unset falls back to the pagination root's cascade. */
  readonly kjSize = input<string | undefined>(undefined);
}
