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
import { KjNumberInputComponent } from '../../number-input/number-input';
import { KJ_EDITOR_CONTRACT, type KjEditorContract } from './index';

/**
 * Inline numeric cell editor for `<kj-table>`. Renders the styled
 * `<kj-number-input>` component (which wraps the headless number-input
 * directive family) so cell editors stay consistent with the rest of the
 * design system.
 *
 * Commits on Enter or blur. Cancels on Escape. Non-finite drafts (e.g. an
 * empty field) round-trip through `cancel()` rather than committing `NaN`.
 */
@Component({
  selector: 'kj-number-editor',
  standalone: true,
  imports: [KjNumberInputComponent],
  template: `
    <kj-number-input
      class="kj-editor kj-editor--number"
      [(kjValue)]="draft"
      (keydown.enter)="commit()"
      (keydown.escape)="cancel(); $event.stopPropagation()"
      (focusout)="onFocusOut($event)"
    />
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjNumberEditor {
  private readonly ctx = inject(KJ_EDITOR_CONTRACT) as KjEditorContract<number>;
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private settled = false;
  private mounted = false;

  /** Template-bound `<kj-number-input>` — exposes a public `focus()`. */
  private readonly numberInput = viewChild(KjNumberInputComponent);

  protected readonly draft = signal<number>(0);

  constructor() {
    const v = this.ctx.value;
    this.draft.set(typeof v === 'number' && Number.isFinite(v) ? v : 0);
    afterNextRender(() => {
      this.numberInput()?.focus();
      this.mounted = true;
    });
  }

  protected commit(): void {
    if (this.settled) return;
    const value = this.draft();
    this.settled = true;
    if (Number.isFinite(value)) {
      this.ctx.commit(value);
    } else {
      this.ctx.cancel();
    }
  }

  protected cancel(): void {
    if (this.settled) return;
    this.settled = true;
    this.ctx.cancel();
  }

  /**
   * Commit on blur — but only when focus leaves the entire editor host
   * (i.e. not when focus moves between the inner input and a stepper
   * button). Without this guard, clicking a +/- stepper would fire blur
   * and prematurely commit before the value updates.
   */
  protected onFocusOut(event: FocusEvent): void {
    if (!this.mounted || this.settled) return;
    const next = event.relatedTarget as Node | null;
    if (next && this.hostEl.nativeElement.contains(next)) return;
    this.commit();
  }
}
