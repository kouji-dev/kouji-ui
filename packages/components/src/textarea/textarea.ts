import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  effect,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  KjLiveRegion,
  KjTextarea,
  type KjTextareaAutoresize,
  type KjTextareaResize,
} from '@kouji-ui/core';

let nextId = 0;

/**
 * Number transform that preserves `undefined` (instead of NaN-ing on absent
 * numbers like Angular's built-in `numberAttribute`).
 *
 * @internal
 */
function optionalNumber(v: number | string | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Required-number transform: same shape, but returns the default when the
 * input is missing/invalid (used for `kjRows`).
 *
 * @internal
 */
function numberWithDefault(def: number) {
  return (v: number | string | undefined): number => {
    const n = optionalNumber(v);
    return n ?? def;
  };
}

/**
 * Styled wrapper around the headless `KjTextarea` directive.
 *
 * Element-wrapper pattern: `<kj-textarea>` is a structural shell
 * (`display: contents;`); the inner `<textarea>` carries native textarea
 * semantics (focus, form integration, validation, native maxlength).
 *
 * Adds, on top of `KjTextarea`:
 * - A theme-token CSS shell (`.kj-textarea`).
 * - An optional visible character counter (`{ length } / { kjMaxLength }`)
 *   wired to a polite live region for screen-reader announcements at
 *   threshold crossings (≤ 20, ≤ 10, 0 remaining).
 * - `aria-describedby` plumbing from the textarea to the counter element.
 *
 * @example
 * ```html
 * <kj-textarea kjRows="4" [(ngModel)]="bio" kjPlaceholder="Tell us about yourself" />
 *
 * <kj-textarea kjAutoresize="auto" [kjMinRows]="2" [kjMaxRows]="8"
 *              [(ngModel)]="bio" />
 *
 * <kj-textarea [kjMaxLength]="200" kjShowCounter [(ngModel)]="bio" />
 * ```
 *
 * @doc-example Default
 *   @doc-file textarea.example.ts
 * @doc-example Auto-resize
 *   @doc-file textarea.autoresize.example.ts
 * @doc-example Character counter
 *   @doc-file textarea.character-count.example.ts
 * @doc-example No resize handle
 *   @doc-file textarea.no-resize.example.ts
 * @doc-example With Field wrapper
 *   @doc-file textarea.with-field.example.ts
 * @category Library/Data input
 * @doc
 * @doc-name textarea
 * @doc-description Themed multi-line text input with optional auto-resize and live character counter.
 * @doc-is-main
 */
@Component({
  selector: 'kj-textarea',
  standalone: true,
  imports: [KjTextarea, KjLiveRegion],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => KjTextareaComponent),
      multi: true,
    },
  ],
  template: `
    <textarea
      kjTextarea
      class="kj-textarea"
      [rows]="kjRows()"
      [value]="currentValue()"
      [placeholder]="kjPlaceholder()"
      [kjVariant]="kjVariant()"
      [kjSize]="kjSize()"
      [kjInvalid]="kjInvalid()"
      [kjDisabled]="kjDisabled() || cvaDisabled()"
      [kjResize]="kjResize()"
      [kjAutoresize]="kjAutoresize()"
      [kjMinRows]="kjMinRows()"
      [kjMaxRows]="kjMaxRows()"
      [kjMaxLength]="kjMaxLength()"
      [attr.aria-describedby]="ariaDescribedBy()"
      (input)="onInnerInput($any($event.target).value)"
      (blur)="onInnerBlur()"
    ></textarea>
    @if (showCounter()) {
      <div
        class="kj-textarea__counter"
        [id]="counterId"
        [attr.data-state]="counterState()"
      >{{ valueLength() }} / {{ kjMaxLength() }}</div>
      <div
        class="kj-textarea__live"
        kjLiveRegion
        kjPoliteness="polite"
      >{{ liveMessage() }}</div>
    }
  `,
  styleUrl: './textarea.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTextareaComponent implements ControlValueAccessor {
  /** Uncontrolled fallback value. Templated forms use `[(ngModel)]` / `[formControl]`. */
  readonly kjValue = input<string>('');

  /** Native `placeholder` attribute. */
  readonly kjPlaceholder = input<string>('');

  /** Native `rows` attribute. Default `3`. */
  readonly kjRows = input<number, number | string | undefined>(3, {
    transform: numberWithDefault(3),
  });

  /** CSS `resize` override. Forced to `none` when `kjAutoresize === 'auto'`. */
  readonly kjResize = input<KjTextareaResize>('vertical');

  /** Auto-resize mode. `'auto'` measures `scrollHeight` on each input. */
  readonly kjAutoresize = input<KjTextareaAutoresize>('off');

  /** Minimum rows when auto-resize is on. */
  readonly kjMinRows = input<number, number | string | undefined>(0, {
    transform: numberWithDefault(0),
  });

  /** Maximum rows when auto-resize is on. */
  readonly kjMaxRows = input<number, number | string | undefined>(Number.POSITIVE_INFINITY, {
    transform: numberWithDefault(Number.POSITIVE_INFINITY),
  });

  /** Native `maxlength`. Required to enable the visible counter. */
  readonly kjMaxLength = input<number, number | string | undefined>(Number.POSITIVE_INFINITY, {
    transform: numberWithDefault(Number.POSITIVE_INFINITY),
  });

  /** Renders a visible `{ length } / { kjMaxLength }` counter. Requires `kjMaxLength`. */
  readonly kjShowCounter = input(false, { transform: booleanAttribute });

  /** Whether the textarea is invalid. Combined with `touched` for ARIA. */
  readonly kjInvalid = input(false, { transform: booleanAttribute });

  /** Disables the textarea. Reflects `aria-disabled` and native `disabled`. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Theme variant. Configurable via `provideKjTextarea(...)`. */
  readonly kjVariant = input('outlined');

  /** Theme size. Configurable via `provideKjTextarea(...)`. */
  readonly kjSize = input('md');

  /** @internal stable id for the counter / aria-describedby wiring. */
  protected readonly counterId = `kj-textarea-counter-${++nextId}`;

  // ── CVA plumbing ───────────────────────────────────────────────────────
  // The wrapper itself acts as the form-control bound to `<kj-textarea>` so
  // consumers can write `[(ngModel)]="bio"` / `[formControl]="bio"` on the
  // wrapper element. The inner `[kjTextarea]` directive's own KjFormControl is
  // a local signal channel that powers value reflection + the counter; both
  // are kept in sync via the (input) handler.
  private readonly cvaValue = signal<string>('');
  protected readonly cvaDisabled = signal<boolean>(false);

  /** @internal Effective textarea value: CVA-bound value with kjValue fallback. */
  protected readonly currentValue = computed(() => {
    const v = this.cvaValue();
    return v !== '' && v != null ? v : this.kjValue();
  });

  private _onChange?: (value: string) => void;
  private _onTouched?: () => void;

  /** @internal Whether the visible counter element should render. */
  protected readonly showCounter = computed(
    () => this.kjShowCounter() && Number.isFinite(this.kjMaxLength()),
  );

  /** @internal — value length, prioritised from the CVA-bound signal so the
   * counter updates the same tick the form control writes. */
  protected readonly valueLength = computed(() => {
    const cva = this.cvaValue();
    if (cva) return cva.length;
    return (this.kjValue() ?? '').length;
  });

  /** @internal — counter state for theming (`ok` / `warn` / `limit`). */
  protected readonly counterState = computed(() => {
    const max = this.kjMaxLength();
    if (!Number.isFinite(max)) return 'ok';
    const remaining = max - this.valueLength();
    if (remaining <= 0) return 'limit';
    if (remaining <= 20) return 'warn';
    return 'ok';
  });

  /** @internal — composed aria-describedby (counter id when visible). */
  protected readonly ariaDescribedBy = computed(() =>
    this.showCounter() ? this.counterId : null,
  );

  /** @internal — threshold-based announcement string (mirrors the directive's
   * own logic so the wrapper doesn't need a viewChild handle to read it). */
  protected readonly liveMessage = computed<string>(() => {
    const max = this.kjMaxLength();
    if (!Number.isFinite(max)) return '';
    const r = max - this.valueLength();
    if (r === 0) return 'Character limit reached';
    if (r === 10) return '10 characters remaining';
    if (r === 20) return '20 characters remaining';
    return '';
  });

  constructor() {
    // Dev-mode guidance: counter requested without max length is a no-op.
    effect(() => {
      if (this.kjShowCounter() && !Number.isFinite(this.kjMaxLength()) && typeof console !== 'undefined') {
        console.warn(
          '[kj-textarea] kjShowCounter is set without kjMaxLength — counter will not render.',
        );
      }
    });
  }

  /** @internal — host (input) wired into the wrapper's CVA. */
  onInnerInput(value: string): void {
    this.cvaValue.set(value);
    this._onChange?.(value);
  }

  /** @internal — host (blur) marks CVA touched. */
  onInnerBlur(): void {
    this._onTouched?.();
  }

  // ── ControlValueAccessor implementation ────────────────────────────────
  writeValue(val: unknown): void {
    const next = val == null ? '' : String(val);
    this.cvaValue.set(next);
  }

  registerOnChange(fn: (value: string) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }
}
