import { Component } from '@angular/core';
import { KjSkeletonComponent } from './skeleton';

/**
 * Default usage example for `KjSkeletonComponent` — a single rectangle
 * skeleton sized to stand in for a generic content block. Demonstrates
 * the bare-minimum recipe: pick a width / height, drop the wrapper in,
 * let the directive set `aria-hidden` and the shimmer paint.
 */
@Component({
  selector: 'kj-skeleton-example',
  standalone: true,
  imports: [KjSkeletonComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `<kj-skeleton kjWidth="16rem" kjHeight="1.5rem" />`,
})
export class KjSkeletonExample {}
