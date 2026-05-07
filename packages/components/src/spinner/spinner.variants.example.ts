import { Component } from '@angular/core';
import { KjSpinnerComponent } from './spinner';

/**
 * Colour variants — `neutral` (the default, inherits `currentColor`),
 * `primary`, `success`, `warning`, `error`, `info` — laid out in a row.
 * The `neutral` instance picks up the host's text colour, demonstrating
 * the "spinner inside a coloured surface inherits its parent" contract.
 */
@Component({
  selector: 'kj-spinner-variants-example',
  standalone: true,
  imports: [KjSpinnerComponent],
  styles: [`
    :host { display: flex; gap: var(--kj-space-lg); align-items: center; flex-wrap: wrap; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  `],
  template: `
    <kj-spinner kjVariant="neutral" kjAriaLabel="Loading (neutral)" />
    <kj-spinner kjVariant="primary" kjAriaLabel="Loading (primary)" />
    <kj-spinner kjVariant="success" kjAriaLabel="Loading (success)" />
    <kj-spinner kjVariant="warning" kjAriaLabel="Loading (warning)" />
    <kj-spinner kjVariant="error"   kjAriaLabel="Loading (error)" />
    <kj-spinner kjVariant="info"    kjAriaLabel="Loading (info)" />
  `,
})
export class KjSpinnerVariantsExample {}
