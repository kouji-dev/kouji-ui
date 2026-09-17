import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { KjToggleComponent } from '../../toggle/toggle';
import { injectKjCellEditor } from './cell-editor';

/**
 * Inline boolean cell editor for `<kj-table>`. Renders the styled
 * `<kj-toggle>` component (a real `<button role="switch">` with theme
 * tokens) so cell editors stay consistent with the rest of the design
 * system.
 *
 * Each toggle commits the new draft immediately. Escape cancels.
 */
@Component({
  selector: 'kj-boolean-editor',
  standalone: true,
  imports: [KjToggleComponent],
  template: `
    <kj-toggle
      class="kj-editor kj-editor--boolean"
      appearance="switch"
      [(pressed)]="draft"
      (click)="editor.commit(draft())"
      (keydown.enter)="toggleAndCommit(); $event.preventDefault()"
      (keydown.space)="toggleAndCommit(); $event.preventDefault()"
      (keydown.escape)="editor.cancel(); $event.stopPropagation()"
    >
      {{ draft() ? 'On' : 'Off' }}
    </kj-toggle>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBooleanEditor {
  /** Every toggle commits, so the editor never settles. */
  protected readonly editor = injectKjCellEditor<boolean>({
    seed: (v) => !!v,
    focus: () => this.editor.host.querySelector<HTMLButtonElement>('button')?.focus(),
    settleOnce: false,
  });

  protected readonly draft = this.editor.draft;

  /**
   * Flip the draft and commit. The `[(pressed)]` two-way binding into the
   * kj-toggle handles updating its visual state — and the toggle's own
   * `pressedChange` will also fire commit, but `ctx.commit` is idempotent
   * from the host's perspective so a single user action -> single commit.
   */
  protected toggleAndCommit(): void {
    const next = !this.draft();
    this.draft.set(next);
    this.editor.commit(next);
  }
}
