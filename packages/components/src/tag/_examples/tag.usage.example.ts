import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { KjTagComponent, KjTagRemoveComponent, KjTagListComponent } from '../tag';

/**
 * A walkthrough of the most common tag usages — decorative variants, a
 * removable chip with a (kjTagRemoved) handler, a selectable filter pill, and
 * a tag list with arrow-key navigation. Copy-paste starting point.
 */
@Component({
  selector: 'kj-tag-usage-example',
  standalone: true,
  imports: [KjTagComponent, KjTagRemoveComponent, KjTagListComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--kj-space-md);
      }
      .row {
        display: flex;
        gap: var(--kj-space-sm);
        flex-wrap: wrap;
        align-items: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="row">
      <kj-tag kjVariant="default">New</kj-tag>
      <kj-tag kjVariant="success">Shipped</kj-tag>
      <kj-tag kjVariant="warning">Pending</kj-tag>
      <kj-tag kjVariant="destructive">Failed</kj-tag>
    </div>

    <div class="row">
      @for (t of remaining(); track t) {
        <kj-tag>
          {{ t }}
          <kj-tag-remove (click)="remove(t)">×</kj-tag-remove>
        </kj-tag>
      }
    </div>

    <kj-tag-list class="row">
      <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="onlyMine">Only mine</kj-tag>
      <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="recent">Recent</kj-tag>
      <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="archived">Archived</kj-tag>
    </kj-tag-list>
  `,
})
export class KjTagUsageExample {
  readonly remaining = signal<string[]>(['design', 'engineering', 'launch']);
  readonly onlyMine = signal(false);
  readonly recent = signal(true);
  readonly archived = signal(false);

  remove(t: string): void {
    this.remaining.update((list) => list.filter((x) => x !== t));
  }
}
