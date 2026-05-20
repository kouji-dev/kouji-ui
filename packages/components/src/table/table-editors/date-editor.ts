import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { KjDatePickerComponent } from '../../date-picker/date-picker';
import { KJ_EDITOR_CONTRACT, type KjEditorContract } from './index';

/**
 * Inline date cell editor for `<kj-table>`. Renders the styled
 * `<kj-date-picker>` component (a typed input plus a popover calendar)
 * so cell editors stay consistent with the rest of the design system.
 *
 * The contract uses real `Date | null`. We bind to a draft signal that
 * mirrors the picker's `kjValue` model. Commits on Enter; cancels on
 * Escape. Blur is intentionally NOT wired here — the styled picker's
 * trigger directive emits `focusout` events during mount (the calendar
 * popover and the calendar input swap focus internally) so a blur
 * listener would fire prematurely. The host (table cell) can use
 * the contract's external lifecycle to handle commit-on-cell-blur.
 */
@Component({
  selector: 'kj-date-editor',
  standalone: true,
  imports: [KjDatePickerComponent],
  template: `
    <kj-date-picker
      class="kj-editor kj-editor--date"
      kjLocale="sv-SE"
      [(kjValue)]="draft"
      (keydown)="onKeydown($event)"
    />
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjDateEditor {
  private readonly ctx = inject(KJ_EDITOR_CONTRACT) as KjEditorContract<Date | null>;
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private settled = false;

  protected readonly draft = signal<Date | null>(null);

  constructor() {
    const v = this.ctx.value;
    this.draft.set(v instanceof Date && !Number.isNaN(v.getTime()) ? v : null);
    afterNextRender(() => {
      const input = this.hostEl.nativeElement.querySelector<HTMLInputElement>('input');
      input?.focus();
    });
  }

  protected commit(): void {
    if (this.settled) return;
    // Parse the input's typed text directly — at the moment Enter fires the
    // styled date-picker has already pushed the parsed Date into its kjValue
    // model via the trigger directive, but signal-propagation timing across
    // the two-way binding chain (root context -> wrapper -> draft) is not
    // guaranteed to be flushed before our handler runs. Reading the input
    // element gives us a deterministic source of truth.
    const input = this.hostEl.nativeElement.querySelector<HTMLInputElement>('input');
    const raw = (input?.value ?? '').trim();
    if (raw === '') {
      this.settled = true;
      this.ctx.commit(null);
      return;
    }
    const parsed = parseIsoLike(raw) ?? this.draft();
    if (!parsed || Number.isNaN(parsed.getTime())) {
      this.settled = true;
      this.ctx.cancel();
      return;
    }
    this.settled = true;
    this.ctx.commit(parsed);
  }

  protected cancel(): void {
    if (this.settled) return;
    this.settled = true;
    this.ctx.cancel();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.commit();
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      this.cancel();
    }
  }
}

/**
 * Parse the most common date shapes (ISO `YYYY-MM-DD`, also Swedish/locale
 * forms that share that order). Falls back to `new Date(raw)` for ISO-with-
 * time variants. Returns `null` for anything unparseable.
 */
function parseIsoLike(raw: string): Date | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]) - 1;
    const d = Number(iso[3]);
    const out = new Date(y, m, d);
    if (out.getFullYear() === y && out.getMonth() === m && out.getDate() === d) return out;
    return null;
  }
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

