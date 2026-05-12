import { Component, signal } from '@angular/core';
import { KjTagComponent } from './tag';

/**
 * Selectable / toggle chips. Each chip is `role="button"` with
 * `aria-pressed` mirrored from the two-way `kjTagSelected` model. Click
 * or press Space / Enter to toggle.
 */
@Component({
  selector: 'kj-tag-selectable-example',
  standalone: true,
  imports: [KjTagComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
    `,
  ],
  template: `
    <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="design">Design</kj-tag>
    <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="engineering">Engineering</kj-tag>
    <kj-tag [kjTagSelectable]="true" [(kjTagSelected)]="research">Research</kj-tag>
  `,
})
export class KjTagSelectableExample {
  protected readonly design = signal(true);
  protected readonly engineering = signal(false);
  protected readonly research = signal(false);
}
