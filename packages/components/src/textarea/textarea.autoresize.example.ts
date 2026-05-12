import { Component } from '@angular/core';
import { KjTextareaComponent } from './textarea';

/**
 * Auto-resize example. The textarea grows from `kjMinRows` to `kjMaxRows`
 * as the user types and the user drag handle is suppressed.
 */
@Component({
  selector: 'kj-textarea-autoresize-example',
  standalone: true,
  imports: [KjTextareaComponent],
  styles: [
    `
      :host {
        display: grid;
        gap: var(--kj-space-md);
      }
      label {
        font: var(--kj-text-xs)/1.2 var(--kj-font-mono, var(--kj-font-sans));
        color: var(--kj-color-neutral);
      }
    `,
  ],
  template: `
    <div>
      <label for="bio">Auto-resize (2–8 rows)</label>
      <kj-textarea
        kjAutoresize="auto"
        [kjMinRows]="2"
        [kjMaxRows]="8"
        kjPlaceholder="Type a few lines and watch the height adjust…"
      ></kj-textarea>
    </div>
  `,
})
export class KjTextareaAutoresizeExample {}
