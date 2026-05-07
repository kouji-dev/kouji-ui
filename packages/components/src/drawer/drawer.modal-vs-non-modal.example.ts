import { Component } from '@angular/core';
import { KjDrawerTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjDrawerComponent, KjDrawerHeaderComponent, KjDrawerTitleComponent,
  KjDrawerBodyComponent, KjDrawerFooterComponent,
} from './drawer';

@Component({
  selector: 'kj-drawer-modal-vs-non-modal-example',
  standalone: true,
  imports: [
    KjDrawerTrigger, KjButtonComponent,
    KjDrawerComponent,
    KjDrawerHeaderComponent, KjDrawerTitleComponent,
    KjDrawerBodyComponent, KjDrawerFooterComponent,
  ],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    .row { display: flex; flex-wrap: wrap; gap: var(--kj-space-md); }
  `],
  template: `
    <div class="row">
      <kj-button [kjDrawerTrigger]="modalTpl">Modal drawer</kj-button>
      <kj-button [kjDrawerTrigger]="nonModalTpl" [kjModal]="false">Non-modal drawer</kj-button>
    </div>

    <ng-template #modalTpl>
      <kj-drawer #d="kjDrawerContent">
        <kj-drawer-header>
          <kj-drawer-title>Modal</kj-drawer-title>
        </kj-drawer-header>
        <kj-drawer-body>
          Backdrop, focus-trap, scroll-lock, Escape-to-close — the works.
        </kj-drawer-body>
        <kj-drawer-footer>
          <kj-button (click)="d.close()">Close</kj-button>
        </kj-drawer-footer>
      </kj-drawer>
    </ng-template>

    <ng-template #nonModalTpl>
      <kj-drawer #d="kjDrawerContent">
        <kj-drawer-header>
          <kj-drawer-title>Non-modal</kj-drawer-title>
        </kj-drawer-header>
        <kj-drawer-body>
          No backdrop, no scroll-lock — page interactions stay live behind the drawer.
        </kj-drawer-body>
        <kj-drawer-footer>
          <kj-button (click)="d.close()">Close</kj-button>
        </kj-drawer-footer>
      </kj-drawer>
    </ng-template>
  `,
})
export class KjDrawerModalVsNonModalExample {}
