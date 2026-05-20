import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { KjOptionComponent, KjSelectComponent } from '../../select/select';
import { KJ_EDITOR_CONTRACT, type KjEditorContract } from './index';

/** Option entry accepted by `<kj-select-editor>`. */
export type KjSelectEditorOption = string | { value: unknown; label: string };

interface ResolvedOption {
  readonly value: unknown;
  readonly label: string;
}

/**
 * Inline select cell editor for `<kj-table>`. Renders the styled
 * `<kj-select>` component (trigger button + portalled listbox panel) so
 * cell editors stay consistent with the rest of the design system.
 *
 * Accepts options as `string[]` or `{ value, label }[]` — strings are
 * mapped to `{ value: s, label: s }`. The styled select closes its
 * panel on activation; the editor commits the selected value at that
 * point. Escape cancels.
 */
@Component({
  selector: 'kj-select-editor',
  standalone: true,
  imports: [KjSelectComponent, KjOptionComponent],
  template: `
    <kj-select
      class="kj-editor kj-editor--select"
      [value]="draftValue()"
      (valueChange)="onValueChange($event)"
      (keydown.escape)="cancel(); $event.stopPropagation()"
    >
      @for (opt of resolved(); track opt.label) {
        <kj-option [value]="opt.value">{{ opt.label }}</kj-option>
      }
    </kj-select>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjSelectEditor {
  private readonly ctx = inject(KJ_EDITOR_CONTRACT) as KjEditorContract<unknown>;

  /**
   * Template-bound reference to the inner `<kj-select>`. Exposes the
   * trigger via its public `focus()` API — no DOM querying needed.
   */
  private readonly select = viewChild(KjSelectComponent);

  /** Direct option list. Optional — when omitted, options are pulled
   *  from `contract.meta?.options` so the cell-editor-outlet can forward
   *  the column's `kjSelectOptions` without binding inputs imperatively. */
  readonly kjOptions = input<ReadonlyArray<KjSelectEditorOption>>([]);

  protected readonly resolved = computed<ResolvedOption[]>(() => {
    const direct = this.kjOptions();
    const fromMeta = this.ctx.meta?.['options'] as ReadonlyArray<KjSelectEditorOption> | undefined;
    const source = direct.length > 0 ? direct : (fromMeta ?? []);
    return source.map(opt =>
      typeof opt === 'string'
        ? { value: opt, label: opt }
        : { value: opt.value, label: opt.label },
    );
  });

  protected readonly draftValue = signal<unknown>(undefined);

  private focused = false;

  constructor() {
    this.draftValue.set(this.ctx.value);
    // Two reactive hops: first the editor's viewChild resolves to the
    // `<kj-select>` instance, then that instance's own `triggerEl`
    // signal resolves to the trigger button's ElementRef. `effect` tracks
    // both. We focus once — `focused` prevents stealing focus back if
    // the user later clicks away and the signal re-emits.
    effect(() => {
      const sel = this.select();
      const trigger = sel?.triggerEl();
      if (!trigger || this.focused) return;
      this.focused = true;
      (trigger as ElementRef<HTMLElement>).nativeElement.focus();
    });
  }

  protected onValueChange(next: unknown): void {
    this.draftValue.set(next);
    this.ctx.commit(next);
  }

  protected cancel(): void {
    this.ctx.cancel();
  }
}
