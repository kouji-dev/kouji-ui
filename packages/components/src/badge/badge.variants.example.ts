import { Component } from '@angular/core';
import { KjBadgeComponent } from './badge';

@Component({
  selector: 'kj-badge-variants-example',
  standalone: true,
  imports: [KjBadgeComponent],
  styles: [`:host { display: flex; gap: 0.5rem; }`],
  template: `
    <kj-badge variant="default">Default</kj-badge>
    <kj-badge variant="secondary">Secondary</kj-badge>
    <kj-badge variant="destructive">Destructive</kj-badge>
    <kj-badge variant="outline">Outline</kj-badge>
  `,
})
export class KjBadgeVariantsExample {}
