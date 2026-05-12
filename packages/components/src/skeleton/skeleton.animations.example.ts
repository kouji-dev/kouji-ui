import { Component } from '@angular/core';
import { KjSkeletonComponent } from './skeleton';

/**
 * Animation presets — `shimmer` (the default sweep), `pulse` (opacity
 * oscillation), and `none` (static). The `none` value is the consumer-
 * side `prefers-reduced-motion` escape hatch; theme CSS additionally
 * suppresses every animation when the OS reports the preference.
 */
@Component({
  selector: 'kj-skeleton-animations-example',
  standalone: true,
  imports: [KjSkeletonComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-lg);
      }
      .row {
        display: flex;
        align-items: center;
        gap: var(--kj-space-md);
      }
      .label {
        min-width: 5rem;
        font-size: 0.75rem;
        color: var(--kj-color-base-content);
        opacity: 0.7;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
    `,
  ],
  template: `
    <div class="row">
      <span class="label">shimmer</span>
      <kj-skeleton kjSkeletonAnimation="shimmer" kjWidth="18rem" kjHeight="1.25rem" />
    </div>
    <div class="row">
      <span class="label">pulse</span>
      <kj-skeleton kjSkeletonAnimation="pulse" kjWidth="18rem" kjHeight="1.25rem" />
    </div>
    <div class="row">
      <span class="label">none</span>
      <kj-skeleton kjSkeletonAnimation="none" kjWidth="18rem" kjHeight="1.25rem" />
    </div>
  `,
})
export class KjSkeletonAnimationsExample {}
