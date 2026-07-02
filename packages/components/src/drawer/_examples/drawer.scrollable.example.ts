import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { KjDrawer, KjDrawerService } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';

// TODO(wrapper-overlay): re-skin scrollable drawer.
@Component({
  selector: 'kj-drawer-scrollable-body',
  standalone: true,
  imports: [KjDrawer],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-drawer
    ><h2>Long</h2>
    <div style="overflow:auto; max-height:60vh"><p>Lorem ipsum…</p></div></kj-drawer
  >`,
})
class Body {}

@Component({
  selector: 'kj-drawer-scrollable-example',
  standalone: true,
  imports: [KjButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-button (click)="open()">Open</kj-button>`,
})
export class KjDrawerScrollableExample {
  private readonly drawer = inject(KjDrawerService);
  open(): void {
    this.drawer.open(Body);
  }
}
