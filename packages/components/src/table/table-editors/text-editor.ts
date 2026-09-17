import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';
import { KjInputComponent } from '../../input/input';
import { injectKjCellEditor } from './cell-editor';

/**
 * Inline text cell editor for `<kj-table>`. Renders the styled
 * `<kj-input>` component (which wraps the headless `kjInput` directive and
 * applies theme tokens) so cell editors stay consistent with the rest of
 * the design system.
 *
 * Commits on Enter or blur. Cancels on Escape.
 */
@Component({
  selector: 'kj-text-editor',
  standalone: true,
  imports: [KjInputComponent],
  template: `
    <kj-input
      class="kj-editor kj-editor--text"
      [value]="editor.draft()"
      (input)="onInput($event)"
      (keydown.enter)="editor.commit()"
      (keydown.escape)="editor.cancel(); $event.stopPropagation()"
      (focusout)="editor.onFocusOut($event)"
    />
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTextEditor {
  /** Template-bound `<kj-input>` instance — exposes a public `focus()`. */
  private readonly inputCmp = viewChild(KjInputComponent);

  protected readonly editor = injectKjCellEditor<string>({
    seed: (v) => (v as string | null | undefined) ?? '',
    focus: () => this.inputCmp()?.focus(),
  });

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (target) this.editor.draft.set(target.value);
  }
}
