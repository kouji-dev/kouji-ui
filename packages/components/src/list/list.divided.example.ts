import { Component } from '@angular/core';
import { KjListComponent, KjListItemComponent } from './list';

/**
 * Divided list. Toggling `divided` paints between-row separators via the
 * theme CSS rule on `[data-divided]` — no per-row class plumbing required.
 * Pairs naturally with `hoverable` to hint at interactivity on rows that
 * are actually clickable.
 */
@Component({
  selector: 'kj-list-divided-example',
  standalone: true,
  imports: [KjListComponent, KjListItemComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  template: `
    <kj-list ariaLabel="Recent files" [divided]="true">
      <kj-list-item>Q4 financial report.pdf</kj-list-item>
      <kj-list-item>Brand guidelines.fig</kj-list-item>
      <kj-list-item>Meeting notes — Oct 21.md</kj-list-item>
      <kj-list-item>Customer interviews.csv</kj-list-item>
      <kj-list-item>Design system roadmap.key</kj-list-item>
    </kj-list>
  `,
})
export class KjListDividedExample {}
