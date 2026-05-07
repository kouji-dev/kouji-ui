import { Component } from '@angular/core';
import { KjDrawerTrigger } from '@kouji-ui/core';
import { KjButtonComponent } from '../button/button';
import {
  KjDrawerComponent, KjDrawerHeaderComponent, KjDrawerTitleComponent,
  KjDrawerBodyComponent, KjDrawerFooterComponent,
} from './drawer';

@Component({
  selector: 'kj-drawer-sides-example',
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
      <kj-button [kjDrawerTrigger]="leftTpl" kjSide="left">Left</kj-button>
      <kj-button [kjDrawerTrigger]="rightTpl" kjSide="right">Right</kj-button>
      <kj-button [kjDrawerTrigger]="topTpl" kjSide="top">Top</kj-button>
      <kj-button [kjDrawerTrigger]="bottomTpl" kjSide="bottom">Bottom</kj-button>
    </div>

    <ng-template #leftTpl>
      <kj-drawer #d="kjDrawerContent">
        <kj-drawer-header><kj-drawer-title>Left drawer</kj-drawer-title></kj-drawer-header>
        <kj-drawer-body>Slides in from the left edge.</kj-drawer-body>
        <kj-drawer-footer><kj-button (click)="d.close()">Close</kj-button></kj-drawer-footer>
      </kj-drawer>
    </ng-template>
    <ng-template #rightTpl>
      <kj-drawer #d="kjDrawerContent">
        <kj-drawer-header><kj-drawer-title>Right drawer</kj-drawer-title></kj-drawer-header>
        <kj-drawer-body>Slides in from the right edge.</kj-drawer-body>
        <kj-drawer-footer><kj-button (click)="d.close()">Close</kj-button></kj-drawer-footer>
      </kj-drawer>
    </ng-template>
    <ng-template #topTpl>
      <kj-drawer #d="kjDrawerContent">
        <kj-drawer-header><kj-drawer-title>Top drawer</kj-drawer-title></kj-drawer-header>
        <kj-drawer-body>Slides in from the top edge.</kj-drawer-body>
        <kj-drawer-footer><kj-button (click)="d.close()">Close</kj-button></kj-drawer-footer>
      </kj-drawer>
    </ng-template>
    <ng-template #bottomTpl>
      <kj-drawer #d="kjDrawerContent">
        <kj-drawer-header><kj-drawer-title>Bottom drawer</kj-drawer-title></kj-drawer-header>
        <kj-drawer-body>Slides in from the bottom edge.</kj-drawer-body>
        <kj-drawer-footer><kj-button (click)="d.close()">Close</kj-button></kj-drawer-footer>
      </kj-drawer>
    </ng-template>
  `,
})
export class KjDrawerSidesExample {}
