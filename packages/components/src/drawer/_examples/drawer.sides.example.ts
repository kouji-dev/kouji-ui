import { Component, inject } from '@angular/core';
import { KjDrawer, KjDrawerService, type KjDrawerSide } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin sides demo.
@Component({
  selector: 'kj-drawer-sides-body',
  standalone: true,
  imports: [KjDrawer],
  template: `<kj-drawer><h2>Drawer</h2></kj-drawer>`,
})
class Body {}

@Component({
  selector: 'kj-drawer-sides-example',
  standalone: true,
  imports: [KjButtonComponent],
  template: `
    <kj-button (click)="open('left')">Left</kj-button>
    <kj-button (click)="open('right')">Right</kj-button>
    <kj-button (click)="open('top')">Top</kj-button>
    <kj-button (click)="open('bottom')">Bottom</kj-button>
  `,
})
export class KjDrawerSidesExample {
  private readonly drawer = inject(KjDrawerService);
  open(side: KjDrawerSide): void { this.drawer.open(Body, { side }); }
}
