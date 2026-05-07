import { Component } from '@angular/core';
import { KjTextareaComponent } from './textarea';

/**
 * Default usage example for `KjTextareaComponent`.
 * Rendered live in the docs and as code in the example panel.
 */
@Component({
  selector: 'kj-textarea-example',
  standalone: true,
  imports: [KjTextareaComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
  `],
  template: `
    <kj-textarea
      [kjRows]="4"
      kjPlaceholder="Tell us about yourself…"
    ></kj-textarea>
  `,
})
export class KjTextareaExample {}
