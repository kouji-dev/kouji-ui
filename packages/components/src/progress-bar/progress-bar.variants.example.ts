import { Component } from '@angular/core';
import { KjProgressBarComponent } from './progress-bar';

/**
 * Variant gallery — `primary`, `success`, `warning`, `error` at 50%.
 * Variant communicates *kind* (success/error/etc.); the fill *length* is
 * what communicates progress. Colour is never the only signal.
 */
@Component({
  selector: 'kj-progress-bar-variants-example',
  standalone: true,
  imports: [KjProgressBarComponent],
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--kj-space-md);
      padding: var(--kj-space-xl);
      background: var(--kj-color-base-200);
    }
  `],
  template: `
    <kj-progress-bar [kjValue]="50" kjVariant="primary" kjAriaLabel="Primary" />
    <kj-progress-bar [kjValue]="50" kjVariant="success" kjAriaLabel="Success" />
    <kj-progress-bar [kjValue]="50" kjVariant="warning" kjAriaLabel="Warning" />
    <kj-progress-bar [kjValue]="50" kjVariant="error"   kjAriaLabel="Error" />
  `,
})
export class KjProgressBarVariantsExample {}
