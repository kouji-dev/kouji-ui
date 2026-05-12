import { Component, inject } from '@angular/core';
import { KjDrawer, KjDrawerService } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';

// TODO(wrapper-overlay): re-skin via styled wrapper.
@Component({
  selector: 'kj-drawer-default-body',
  standalone: true,
  imports: [KjDrawer],
  template: `<kj-drawer
    ><h2>Drawer</h2>
    <p>Body</p></kj-drawer
  >`,
})
class DrawerBody {}

@Component({
  selector: 'kj-drawer-example',
  standalone: true,
  imports: [KjButtonComponent],
  template: `<kj-button (click)="open()">Open drawer</kj-button>`,
})
export class KjDrawerExample {
  private readonly drawer = inject(KjDrawerService);
  open(): void {
    this.drawer.open(DrawerBody);
  }
}
