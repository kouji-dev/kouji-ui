import { Component } from '@angular/core';
import { KjTagComponent } from './tag';

@Component({
  selector: 'kj-tag-sizes-example',
  standalone: true,
  imports: [KjTagComponent],
  styles: [`:host { display: flex; gap: 0.5rem; align-items: center; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-tag kjSize="sm">Small</kj-tag>
    <kj-tag kjSize="md">Medium</kj-tag>
    <kj-tag kjSize="lg">Large</kj-tag>
  `,
})
export class KjTagSizesExample {}
