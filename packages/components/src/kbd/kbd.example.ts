import { Component } from '@angular/core';
import { KjKbdComponent } from './kbd';

/**
 * Default usage example for KjKbdComponent.
 * Rendered live in the docs and as code in the example panel.
 */
@Component({
  selector: 'kj-kbd-example',
  standalone: true,
  imports: [KjKbdComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `<p>Press <kj-kbd>⌘</kj-kbd> + <kj-kbd>K</kj-kbd> to open search.</p>`,
})
export class KjKbdExample {}
