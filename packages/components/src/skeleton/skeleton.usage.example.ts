import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjSkeletonComponent } from './skeleton';

/**
 * A walkthrough of the most common skeleton usages — a circle avatar
 * placeholder paired with stacked text lines, and a wider rectangle for a
 * card preview. Use this as the copy-paste starting point for loading rows.
 */
@Component({
  selector: 'kj-skeleton-usage-example',
  standalone: true,
  imports: [KjSkeletonComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-xl);
      }
      .row {
        display: flex;
        align-items: center;
        gap: var(--kj-space-md);
      }
      .stack {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-xs);
        flex: 1;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="row" aria-busy="true" role="status">
      <kj-skeleton kjSkeletonShape="circle" kjWidth="2.5rem" kjHeight="2.5rem" />
      <div class="stack">
        <kj-skeleton kjSkeletonShape="text" kjWidth="60%" />
        <kj-skeleton kjSkeletonShape="text" kjWidth="40%" />
      </div>
    </div>

    <div aria-busy="true" role="status">
      <kj-skeleton kjSkeletonShape="rectangle" kjWidth="100%" kjHeight="8rem" />
      <kj-skeleton kjSkeletonShape="text-block" [kjLines]="3" />
    </div>
  `,
})
export class KjSkeletonUsageExample {}
