import { Directive, ElementRef, computed, inject } from '@angular/core';
import { KJ_COMMAND_PALETTE } from './command-palette.context';

let _groupIdCounter = 0;

/**
 * Group wrapper for command items. Sets `role="group"` and auto-hides when
 * all its child items are filtered out (score = 0).
 *
 * Groups detect child membership by checking whether each registered item's
 * host element is a DOM descendant of this group element.
 *
 * @doc-category Core/Actions
 * @doc
 * @doc-name command-palette
 */
@Directive({
  selector: '[kjCommandGroup]',
  standalone: true,
  host: {
    'role': 'group',
    '[attr.hidden]': 'isHidden() ? "" : null',
    '[attr.data-kj-group-id]': 'groupId',
  },
})
export class KjCommandGroup {
  private readonly ctx = inject(KJ_COMMAND_PALETTE);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Stable group id. */
  readonly groupId = `kj-command-group-${++_groupIdCounter}`;

  /**
   * True when this group has at least one registered item AND all of them
   * have score 0 (filtered out). Also true when the group has no registered
   * items at all (avoids showing empty placeholders).
   */
  readonly isHidden = computed(() => {
    const host = this.el.nativeElement;
    const allItems = this.ctx.visibleItems();
    // All registered items (score > 0) that are DOM children of this group
    const groupItems = allItems.filter(item => host.contains(item.el));
    // Also check items with score 0 (they won't be in visibleItems, but we need
    // to know if the group has ANY items at all)
    // We can't easily reach score-0 items from context, so we check all _items:
    // Access via the context cast — but context interface doesn't expose _items.
    // Instead rely on the DOM: check if any [kjCommandItem] child exists.
    const anyChild = host.querySelector('[kjCommandItem]') !== null;
    if (!anyChild) return false; // no items projected yet — don't hide
    // If all items that belong to this group are filtered out, groupItems is empty
    return groupItems.length === 0;
  });
}
