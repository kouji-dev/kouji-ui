import { Component } from '@angular/core';
import { KjCardComponent } from './card';

/**
 * Default usage example for KjCardComponent.
 * Rendered live in the docs and as code in the example panel.
 */
@Component({
  selector: 'kj-card-example',
  standalone: true,
  imports: [KjCardComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }`],
  template: `<kj-card variant="default"><strong>Card title</strong><p style="margin: var(--kj-space-sm) 0 0; color: var(--kj-fg-muted);">Body content goes here. Cards group related information.</p></kj-card>`,
})
export class KjCardExample {}
