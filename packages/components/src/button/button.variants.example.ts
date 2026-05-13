import { Component } from '@angular/core';
import { KjButtonComponent } from './button';

@Component({
  selector: 'kj-button-variants-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-sm); flex-wrap: wrap; }
  `],
  template: `
    <kj-button kjVariant="default">Default</kj-button>
    <kj-button kjVariant="destructive">Destructive</kj-button>
    <kj-button kjVariant="ghost">Ghost</kj-button>
    <kj-button kjVariant="outline">Outline</kj-button>
    <kj-button kjVariant="link">Link</kj-button>
  `,
})
export class KjButtonVariantsExample {}
