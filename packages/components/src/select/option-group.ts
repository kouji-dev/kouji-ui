import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  contentChildren,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { KjIcon, KjId, KjListItem } from '@kouji-ui/core';

/**
 * A labelled group of `<kj-option>`s inside `<kj-select>`. Add
 * `kjCollapsible` to turn the heading into a fold toggle.
 *
 * While the select's search field holds a query, a group with matches is
 * shown expanded whatever its `kjCollapsed` state, and a group with none is
 * hidden.
 *
 * @doc
 * @doc-name select
 */
@Component({
  selector: 'kj-option-group',
  standalone: true,
  imports: [KjIcon],
  template: `
    @if (kjCollapsible()) {
      <button
        type="button"
        class="kj-option-group-label"
        [id]="labelId"
        [attr.aria-expanded]="expanded()"
        (click)="toggle()"
      >
        <span kjIcon="chevron-down" class="kj-option-group-chevron" aria-hidden="true"></span>
        {{ kjLabel() }}
      </button>
    } @else {
      <div class="kj-option-group-label" [id]="labelId">{{ kjLabel() }}</div>
    }
    <ng-content />
  `,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-option-group',
    'role': 'group',
    '[attr.aria-labelledby]': 'labelId',
    '[attr.data-collapsed]': "expanded() ? null : ''",
    '[hidden]': 'isHidden()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjOptionGroup {
  /** Heading text. Also the group's accessible name. */
  readonly kjLabel = input<string>('');

  /** Renders the heading as a button that folds the group. Defaults to `false`. */
  readonly kjCollapsible = input(false, { transform: booleanAttribute });

  /**
   * Whether the group is folded. Two-way bindable via `[(kjCollapsed)]`;
   * only honoured with `kjCollapsible`. Bind a boolean: a bare attribute is
   * not coerced (`model()` takes no `transform`).
   */
  readonly kjCollapsed = model(false);

  /** @internal — the heading id, target of `aria-labelledby`. */
  protected readonly labelId = inject(KjId).mint('option-group-label');

  /** @internal — every option under this group. */
  readonly _items = contentChildren(KjListItem, { descendants: true });

  /** @internal — set by `<kj-select>` while its search field holds a query. */
  readonly _searching = signal(false);

  /** @internal — whether this group's options are folded away right now. */
  readonly _folded = computed(() => this.kjCollapsible() && this.kjCollapsed() && !this._searching());

  /** @internal */
  protected readonly expanded = computed(() => !this._folded());

  /** @internal — a search with no match here hides the whole group. */
  protected readonly isHidden = computed(() => {
    const items = this._items();
    return this._searching() && items.length > 0 && items.every(i => !i.visible());
  });

  /** @internal */
  protected toggle(): void {
    if (this._searching()) return;
    this.kjCollapsed.update(v => !v);
  }
}
