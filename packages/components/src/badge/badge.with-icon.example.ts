import { Component } from '@angular/core';
import { KjBadgeComponent } from './badge';

@Component({
  selector: 'kj-badge-with-icon-example',
  standalone: true,
  imports: [KjBadgeComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <kj-badge variant="destructive">
      <span aria-hidden="true">●</span>
      Live
    </kj-badge>
  `,
})
export class KjBadgeWithIconExample {}
