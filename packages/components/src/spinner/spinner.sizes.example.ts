import { Component } from '@angular/core';
import { KjSpinnerComponent } from './spinner';

/**
 * Size presets — `xs` / `sm` / `md` / `lg` — laid out in a row so the
 * progression is immediately visible. There is intentionally no `xl`:
 * a spinner that big almost always wants a determinate Progress Bar
 * instead.
 */
@Component({
  selector: 'kj-spinner-sizes-example',
  standalone: true,
  imports: [KjSpinnerComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-lg); align-items: center; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  `],
  template: `
    <kj-spinner kjSize="xs" kjAriaLabel="Loading (xs)" />
    <kj-spinner kjSize="sm" kjAriaLabel="Loading (sm)" />
    <kj-spinner kjSize="md" kjAriaLabel="Loading (md)" />
    <kj-spinner kjSize="lg" kjAriaLabel="Loading (lg)" />
  `,
})
export class KjSpinnerSizesExample {}
