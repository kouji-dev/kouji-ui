import { Component } from '@angular/core';
import { KjSpinnerComponent } from './spinner';

/**
 * A walkthrough of the most common spinner usages — default, size + variant,
 * a different animation glyph, and an inline placement next to copy.
 */
@Component({
  selector: 'kj-spinner-usage-example',
  standalone: true,
  imports: [KjSpinnerComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-md); }
    .row { display: flex; gap: var(--kj-space-lg); align-items: center; }
    .inline { display: inline-flex; gap: var(--kj-space-xs); align-items: center; }
  `],
  template: `
    <div class="row">
      <kj-spinner kjAriaLabel="Loading" />
      <kj-spinner kjSize="lg" kjVariant="primary" kjAriaLabel="Saving" />
      <kj-spinner kjAnimation="dots" kjAriaLabel="Connecting" />
    </div>

    <p class="inline">
      <kj-spinner kjSize="sm" kjAriaLabel="Loading inline" />
      <span>Fetching latest data…</span>
    </p>
  `,
})
export class KjSpinnerUsageExample {}
