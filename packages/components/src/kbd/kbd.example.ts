import { Component } from '@angular/core';
import { KjKbdComponent } from './kbd';

/**
 * Default usage example for KjKbdComponent.
 * A single keyboard-key visual rendered inline with prose. Anchors the chrome.
 */
@Component({
  selector: 'kj-kbd-example',
  standalone: true,
  imports: [KjKbdComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<p>Press <kj-kbd>K</kj-kbd> to focus search.</p>`,
})
export class KjKbdExample {}
