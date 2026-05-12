import { Component } from '@angular/core';
import { KjButtonComponent } from './button';

@Component({
  selector: 'kj-button-disabled-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [
    `
      :host {
        display: flex;
        gap: var(--kj-space-sm);
        flex-wrap: wrap;
      }
    `,
  ],
  template: `
    <kj-button [kjDisabled]="true">Default</kj-button>
    <kj-button kjVariant="destructive" [kjDisabled]="true">Destructive</kj-button>
    <kj-button kjVariant="ghost" [kjDisabled]="true">Ghost</kj-button>
    <kj-button kjVariant="outline" [kjDisabled]="true">Outline</kj-button>
  `,
})
export class KjButtonDisabledExample {}
