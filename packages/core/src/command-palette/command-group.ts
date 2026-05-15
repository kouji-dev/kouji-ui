import { Directive, computed, contentChildren } from '@angular/core';
import { KjListItem } from '../primitives/list';
import { KJ_COMMAND_PALETTE } from './command-palette.context';
import { inject } from '@angular/core';

let _groupIdCounter = 0;

/**
 * Group wrapper for command items. Sets `role="group"` and auto-hides when
 * all its child items are filtered out.
 *
 * Uses `contentChildren(KjListItem)` to track which items belong to this group,
 * then checks their ids against the palette's visible items set.
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

  /** All `KjListItem` children directly under this group. */
  private readonly groupItems = contentChildren(KjListItem, { descendants: true });

  /** Stable group id. */
  readonly groupId = `kj-command-group-${++_groupIdCounter}`;

  /**
   * True when this group has no child items, OR when all child items
   * are filtered out (not in the palette's visible set).
   */
  readonly isHidden = computed(() => {
    const myItems = this.groupItems();
    if (myItems.length === 0) return false; // no items projected yet — don't hide
    const visibleIds = new Set(this.ctx.visibleItems().map(i => i.id));
    return myItems.every(item => !visibleIds.has(item.id));
  });
}
