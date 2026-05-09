import { Component } from '@angular/core';
import { KjBadgeComponent } from './badge';

@Component({
  selector: 'kj-badge-sizes-example',
  standalone: true,
  imports: [KjBadgeComponent],
  styles: [`:host { display: flex; gap: 0.5rem; align-items: center; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-badge size="xs">Extra small</kj-badge>
    <kj-badge size="sm">Small</kj-badge>
    <kj-badge size="md">Medium</kj-badge>
    <kj-badge size="lg">Large</kj-badge>
  `,
})
export class KjBadgeSizesExample {}
