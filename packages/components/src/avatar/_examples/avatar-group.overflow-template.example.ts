import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { KjOverflowContent } from '@kouji-ui/core';
import { KjButtonComponent } from '../../button/button';
import { KjAvatarGroupComponent } from '../avatar-group';
import { KjAvatarComponent } from '../avatar';

interface Collaborator {
  id: number;
  initials: string;
  name: string;
}

/**
 * The "+N" chip's panel rendered by a `kjOverflowContent` template: the
 * context's `start` index slices the collection the avatars come from, so
 * every hidden collaborator gets a row with an action.
 */
@Component({
  selector: 'kj-avatar-group-overflow-template-example',
  standalone: true,
  imports: [KjAvatarGroupComponent, KjAvatarComponent, KjOverflowContent, KjButtonComponent],
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
    <kj-avatar-group [kjMax]="3" kjAriaLabel="collaborators">
      @for (c of collaborators(); track c.id) {
        <kj-avatar [content]="c.initials" [alt]="c.name" />
      }
      <ng-template kjOverflowContent let-count let-start="start">
        @for (c of collaborators().slice(start); track c.id) {
          <div class="row">
            <span>{{ c.name }}</span>
            <kj-button kjVariant="ghost" kjSize="sm" (click)="remove(c)">Remove</kj-button>
          </div>
        }
      </ng-template>
    </kj-avatar-group>
  `,
})
export class KjAvatarGroupOverflowTemplateExample {
  protected readonly collaborators = signal<Collaborator[]>([
    { id: 1, initials: 'AL', name: 'Ada Lovelace' },
    { id: 2, initials: 'GH', name: 'Grace Hopper' },
    { id: 3, initials: 'AT', name: 'Alan Turing' },
    { id: 4, initials: 'KJ', name: 'Katherine Johnson' },
    { id: 5, initials: 'MH', name: 'Margaret Hamilton' },
    { id: 6, initials: 'DK', name: 'Donald Knuth' },
  ]);

  protected remove(c: Collaborator): void {
    this.collaborators.update((list) => list.filter((x) => x.id !== c.id));
  }
}
