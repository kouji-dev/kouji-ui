import { Component } from '@angular/core';
import { KjBadgeComponent } from '../badge';

@Component({
  selector: 'kj-badge-default-example',
  standalone: true,
  imports: [KjBadgeComponent],
  styles: [`:host { display: block; }`],
  template: `<kj-badge>New</kj-badge>`,
})
export class KjBadgeDefaultExample {}
