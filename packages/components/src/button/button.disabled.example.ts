import { Component } from '@angular/core';
import { KjButtonComponent } from './button';

@Component({
  selector: 'kj-button-disabled-example',
  standalone: true,
  imports: [KjButtonComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-sm); flex-wrap: wrap; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  `],
  template: `
    <kj-button [disabled]="true">Default</kj-button>
    <kj-button variant="destructive" [disabled]="true">Destructive</kj-button>
    <kj-button variant="ghost" [disabled]="true">Ghost</kj-button>
    <kj-button variant="outline" [disabled]="true">Outline</kj-button>
  `,
})
export class KjButtonDisabledExample {}
