import { Component } from '@angular/core';
import { KjDrawerTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjDrawerComponent, KjDrawerHeaderComponent, KjDrawerTitleComponent,
  KjDrawerBodyComponent, KjDrawerFooterComponent,
} from './drawer';

@Component({
  selector: 'kj-drawer-scrollable-example',
  standalone: true,
  imports: [
    KjDrawerTrigger, KjButtonComponent,
    KjDrawerComponent,
    KjDrawerHeaderComponent, KjDrawerTitleComponent,
    KjDrawerBodyComponent, KjDrawerFooterComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjDrawerTrigger]="drawer" kjSide="left">Browse filters</kj-button>
    <ng-template #drawer>
      <kj-drawer #d="kjDrawerContent">
        <kj-drawer-header>
          <kj-drawer-title>Filters</kj-drawer-title>
        </kj-drawer-header>
        <kj-drawer-body [scroll]="true">
          @for (i of items; track i) {
            <p>Filter option {{ i }}: lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          }
        </kj-drawer-body>
        <kj-drawer-footer>
          <kj-button (click)="d.close()">Close</kj-button>
        </kj-drawer-footer>
      </kj-drawer>
    </ng-template>
  `,
})
export class KjDrawerScrollableExample {
  readonly items = Array.from({ length: 40 }, (_, i) => i + 1);
}
