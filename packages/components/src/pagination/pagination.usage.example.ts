import { Component, signal } from '@angular/core';
import { KjPaginationDefaultComponent } from './pagination';

/**
 * A walkthrough of the most common pagination usages — the
 * `<kj-pagination-default>` convenience wrapper with a small dataset, a
 * larger one that exposes ellipsis windowing, and a layout that surfaces the
 * trailing "Page N of M" info text.
 */
@Component({
  selector: 'kj-pagination-usage-example',
  standalone: true,
  imports: [KjPaginationDefaultComponent],
  styles: [`
    :host { display: flex; flex-direction: column; gap: var(--kj-space-lg); }
    .label { font-size: 0.75rem; color: var(--kj-fg-default); opacity: 0.7; text-transform: uppercase; letter-spacing: 0.04em; }
  `],
  template: `
    <div>
      <span class="label">Compact (5 pages)</span>
      <kj-pagination-default [(kjPage)]="pageA" [kjTotalPages]="5" />
    </div>
    <div>
      <span class="label">Large (20 pages)</span>
      <kj-pagination-default [(kjPage)]="pageB" [kjTotalPages]="20" />
    </div>
    <div>
      <span class="label">With info</span>
      <kj-pagination-default [(kjPage)]="pageC" [kjTotalPages]="10" [kjShowInfo]="true" />
    </div>
  `,
})
export class KjPaginationUsageExample {
  readonly pageA = signal(1);
  readonly pageB = signal(7);
  readonly pageC = signal(3);
}
