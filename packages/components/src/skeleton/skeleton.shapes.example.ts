import { Component } from '@angular/core';
import { KjSkeletonComponent } from './skeleton';

/**
 * Shape presets — `rectangle`, `circle`, `text`, `text-block` — laid out
 * side-by-side so the `data-shape` reflection and theme-side chrome are
 * visible against each other. The `text-block` wrapper expands into N
 * stacked text-shaped lines (the last at 60% width).
 */
@Component({
  selector: 'kj-skeleton-shapes-example',
  standalone: true,
  imports: [KjSkeletonComponent],
  styles: [`
    :host { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--kj-space-xl); padding: var(--kj-space-xl); background: var(--kj-color-base-200); }
    .cell { display: flex; flex-direction: column; gap: var(--kj-space-sm); }
    .label { font-size: 0.75rem; color: var(--kj-color-base-content); opacity: 0.7; text-transform: uppercase; letter-spacing: 0.04em; }
  `],
  template: `
    <div class="cell">
      <span class="label">rectangle</span>
      <kj-skeleton kjSkeletonShape="rectangle" kjWidth="100%" kjHeight="3rem" />
    </div>
    <div class="cell">
      <span class="label">circle</span>
      <kj-skeleton kjSkeletonShape="circle" kjWidth="3rem" kjHeight="3rem" />
    </div>
    <div class="cell">
      <span class="label">text</span>
      <kj-skeleton kjSkeletonShape="text" kjWidth="14rem" />
    </div>
    <div class="cell">
      <span class="label">text-block</span>
      <kj-skeleton kjSkeletonShape="text-block" [kjLines]="3" />
    </div>
  `,
})
export class KjSkeletonShapesExample {}
