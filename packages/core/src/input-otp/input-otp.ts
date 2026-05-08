import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  Signal,
  booleanAttribute,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { KjDisabled } from '../primitives/interaction/disabled';
import { KjFormControl } from '../primitives/forms/form-control';
import { KjLiveRegion } from '../a11y/live-region';
import { KjFocusRing } from '../primitives/interaction/focus-ring';
import { KJ_INPUT_OTP, KjInputOtpContext } from './input-otp.context';

/**
 * Root headless directive for the OTP input widget.
 *
 * Owns the concatenated value, cell count, character-set filtering, paste
 * distribution, auto-advance, completion announcement, and the
 * `KJ_INPUT_OTP` context that every `KjInputOtpCell` reads from.
 *
 * Composes `KjFormControl` via `hostDirectives` so the **whole widget** is a
 * single Angular form control — `[(ngModel)]` and `[formControl]` bind to the
 * concatenated string.
 *
 * @example
 * ```html
 * <div kjInputOtp [kjLength]="6" [(ngModel)]="code">
 *   @for (i of cells; track i) {
 *     <input kjInputOtpCell [kjIndex]="i" />
 *   }
 * </div>
 * ```
 *
 * @category Core/Data input
 */
@Directive({
  selector: '[kjInputOtp]',
  standalone: true,
  exportAs: 'kjInputOtp',
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFormControl,
    KjLiveRegion,
  ],
  providers: [
    { provide: KJ_INPUT_OTP, useExisting: forwardRef(() => KjInputOtp) },
  ],
  host: {
    'role': 'group',
    '[attr.aria-label]': 'kjAriaLabel() ?? null',
    '[attr.aria-invalid]': 'formCtrl.touched() && kjInvalid() ? "true" : null',
    '[attr.data-invalid]': 'formCtrl.touched() && kjInvalid() ? "" : null',
  },
})
export class KjInputOtp implements KjInputOtpContext, OnInit, OnDestroy {
  readonly formCtrl = inject(KjFormControl);
  private readonly disabled$ = inject(KjDisabled);
  private readonly liveRegion = inject(KjLiveRegion);

  // ── Inputs ──────────────────────────────────────────────────────────────────

  /** Number of OTP cells. Common values: 4, 6, 8. */
  readonly kjLength = input<number>(6);

  /** Character-set restriction. Drives `inputmode`, `pattern`, and input/paste filtering. */
  readonly kjCharSet = input<'digits' | 'alphanumeric' | RegExp>('digits');

  /** When `true`, cells render with `type="password"`. */
  readonly kjMask = input(false, { transform: booleanAttribute });

  /** When `true`, emits `kjComplete` once the value reaches `kjLength`. */
  readonly kjAutoSubmit = input(false, { transform: booleanAttribute });

  /** Reflects an invalid state via `aria-invalid` (touched-gated). */
  readonly kjInvalid = input(false, { transform: booleanAttribute });

  /** Sets all cells to `readonly`. */
  readonly kjReadonly = input(false, { transform: booleanAttribute });

  /**
   * Accessible label for the widget when there is no parent `KjFormField`
   * supplying an `aria-labelledby`.
   */
  readonly kjAriaLabel = input<string | undefined>(undefined);

  // ── Outputs ─────────────────────────────────────────────────────────────────

  /** Emitted when the full code is entered (value.length === kjLength). */
  readonly kjComplete = output<string>();

  /** Emitted after a paste distributes characters across cells. */
  readonly kjPasted = output<string>();

  // ── Internal state ───────────────────────────────────────────────────────────

  /** Per-cell character array; resized lazily by setCellValue. */
  private readonly _chars = signal<string[]>([]);

  /** Cell element registry for programmatic focus management. */
  readonly _cells = new Map<number, HTMLInputElement>();

  /** Focused cell index, or -1. */
  private readonly _focusedIndex = signal<number>(-1);

  /** Whether the code was already complete on the previous notification cycle. */
  private _wasComplete = false;

  // ── Context signals (KjInputOtpContext) ──────────────────────────────────────

  /** Full concatenated OTP value (public, read-only signal). */
  readonly value: Signal<string> = computed(() =>
    this._chars().slice(0, this.kjLength()).join(''),
  );

  readonly length: Signal<number> = computed(() => this.kjLength());

  readonly disabled: Signal<boolean> = computed(
    () => this.disabled$.disabled() || this.formCtrl.disabled(),
  );

  readonly readonly: Signal<boolean> = computed(() => this.kjReadonly());

  readonly masked: Signal<boolean> = computed(() => this.kjMask());

  readonly charSet: Signal<'digits' | 'alphanumeric' | RegExp> = computed(
    () => this.kjCharSet(),
  );

  readonly focusedIndex: Signal<number> = this._focusedIndex.asReadonly();

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  constructor() {
    // Reflect CVA value writes to internal char array (e.g. programmatic setValue).
    effect(() => {
      const incoming = this.formCtrl.value();
      if (incoming == null) return;
      const str = String(incoming);
      const chars = str.split('').slice(0, this.kjLength());
      this._chars.set(chars);
    });

    // Notify forms layer whenever the value signal changes.
    effect(() => {
      const val = this.value();
      this.formCtrl.notifyChange(val);
      this._checkCompletion(val);
    });
  }

