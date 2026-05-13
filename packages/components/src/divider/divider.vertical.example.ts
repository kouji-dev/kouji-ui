import { Component } from '@angular/core';
import { KjDividerComponent } from './divider';

/**
 * Vertical orientation between two inline elements. The wrapper's
 * `display: contents` host means the `<kj-divider>` element itself
 * does not introduce an extra block-level box, so the surrounding
 * row-flex strip lays out the rule between the two siblings.
 */
@Component({
  selector: 'kj-divider-vertical-example',
  standalone: true,
  imports: [KjDividerComponent],
  styles: [`
    :host { display: block; padding: var(--kj-space-xl); background: var(--kj-bg-surface); }
    .row { display: flex; align-items: center; gap: var(--kj-space-md); min-block-size: 2rem; }
  `],
  template: `
    <div class="row">
      <span>Inbox</span>
      <kj-divider kjOrientation="vertical" />
      <span>Drafts</span>
      <kj-divider kjOrientation="vertical" />
      <span>Sent</span>
    </div>
  `,
})
export class KjDividerVerticalExample {}
