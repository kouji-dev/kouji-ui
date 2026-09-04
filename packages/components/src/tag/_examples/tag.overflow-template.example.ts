import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjOverflowContent } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';
import { KjTagComponent, KjTagListComponent, KjTagRemoveComponent } from '../tag';

interface Assignee {
  id: number;
  name: string;
}

/**
 * The collapsed chips rendered by a `kjOverflowContent` template: the context's
 * `start` index slices the same collection the chips come from, so each hidden
 * assignee gets its own row with a remove action — the same action the visible
 * chips expose through `<kj-tag-remove>`.
 */
@Component({
  selector: 'kj-tag-overflow-template-example',
  standalone: true,
  imports: [
    KjTagComponent,
    KjTagListComponent,
    KjTagRemoveComponent,
    KjOverflowContent,
    KjButtonComponent,
  ],
  styles: [
    `
      :host {
        display: block;
      }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--kj-space-md);
        padding: var(--kj-space-xs) var(--kj-space-sm);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-tag-list [kjMax]="2" aria-label="Assignees">
      @for (a of assignees(); track a.id) {
        <kj-tag kjVariant="secondary">
          {{ a.name }}
          <kj-tag-remove (click)="remove(a)" />
        </kj-tag>
      }
      <ng-template kjOverflowContent let-count let-start="start">
        @for (a of assignees().slice(start); track a.id) {
          <div class="row">
            <span>{{ a.name }}</span>
            <kj-button kjVariant="ghost" kjSize="sm" (click)="remove(a)">Remove</kj-button>
          </div>
        }
      </ng-template>
    </kj-tag-list>
  `,
})
export class KjTagOverflowTemplateExample {
  protected readonly assignees = signal<Assignee[]>([
    { id: 1, name: 'Ada Lovelace' },
    { id: 2, name: 'Grace Hopper' },
    { id: 3, name: 'Alan Turing' },
    { id: 4, name: 'Katherine Johnson' },
    { id: 5, name: 'Margaret Hamilton' },
  ]);

  protected remove(a: Assignee): void {
    this.assignees.update((list) => list.filter((x) => x.id !== a.id));
  }
}
