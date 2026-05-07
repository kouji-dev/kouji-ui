import { Component } from '@angular/core';
import { KjKbdComponent } from './kbd';

/**
 * Size scale: `xs` / `sm` / `md` / `lg`. Kbd is the one component that
 * legitimately wants `xs` (inline-with-prose hint chips need to be smaller
 * than the surrounding type so they don't dominate visually).
 */
@Component({
  selector: 'kj-kbd-sizes-example',
  standalone: true,
  imports: [KjKbdComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-md); align-items: center; flex-wrap: wrap; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  `],
  template: `
    <kj-kbd kjSize="xs">Esc</kj-kbd>
    <kj-kbd kjSize="sm">Esc</kj-kbd>
    <kj-kbd kjSize="md">Esc</kj-kbd>
    <kj-kbd kjSize="lg">Esc</kj-kbd>
  `,
})
export class KjKbdSizesExample {}