  ngOnInit(): void {
    // Initialise the char array to the correct length on first render.
    if (this._chars().length === 0) {
      this._chars.set(Array(this.kjLength()).fill(''));
    }
  }

  ngOnDestroy(): void {
    this._cells.clear();
  }

  // ── KjInputOtpContext methods ────────────────────────────────────────────────

  /** Update a single cell's character and notify forms. */
  setCellValue(index: number, char: string): void {
    const current = [...this._chars()];
    // Ensure the array is long enough.
    while (current.length <= index) current.push('');
    current[index] = char;
    this._chars.set(current);
  }

  /** Move focus by delta (+1 / -1), clamped to valid range. */
  moveFocus(delta: number): void {
    const current = this._focusedIndex();
    const next = Math.max(0, Math.min(this.kjLength() - 1, current + delta));
    this._cells.get(next)?.focus();
  }

  /** Focus a specific cell index (clamped to valid range). */
  focusIndex(index: number): void {
    const clamped = Math.max(0, Math.min(this.kjLength() - 1, index));
    this._focusedIndex.set(clamped);
    this._cells.get(clamped)?.focus();
  }

  /**
   * Distribute pasted text across cells starting from `fromIndex`.
   * Filters the pasted text through the current charSet before distributing.
   */
  handlePaste(event: ClipboardEvent, fromIndex: number): void {
    event.preventDefault();
    const raw = event.clipboardData?.getData('text') ?? '';
    this.distributeText(raw, fromIndex);
    const filtered = this._filterChars(raw);
    if (filtered) {
      this.kjPasted.emit(filtered);
    }
  }

  /** Intercept copy and write the full OTP value to the clipboard. */
  handleCopy(event: ClipboardEvent): void {
    event.preventDefault();
    event.clipboardData?.setData('text/plain', this.value());
  }

  /** Register a cell's native input element for programmatic focus. */
  registerCell(index: number, el: HTMLInputElement): void {
    this._cells.set(index, el);
  }

  /** Deregister a cell element on destroy. */
  unregisterCell(index: number): void {
    this._cells.delete(index);
  }

  /**
   * Distribute raw text across cells starting from `fromIndex`, filtering
   * through the current charSet.  Called by `KjInputOtpCell` for both
   * iOS-autofill over-length writes and as the internal paste helper.
   * @internal
   */
  distributeText(text: string, fromIndex: number): void {
    const filtered = this._filterChars(text);
    if (!filtered) return;

    const current = [...this._chars()];
    while (current.length < this.kjLength()) current.push('');

    let cellIndex = fromIndex;
    for (const ch of filtered) {
      if (cellIndex >= this.kjLength()) break;
      current[cellIndex] = ch;
      cellIndex++;
    }
    this._chars.set(current);

    // Focus the first empty cell after distribution, or the last cell.
    const firstEmpty = current.findIndex((c, i) => i >= fromIndex && !c);
    const focusTarget = firstEmpty !== -1 ? firstEmpty : this.kjLength() - 1;
    this._cells.get(focusTarget)?.focus();
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private _checkCompletion(val: string): void {
    const complete = val.length >= this.kjLength() && !val.includes('');
    if (complete && !this._wasComplete) {
      this._wasComplete = true;
      this.liveRegion.announce('Code complete');
      // Always emit kjComplete so consumers can react regardless of
      // kjAutoSubmit. kjAutoSubmit is a UX hint for consumers, not a gate.
      this.kjComplete.emit(val);
    } else if (!complete) {
      this._wasComplete = false;
    }
  }

  /** Filter a string to only characters allowed by the current charSet. */
  private _filterChars(input: string): string {
    const cs = this.kjCharSet();
    if (cs === 'digits') return input.replace(/[^0-9]/g, '');
    if (cs === 'alphanumeric') return input.replace(/[^A-Za-z0-9]/g, '');
    // Custom RegExp — apply per character.
    return input.split('').filter(ch => (cs as RegExp).test(ch)).join('');
  }
}

// ────────────────────────────────────────────────────────────────────────────
// KjInputOtpCell
// ────────────────────────────────────────────────────────────────────────────

/**
 * Leaf directive applied to each `<input>` inside a `[kjInputOtp]` group.
 *
 * Reads its character from the parent context signal keyed by `kjIndex`.
 * Owns per-cell keyboard handling (Backspace, ArrowLeft/Right, Home/End)
 * and delegates paste/copy and focus tracking back to the root directive.
 *
 * @example
 * ```html
 * <input kjInputOtpCell [kjIndex]="i" />
 * ```
 *
 * @category Core/Data input
 */
@Directive({
  selector: 'input[kjInputOtpCell]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'type': 'text',
    'maxlength': '1',
    'autocapitalize': 'off',
    'autocorrect': 'off',
    'spellcheck': 'false',
    '[attr.inputmode]': 'inputmode()',
    '[attr.pattern]': 'pattern()',
    '[attr.autocomplete]': 'kjIndex() === 0 ? "one-time-code" : "off"',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.tabindex]': 'isTabStop() ? "0" : "-1"',
    '[attr.disabled]': 'ctx.disabled() ? "" : null',
    '[attr.readonly]': 'ctx.readonly() ? "" : null',
    '[attr.type]': 'ctx.masked() ? "password" : "text"',
    '[value]': 'ctx.value()[kjIndex()] ?? ""',
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeydown($event)',
    '(paste)': 'ctx.handlePaste($event, kjIndex())',
    '(copy)': 'ctx.handleCopy($event)',
    '(focus)': 'ctx.focusIndex(kjIndex())',
    '(blur)': 'onBlur()',
  },
})
export class KjInputOtpCell implements OnInit, OnDestroy {
  /** The context provided by the parent `KjInputOtp`. */
  readonly ctx = inject(KJ_INPUT_OTP);

