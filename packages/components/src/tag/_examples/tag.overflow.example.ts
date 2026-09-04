import { Component, ChangeDetectionStrategy } from '@angular/core';
import { KjTagComponent, KjTagListComponent } from '../tag';

/**
 * `[kjMax]="3"` shows the first three chips and collapses the rest into a
 * "+N" chip. Hover, focus or tap the chip: the panel lists the collapsed
 * chips by their text.
 */
@Component({
  selector: 'kj-tag-overflow-example',
  standalone: true,
  imports: [KjTagComponent, KjTagListComponent],
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-tag-list [kjMax]="3" aria-label="Assignees">
      <kj-tag kjVariant="secondary">Ada Lovelace</kj-tag>
      <kj-tag kjVariant="secondary">Grace Hopper</kj-tag>
      <kj-tag kjVariant="secondary">Alan Turing</kj-tag>
      <kj-tag kjVariant="secondary">Katherine Johnson</kj-tag>
      <kj-tag kjVariant="secondary">Margaret Hamilton</kj-tag>
      <kj-tag kjVariant="secondary">Donald Knuth</kj-tag>
    </kj-tag-list>
  `,
})
export class KjTagOverflowExample {}
