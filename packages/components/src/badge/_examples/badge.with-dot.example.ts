import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjBadgeComponent } from '../badge';

@Component({
  selector: 'kj-badge-with-dot-example',
  standalone: true,
  imports: [KjBadgeComponent],
  styles: [
    `
      :host {
        display: flex;
        gap: var(--kj-space-sm);
        flex-wrap: wrap;
        align-items: center;
      }
      .success {
        --kj-badge-dot-color: var(--kj-bg-success);
      }
      .warning {
        --kj-badge-dot-color: var(--kj-bg-warning);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-badge dot variant="secondary" class="success">Active</kj-badge>
    <kj-badge dot variant="secondary" class="warning">Pending</kj-badge>
    <kj-badge dot variant="outline">Archived</kj-badge>
  `,
})
export class KjBadgeWithDotExample {}
