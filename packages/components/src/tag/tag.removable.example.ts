import { Component, signal } from '@angular/core';
import { KjTagComponent, KjTagRemoveComponent } from './tag';

/**
 * Removable tags. Each chip projects a `<kj-tag-remove>` X button whose
 * `aria-label` is auto-derived from the parent's text content (`"Remove
 * Acme Corp"`). The host's `(kjTagRemoved)` output drops the chip from
 * the controlled signal.
 */
@Component({
  selector: 'kj-tag-removable-example',
  standalone: true,
  imports: [KjTagComponent, KjTagRemoveComponent],
  styles: [`:host { display: flex; flex-wrap: wrap; gap: 0.5rem; }`],
  template: `
    @for (tag of tags(); track tag) {
      <kj-tag kjVariant="secondary" (kjTagRemoved)="remove(tag)">
        {{ tag }}
        <kj-tag-remove>×</kj-tag-remove>
      </kj-tag>
    }
  `,
})
export class KjTagRemovableExample {
  protected readonly tags = signal(['Acme Corp', 'Globex', 'Initech', 'Umbrella']);

  protected remove(tag: string): void {
    this.tags.update(list => list.filter(t => t !== tag));
  }
}
