import { Component, signal } from '@angular/core';
import { KjListComponent, KjListItemComponent } from '../list';

/**
 * Interactive list — `hoverable` paints a hover surface and the projected
 * `<button>` per row owns the focus stop, the keyboard contract, and the
 * click handler. The list itself is just rendering: Tab moves between
 * buttons, never landing on the row chrome.
 */
@Component({
  selector: 'kj-list-interactive-example',
  standalone: true,
  imports: [KjListComponent, KjListItemComponent],
  styles: [`
    :host { display: block; }
    .kj-list-interactive-status {
      margin-top: var(--kj-space-md);
      font: 0.875rem / 1.4 var(--kj-font-sans);
      color: var(--kj-fg-default);
      opacity: 0.75;
    }
  `],
  template: `
    <kj-list ariaLabel="Recent contacts" [divided]="true" [hoverable]="true">
      @for (contact of contacts; track contact) {
        <kj-list-item>
          <button type="button" (click)="select(contact)">{{ contact }}</button>
        </kj-list-item>
      }
    </kj-list>
    <p class="kj-list-interactive-status">
      Selected: {{ selected() ?? '(none)' }}
    </p>
  `,
})
export class KjListInteractiveExample {
  protected readonly contacts = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson'];
  protected readonly selected = signal<string | null>(null);

  protected select(name: string): void {
    this.selected.set(name);
  }
}
