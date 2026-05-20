import { Component } from '@angular/core';
import { KjLinkComponent } from '../link';

@Component({
  selector: 'kj-link-disabled-example',
  standalone: true,
  imports: [KjLinkComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-lg); flex-wrap: wrap; }
  `],
  template: `
    <kj-link kjHref="/active" kjUnderline="always">Active link</kj-link>
    <kj-link kjHref="/disabled" [kjDisabled]="true" kjUnderline="always">
      Disabled link
    </kj-link>
  `,
})
export class KjLinkDisabledExample {}