  /** Zero-based index of this cell within the OTP group. Required. */
  readonly kjIndex = input.required<number>();

  /** Whether this cell is the roving tab stop. */
  protected readonly isTabStop = computed(() => {
    const chars = this.ctx.value();
    const len = this.ctx.length();
    // Tab stop is the first empty cell, or cell 0 when all are filled.
    const firstEmpty = Array.from({ length: len }, (_, i) => chars[i] ?? '').findIndex(c => !c);
    const tabStopIndex = firstEmpty === -1 ? 0 : firstEmpty;
    return this.kjIndex() === tabStopIndex;
  });

  protected readonly inputmode = computed(() =>
    this.ctx.charSet() === 'digits' ? 'numeric' : 'text',
  );

  protected readonly pattern = computed(() =>
    this.ctx.charSet() === 'digits' ? '[0-9]*' : null,
  );

  protected readonly ariaLabel = computed(
    () => `Code digit ${this.kjIndex() + 1} of ${this.ctx.length()}`,
  );

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  private readonly _elRef = inject<ElementRef<HTMLInputElement>>(ElementRef);

  ngOnInit(): void {
    this.ctx.registerCell(this.kjIndex(), this._elRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.ctx.unregisterCell(this.kjIndex());
  }

  // ── Event handlers ───────────────────────────────────────────────────────────

  /** Handle character input from the user (or iOS autofill writing a full code). */
  protected onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const raw = target.value;

    if (raw.length > 1) {
      // iOS autofill or paste-via-input: treat as a paste from this index.
      // We call distributeText directly on the root to avoid constructing
      // ClipboardEvent/DataTransfer which are unavailable in some environments.
      (this.ctx as KjInputOtp).distributeText(raw, this.kjIndex());
      return;
    }

    const cs = this.ctx.charSet();
    const filtered = this._filterChar(raw, cs);

    if (filtered === '' && raw !== '') {
      // Character rejected — restore original value.
      target.value = this.ctx.value()[this.kjIndex()] ?? '';
      return;
    }

    this.ctx.setCellValue(this.kjIndex(), filtered);

    if (filtered !== '') {
      // Advance focus only if a valid character was entered.
      this.ctx.moveFocus(1);
    }
  }

  /** Handle keyboard navigation within the OTP group. */
  protected onKeydown(event: KeyboardEvent): void {
    const { key } = event;

    if (key === 'Backspace') {
      event.preventDefault();
      const currentChar = this.ctx.value()[this.kjIndex()] ?? '';
      if (currentChar !== '') {
        // Filled cell: clear it and move focus back.
        this.ctx.setCellValue(this.kjIndex(), '');
        this.ctx.moveFocus(-1);
      } else {
        // Empty cell: move to previous and clear that cell.
        const prevIndex = this.kjIndex() - 1;
        if (prevIndex >= 0) {
          this.ctx.setCellValue(prevIndex, '');
          this.ctx.moveFocus(-1);
        }
      }
      return;
    }

    if (key === 'Delete') {
      event.preventDefault();
      this.ctx.setCellValue(this.kjIndex(), '');
      return;
    }

    if (key === 'ArrowLeft') {
      event.preventDefault();
      this.ctx.moveFocus(-1);
      return;
    }

    if (key === 'ArrowRight') {
      event.preventDefault();
      this.ctx.moveFocus(1);
      return;
    }

    if (key === 'Home') {
      event.preventDefault();
      this.ctx.focusIndex(0);
      return;
    }

    if (key === 'End') {
      event.preventDefault();
      this.ctx.focusIndex(this.ctx.length() - 1);
      return;
    }
  }

  protected onBlur(): void {
    // Notify the form control as touched when any cell blurs
    // (the form control is on the root, cells delegate).
    // We reach the root's formCtrl through the context cast.
    const root = this.ctx as KjInputOtp;
    root.formCtrl?.notifyTouched?.();
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private _filterChar(ch: string, cs: 'digits' | 'alphanumeric' | RegExp): string {
    if (!ch) return '';
    if (cs === 'digits') return /^[0-9]$/.test(ch) ? ch : '';
    if (cs === 'alphanumeric') return /^[A-Za-z0-9]$/.test(ch) ? ch : '';
    return (cs as RegExp).test(ch) ? ch : '';
  }
}
