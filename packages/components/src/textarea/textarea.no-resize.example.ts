import { Component } from '@angular/core';
import { KjTextareaComponent } from './textarea';

/**
 * Locks the user-drag resize handle. Use when the surrounding layout owns
 * the textarea's geometry (e.g. inside a fixed-height card).
 */
@Component({
  selector: 'kj-textarea-no-resize-example',
  standalone: true,
  imports: [KjTextareaComponent],
  styles: [`
    :host { display: block; }
  `],
  template: `
    <kj-textarea
      [kjRows]="3"
      kjResize="none"
      kjPlaceholder="No resize handle on this one…"
    ></kj-textarea>
  `,
})
export class KjTextareaNoResizeExample {}
