import { Component, signal } from '@angular/core';
import {
  KjTagComponent,
  KjTagListComponent,
} from './tag';

/**
 * Group of selectable chips inside a `<kj-tag-list kjTagListRole="listbox">`
 * container. The container provides one tab stop, roving arrow-key
 * navigation between chips, and `aria-multiselectable="true"` for the
 * filter-chips pattern.
 */
@Component({
  selector: 'kj-tag-list-example',
  standalone: true,
  imports: [KjTagComponent, KjTagListComponent],
  styles: [`:host { display: block; padding: var(--kj-space-xl); background: var(--kj-color-base-200); }`],
  template: `
    <kj-tag-list
      kjTagListRole="listbox"
      [kjTagListMultiple]="true"
      aria-label="Filter by tag"
    >
      <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="frontend">Frontend</kj-tag>
      <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="backend">Backend</kj-tag>
      <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="mobile">Mobile</kj-tag>
      <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="devops">DevOps</kj-tag>
      <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="design">Design</kj-tag>
    </kj-tag-list>
  `,
})
export class KjTagListExample {
  protected readonly frontend = signal(true);
  protected readonly backend = signal(false);
  protected readonly mobile = signal(false);
  protected readonly devops = signal(true);
  protected readonly design = signal(false);
}
