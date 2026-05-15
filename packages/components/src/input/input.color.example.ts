import { Component, signal } from '@angular/core';
import { KjInputComponent } from './input';

/**
 * Color picker example — uses the native <input type="color"> swatch
 * via the shared kj-input wrapper. Bound to a signal via ngModel-style flow.
 */
@Component({
  selector: 'kj-input-color-example',
  standalone: true,
  imports: [KjInputComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-md); align-items: center; }
    code { font: var(--kj-text-sm)/1 var(--kj-font-mono); color: var(--kj-fg-muted); }
  `],
  template: `
    <kj-input
      type="color"
      (input)="hex.set($any($event.target).value)" />
    <code>{{ hex() }}</code>
  `,
})
export class KjInputColorExample {
  readonly hex = signal('#b8f500');
}
