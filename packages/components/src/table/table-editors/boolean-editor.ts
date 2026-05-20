import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { KjToggleComponent } from '../../toggle/toggle';
import { KJ_EDITOR_CONTRACT, type KjEditorContract } from './index';

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
      (click)="ctx.commit(draft())"
      (keydown.enter)="toggleAndCommit(); $event.preventDefault()"
      (keydown.space)="toggleAndCommit(); $event.preventDefault()"
      (keydown.escape)="cancel(); $event.stopPropagation()"
    >
      {{ draft() ? 'On' : 'Off' }}
    </kj-toggle>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjBooleanEditor {
  protected readonly ctx = inject(KJ_EDITOR_CONTRACT) as KjEditorContract<boolean>;
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);

  protected readonly draft = signal<boolean>(false);

  constructor() {
    this.draft.set(!!this.ctx.value);
    afterNextRender(() => {
      const btn = this.hostEl.nativeElement.querySelector<HTMLButtonElement>('button');
      btn?.focus();
    });
  }

  protected cancel(): void {
    this.ctx.cancel();
  }

  /**
   * Flip the draft and commit. The `[(pressed)]` two-way binding into the
   * kj-toggle handles updating its visual state — and the toggle's own
   * `pressedChange` will also fire commit, but `ctx.commit` is idempotent
   * from the host's perspective so a single user action -> single commit.
   */
  protected toggleAndCommit(): void {
    const next = !this.draft();
    this.draft.set(next);
    this.ctx.commit(next);
  }
}
