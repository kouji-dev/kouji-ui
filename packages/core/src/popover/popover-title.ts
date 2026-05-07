import { DestroyRef, Directive, OnInit, inject } from '@angular/core';
import {
  KJ_POPOVER,
  nextPopoverTitleId,
  type KjPopoverContext,
} from './popover.context';

/**
 * Marks the heading element inside the popover content. Generates an auto-id
 * and registers it with the parent `KJ_POPOVER` context so
 * `[kjPopoverContent]` wires `aria-labelledby` to it.
 *
 * Mirrors `KjDialogTitle` in the dialog family — applied to whatever heading
 * level the consumer's information architecture wants (`<h2>` … `<h4>`),
 * the directive does not override `role`.
 *
 * @example
 * ```html
 * <ng-template kjPopoverContent>
 *   <h2 kjPopoverTitle>Profile settings</h2>
 *   …
 * </ng-template>
 * ```
 *
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjPopoverTitle]',
  standalone: true,
  host: {
    '[attr.id]': 'titleId',
  },
})
export class KjPopoverTitle implements OnInit {
  private readonly ctx = inject<KjPopoverContext>(KJ_POPOVER);
  private readonly destroyRef = inject(DestroyRef);

  /** Auto-generated id used for the parent panel's `aria-labelledby`. */
  readonly titleId = nextPopoverTitleId();

  ngOnInit(): void {
    this.ctx.registerTitleId(this.titleId);
    this.destroyRef.onDestroy(() => this.ctx.unregisterTitleId(this.titleId));
  }
}
