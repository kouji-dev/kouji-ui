import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';
import { KjNumberInputComponent } from '../../number-input/number-input';
import { injectKjCellEditor } from './cell-editor';

/**
 * Inline numeric cell editor for `<kj-table>`. Renders the styled
 * `<kj-number-input>` component (which wraps the headless number-input
 * directive family) so cell editors stay consistent with the rest of the
 * design system.
 *
 * Commits on Enter or blur. Cancels on Escape. Non-finite drafts (e.g. an
 * empty field) round-trip through `cancel()` rather than committing `NaN`.
 * Blur commits only when focus leaves the whole editor, so moving between
 * the field and a stepper button never commits early.
 */
@Component({
  selector: 'kj-number-editor',
  standalone: true,
  imports: [KjNumberInputComponent],
  template: `
    <kj-number-input
      class="kj-editor kj-editor--number"
      [(kjValue)]="draft"
      (keydown.enter)="editor.commit()"
      (keydown.escape)="editor.cancel(); $event.stopPropagation()"
      (focusout)="editor.onFocusOut($event)"
    />
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjNumberEditor {
  /** Template-bound `<kj-number-input>` — exposes a public `focus()`. */
  private readonly numberInput = viewChild(KjNumberInputComponent);

  protected readonly editor = injectKjCellEditor<number>({
    seed: (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0),
    focus: () => this.numberInput()?.focus(),
    validate: (v) => Number.isFinite(v),
  });

  protected readonly draft = this.editor.draft;
}
