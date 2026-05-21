import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { KjInputComponent } from '../../input/input';
import { KJ_EDITOR_CONTRACT, type KjEditorContract } from './index';

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
      [value]="draft()"
      (input)="onInput($event)"
      (keydown.enter)="commit()"
      (keydown.escape)="cancel(); $event.stopPropagation()"
      (focusout)="onFocusOut($event)"
    />
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTextEditor {
  private readonly ctx = inject(KJ_EDITOR_CONTRACT) as KjEditorContract<string>;
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private settled = false;
  private mounted = false;

  /** Template-bound `<kj-input>` instance — exposes a public `focus()`. */
  private readonly inputCmp = viewChild(KjInputComponent);

  protected readonly draft = signal<string>('');

  constructor() {
    this.draft.set(this.ctx.value ?? '');
    afterNextRender(() => {
      this.inputCmp()?.focus();
      this.mounted = true;
    });
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (target) this.draft.set(target.value);
  }

  protected commit(): void {
    if (this.settled) return;
    this.settled = true;
    this.ctx.commit(this.draft());
  }

  protected cancel(): void {
    if (this.settled) return;
    this.settled = true;
    this.ctx.cancel();
  }

  protected onFocusOut(event: FocusEvent): void {
    if (!this.mounted || this.settled) return;
    const next = event.relatedTarget as Node | null;
    if (next && this.hostEl.nativeElement.contains(next)) return;
    this.commit();
  }
}
