import { Component } from '@angular/core';
import { KjButtonComponent } from './button';

@Component({
  selector: 'kj-button-variants-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-sm); flex-wrap: wrap; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  `],
  template: `
    <kj-button variant="default">Default</kj-button>
    <kj-button variant="destructive">Destructive</kj-button>
    <kj-button variant="ghost">Ghost</kj-button>
    <kj-button variant="outline">Outline</kj-button>
    <kj-button variant="link">Link</kj-button>
  `,
})
export class KjButtonVariantsExample {}
