import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KjDrawer, KjDrawerRef, KjDrawerService } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

/**
 * A walkthrough of the most common drawer usages — open from a button, change
 * the side, and resolve a result back to the opener.
 */
@Component({
  selector: 'kj-drawer-usage-body',
  standalone: true,
  imports: [KjDrawer, KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-drawer>
      <h2 style="margin: 0 0 var(--kj-space-md)">Settings</h2>
      <p>Adjust your preferences.</p>
      <div style="display:flex; gap: var(--kj-space-sm); margin-top: var(--kj-space-lg)">
        <kj-button kjVariant="ghost" (click)="ref.close()">Cancel</kj-button>
        <kj-button kjVariant="default" (click)="ref.close('saved')">Save</kj-button>
      </div>
    </kj-drawer>
  `,
})
class DrawerUsageBody {
  protected readonly ref = inject<KjDrawerRef<DrawerUsageBody, string>>(KjDrawerRef);
}

@Component({
  selector: 'kj-drawer-usage-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [
    `
      :host {
        display: flex;
        gap: var(--kj-space-md);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-button (click)="open('right')">Open right</kj-button>
    <kj-button kjVariant="outline" (click)="open('bottom')">Open bottom sheet</kj-button>
  `,
})
export class KjDrawerUsageExample {
  private readonly drawer = inject(KjDrawerService);

  open(side: 'right' | 'bottom'): void {
    const ref = this.drawer.open<DrawerUsageBody, string>(DrawerUsageBody, { side });
    ref.afterClosed$.subscribe(() => {
      /* react to confirmed/cancelled */
    });
  }
}
