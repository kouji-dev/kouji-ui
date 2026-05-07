import { Component } from '@angular/core';
import { KjDrawerTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjDrawerComponent, KjDrawerHeaderComponent, KjDrawerTitleComponent,
  KjDrawerBodyComponent, KjDrawerFooterComponent,
} from './drawer';

@Component({
  selector: 'kj-drawer-example',
  standalone: true,
  imports: [
    KjDrawerTrigger, KjButtonComponent,
    KjDrawerComponent,
    KjDrawerHeaderComponent, KjDrawerTitleComponent,
    KjDrawerBodyComponent, KjDrawerFooterComponent,
  ],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-button [kjDrawerTrigger]="drawer">Open drawer</kj-button>
    <ng-template #drawer>
      <kj-drawer #d="kjDrawerContent">
        <kj-drawer-header>
          <kj-drawer-title>Drawer</kj-drawer-title>
        </kj-drawer-header>
        <kj-drawer-body>This is a drawer that slides in from the right.</kj-drawer-body>
        <kj-drawer-footer>
          <kj-button kjVariant="ghost" (click)="d.close()">Close</kj-button>
        </kj-drawer-footer>
      </kj-drawer>
    </ng-template>
  `,
})
export class KjDrawerExample {}
