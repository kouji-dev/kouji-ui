import { Component, inject } from '@angular/core';
import { KjDrawer, KjDrawerService } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';

// TODO(wrapper-overlay): re-skin form drawer.
@Component({
  standalone: true,
  imports: [KjDrawer],
  template: `<kj-drawer><h2>Form</h2><input type="text" /></kj-drawer>`,
})
class Body {}

@Component({
  selector: 'kj-drawer-with-form-example',
  standalone: true,
  imports: [KjButtonComponent],
  template: `<kj-button (click)="open()">Open</kj-button>`,
})
export class KjDrawerWithFormExample {
  private readonly drawer = inject(KjDrawerService);
  open(): void { this.drawer.open(Body); }
}
