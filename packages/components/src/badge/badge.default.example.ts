import { Component } from '@angular/core';
import { KjBadgeComponent } from './badge';

@Component({
  selector: 'kj-badge-default-example',
  standalone: true,
  imports: [KjBadgeComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `<kj-badge>New</kj-badge>`,
})
export class KjBadgeDefaultExample {}
