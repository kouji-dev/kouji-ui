import { Component } from '@angular/core';
import { KjTagComponent } from './tag';

@Component({
  selector: 'kj-tag-sizes-example',
  standalone: true,
  imports: [KjTagComponent],
  styles: [`:host { display: flex; gap: 0.5rem; align-items: center; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `
    <kj-tag kjSize="xs">Extra small</kj-tag>
    <kj-tag kjSize="sm">Small</kj-tag>
    <kj-tag kjSize="md">Medium</kj-tag>
    <kj-tag kjSize="lg">Large</kj-tag>
  `,
})
export class KjTagSizesExample {}
