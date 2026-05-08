import { Component, inject } from '@angular/core';
import { KjDrawer, KjDrawerService } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';

// TODO(wrapper-overlay): modal toggling needs revisit on overlay primitives.
@Component({
  standalone: true,
  imports: [KjDrawer],
  template: `<kj-drawer><h2>Drawer</h2></kj-drawer>`,
})
class Body {}

@Component({
  selector: 'kj-drawer-modal-vs-non-modal-example',
  standalone: true,
  imports: [KjButtonComponent],
  template: `<kj-button (click)="open()">Open</kj-button>`,
})
export class KjDrawerModalVsNonModalExample {
  private readonly drawer = inject(KjDrawerService);
  open(): void { this.drawer.open(Body); }
}
