// packages/core/src/primitives/list/group.ts
import {
  Directive,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { KjListItem } from './item';

let _groupId = 0;
let _labelId = 0;

/**
 * Wraps a subset of `KjListItem`s inside a list-style container
 * (listbox / menu / tree). Sets `role="group"` and auto-hides itself
 * when every child item is filter-hidden — so the section header (and
 * any visual chrome it provides) disappears with its options instead
 * of leaving an empty gap.
 *
 * Pair with `[kjListGroupLabel]` on a heading element inside the group
 * to wire `aria-labelledby` for screen readers.
 *
 * Items inside groups remain visible to the parent root's
 * `contentChildren(KjListItem, { descendants: true })` query, so the
 * navigator and filter primitives see them unchanged.
 *
 * @example
 * ```html
 * <kj-select-content>
 *   <div kjListGroup>
 *     <div kjListGroupLabel>Fruits</div>
 *     <div kjOption [kjOptionValue]="'apple'">Apple</div>
 *     <div kjOption [kjOptionValue]="'banana'">Banana</div>
 *   </div>
 *   <hr kjListSeparator />
 *   <div kjListGroup>
 *     <div kjListGroupLabel>Vegetables</div>
 *     <div kjOption [kjOptionValue]="'carrot'">Carrot</div>
 *   </div>
 * </kj-select-content>
 * ```
 *
 * @doc-category Core/Primitives
 */
@Directive({
  selector: '[kjListGroup]',
  exportAs: 'kjListGroup',
  standalone: true,
  host: {
    'role': 'group',
    '[attr.id]': 'id()',
    '[attr.aria-labelledby]': 'labelId()',
    '[hidden]': 'isHidden()',
  },
})
export class KjListGroup {
  /** Optional override id. Falls back to a generated `kj-list-group-N`. */
  readonly kjId = input<string>('');

  private readonly _fallbackId = `kj-list-group-${++_groupId}`;

  /**
   * Resolved id used by the host `id` attribute and as the target of any
   * child label's `aria-labelledby`. Reactively follows `kjId` when set.
   */
  readonly id = computed(() => this.kjId() || this._fallbackId);

  /** Items directly under this group. Source of truth for auto-hide. */
  readonly items = contentChildren(KjListItem, { descendants: true });

  private readonly _labelId = signal<string | null>(null);
  /** id of the `[kjListGroupLabel]` child (if any), bound to `aria-labelledby`. */
  readonly labelId = this._labelId.asReadonly();

  /** @internal — registered by a `[kjListGroupLabel]` child. */
  setLabelId(id: string | null): void { this._labelId.set(id); }

  /**
   * Hidden when the group has items AND every item is filter-hidden.
   * An empty group (no projected items) is treated as visible — the
   * consumer may be loading content async.
   */
  readonly isHidden = computed(() => {
    const items = this.items();
    if (items.length === 0) return false;
    return items.every(i => !i.visible());
  });
}

/**
 * Heading inside a `[kjListGroup]`. Mints a stable id and registers it
 * with the surrounding group so the wrapper picks it up via
 * `aria-labelledby`. The host `id` attribute is bound from the resolved
 * id — write `id="my-id"` on the element to override.
 *
 * @doc-category Core/Primitives
 */
@Directive({
  selector: '[kjListGroupLabel]',
  exportAs: 'kjListGroupLabel',
  standalone: true,
  host: {
    '[attr.id]': 'id()',
  },
})
export class KjListGroupLabel {
  /** Optional override id. Falls back to a generated `kj-list-group-label-N`. */
  readonly kjId = input<string>('');

  private readonly _fallbackId = `kj-list-group-label-${++_labelId}`;

  /** Resolved id used by the host `id` attribute and by the parent group. */
  readonly id = computed(() => this.kjId() || this._fallbackId);

  private readonly group = inject(KjListGroup);

  constructor() {
    effect(() => this.group.setLabelId(this.id()));
  }
}

/**
 * Visual divider between groups (or arbitrary items). Non-interactive.
 * Sets `role="separator"` + `aria-orientation="horizontal"` per ARIA.
 *
 * @doc-category Core/Primitives
 */
@Directive({
  selector: '[kjListSeparator]',
  standalone: true,
  host: {
    'role': 'separator',
    'aria-orientation': 'horizontal',
  },
})
export class KjListSeparator {}
