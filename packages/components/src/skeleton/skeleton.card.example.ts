import { Component } from '@angular/core';
import { KjSkeletonComponent } from './skeleton';

/**
 * Canonical card-skeleton recipe — an avatar-shaped circle, a title line
 * (60% width), and two body lines via the `text-block` shape, all inside
 * a region that carries the loading semantics the skeleton itself
 * intentionally does not.
 *
 * Note `aria-busy="true"` on the parent region: per `skeleton.md`, the
 * skeleton element is `aria-hidden` and silent; the *region* announces
 * the busy state to AT. A polite `role="status"` live region complements
 * this in a real app via `KjLiveRegion.announce('Loading…')`; here we
 * keep the demo declarative so the structure is self-evident.
 */
@Component({
  selector: 'kj-skeleton-card-example',
  standalone: true,
  imports: [KjSkeletonComponent],
  styles: [`
    :host { display: block; }
    .card {
      display: flex;
      flex-direction: column;
      gap: var(--kj-space-md);
      padding: var(--kj-space-lg); border: 1px solid var(--kj-border-default);
      border-radius: var(--kj-radius-box, 0.75rem);
      max-width: 24rem;
    }
    .header { display: flex; align-items: center; gap: var(--kj-space-md); }
    .title-stack { display: flex; flex-direction: column; gap: var(--kj-space-xs, 0.25rem); flex: 1 1 0; }
    .body { display: flex; flex-direction: column; gap: var(--kj-space-sm); }
  `],
  template: `
    <section class="card" aria-busy="true" aria-label="Loading card content">
      <div class="header">
        <kj-skeleton kjSkeletonShape="circle" kjWidth="2.5rem" kjHeight="2.5rem" />
        <div class="title-stack">
          <kj-skeleton kjSkeletonShape="text" kjWidth="60%" kjHeight="1rem" />
          <kj-skeleton kjSkeletonShape="text" kjWidth="40%" kjHeight="0.75rem" />
        </div>
      </div>
      <div class="body">
        <kj-skeleton kjSkeletonShape="text-block" [kjLines]="3" />
      </div>
    </section>
  `,
})
export class KjSkeletonCardExample {}
