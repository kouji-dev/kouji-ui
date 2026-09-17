import { Directive, ElementRef, afterRenderEffect, inject, input } from '@angular/core';
import { KjTableVirtual } from './table-virtual';

/**
 * Marks a rendered row of a `[kjTableVirtual]` body so the virtualizer can
 * measure it: stamps `data-index` on the host and hands the element to
 * `KjTableVirtual.measureItem()` after every render in which the index, the
 * owner or `kjMeasureDeps` changed, so real heights replace the estimate.
 *
 * Rows rendered outside a virtualized body bind `null` for both the index
 * and the owner and the directive stays inert — that lets one row template
 * serve pinned, plain and virtualized bodies alike.
 *
 * @example
 * ```html
 * <tr [kjTableVirtualItem]="vr.index" [kjVirtualOwner]="v" [kjMeasureDeps]="row.getIsExpanded()">
 * ```
 */
@Directive({
  selector: '[kjTableVirtualItem]',
  standalone: true,
  host: {
    '[attr.data-index]': 'kjTableVirtualItem()',
  },
})
export class KjTableVirtualItem {
  /** Index of the row in the virtualized dataset, or `null` outside a virtualized body. */
  readonly kjTableVirtualItem = input<number | null>(null);
  /** The virtualizer measuring this row (`#v="kjTableVirtual"`), or `null` outside a virtualized body. */
  readonly kjVirtualOwner = input<KjTableVirtual | null>(null);
  /** Any value whose change should re-measure the row after render — e.g. the row's expansion state. */
  readonly kjMeasureDeps = input<unknown>(undefined);

  private readonly el: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    afterRenderEffect({
      read: () => {
        const owner = this.kjVirtualOwner();
        const index = this.kjTableVirtualItem();
        this.kjMeasureDeps();
        if (!owner || index === null || !owner.mounted()) return;
        owner.measureItem(this.el);
      },
    });
  }
}
