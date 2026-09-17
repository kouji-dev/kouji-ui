import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import {
  KjCommandPalette,
  KjListItem,
  injectListItem,
} from '@kouji-ui/core';

/**
 * Styled command item. Renders a `<button>` with `[kjCommandItem]` applied.
 *
 * @doc-category Library/Actions
 * @doc
 * @doc-name command-palette
 */
@Component({
  selector: 'kj-command-item',
  standalone: true,
  // Compose `KjListItem` directly on the wrapper host so that
  // `KjCommandPalette.items = contentChildren(KjListItem)` resolves to
  // the wrapper element itself — content queries do not cross into a
  // child component's view template, so the previous shape (an inner
  // `<button kjCommandItem>` inside this view) left the palette's
  // `items()` empty and the empty-state slot permanently visible.
  //
  // The `role`, `data-active`, and `aria-selected` semantics that the
  // `KjCommandItem` directive ordinarily contributes are inlined below
  // because Angular's `hostDirectives` input-forwarding does not chain
  // transitively (composing `KjCommandItem` here and re-forwarding its
  // forwarded inputs fails the NG2017 check).
  hostDirectives: [{
    directive: KjListItem,
    inputs: [
      'kjItemValue:kjValue',
      'kjItemKeywords:kjKeywords',
      'kjShortcut',
      'kjDisabled',
    ],
  }],
  template: `<ng-content />`,
  styleUrl: './command-palette.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-command-item',
    'role': 'option',
    '[attr.aria-selected]': 'isActive() ? "true" : "false"',
    '[attr.data-active]': 'isActive() ? "" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjCommandItemComponent {
  /** Value emitted on activation. */
  readonly kjValue = input<unknown>(undefined);
  /** Extra filter keywords. */
  readonly kjKeywords = input<readonly string[]>([]);
  /** ARIA keyboard shortcut hint (bound to `aria-keyshortcuts`). */
  readonly kjShortcut = input<string | null>(null);
  /** Disable this item. */
  readonly kjDisabled = input<boolean, unknown>(false, { transform: booleanAttribute });

  private readonly _item = injectListItem<unknown>();
  private readonly _palette = inject(KjCommandPalette);

  /** Whether this item is the active (highlighted) one in the palette. */
  protected readonly isActive = computed(() =>
    this._palette.activeId() !== null && this._palette.activeId() === this._item.id,
  );
}
