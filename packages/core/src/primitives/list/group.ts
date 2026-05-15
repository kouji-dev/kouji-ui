// packages/core/src/primitives/list/group.ts
import {
  Directive,
  computed,
  contentChildren,
  inject,
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
    '[id]': 'id',
    '[attr.aria-labelledby]': 'labelId()',
    '[hidden]': 'isHidden()',
  },
})
export class KjListGroup {
  /** Stable group id used as the `aria-labelledby` target's reference. */
  readonly id = `kj-list-group-${++_groupId}`;

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
 * with the group so the wrapper picks it up via `aria-labelledby`.
 *
 * @doc-category Core/Primitives
 */
@Directive({
  selector: '[kjListGroupLabel]',
  exportAs: 'kjListGroupLabel',
  standalone: true,
  host: {
    '[id]': 'id',
  },
})
export class KjListGroupLabel {
  /** Stable id targeted by the parent group's `aria-labelledby`. */
  readonly id = `kj-list-group-label-${++_labelId}`;

  constructor() {
    const group = inject(KjListGroup, { optional: true });
    group?.setLabelId(this.id);
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
