import {
  booleanAttribute,
  Directive,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { KjDisabled, KjFocusRing, KjFormControl } from '../primitives';
import {
  KJ_COLOR_PICKER,
  type KjColorFormat,
  type KjColorPickerContext,
  type KjColorPreset,
  type KjColorValue,
} from './color-picker.context';
import {
  kjClamp,
  kjHsvToHsl,
  kjHsvToRgb,
  kjParseHex,
  kjRgbToHex,
  kjRgbToHsv,
  kjRound,
  type KjHsv,
} from './color-picker.utils';

let _kjColorPickerIdCounter = 0;

/**
 * Root color-picker state container.
 *
 * Owns the canonical HSV+alpha state, the open / closed UI flag, and
 * Angular forms integration through composed `KjFormControl`. Provides
 * `KJ_COLOR_PICKER` so every sub-directive (`KjColorPickerTrigger`,
 * `KjColorPickerPanel`, `KjColorPickerArea`, `KjColorPickerHueSlider`,
 * `KjColorPickerAlphaSlider`, `KjColorPickerInput`) reads the same
 * derived signals and writes through the same mutators.
 *
 * ```html
 * <div kjColorPicker [(ngModel)]="brand" kjFormat="hex" kjShowAlpha>
 *   <button kjColorPickerTrigger></button>
 *   <div kjColorPickerPanel>
 *     <div kjColorPickerArea></div>
 *     <input kjColorPickerHueSlider />
 *     <input kjColorPickerAlphaSlider />
 *     <input kjColorPickerInput />
 *   </div>
 * </div>
 * ```
 *
 * @doc
 *  @doc-example Default
 *    @doc-file color-picker.example.ts
 * @category Core/Inputs
 * @doc-name color-picker
 * @doc-description Headless color-picker root for kouji-ui. Apply `[kjColorPicker]` to own canonical HSV+alpha state, open/close toggle, Angular forms integration, and the `KJ_COLOR_PICKER` context shared by the trigger, panel, saturation area, hue slider, alpha slider, and hex input sub-directives — emit in hex, RGB array, or HSL object. Zero styling.
 * @doc-is-main
 */
@Directive({
  selector: '[kjColorPicker]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFormControl,
  ],
  providers: [{ provide: KJ_COLOR_PICKER, useExisting: KjColorPicker }],
  exportAs: 'kjColorPicker',
})
export class KjColorPicker implements KjColorPickerContext {
  /** @internal */
  readonly formCtrl = inject(KjFormControl);
  private readonly disabledPrim = inject(KjDisabled);

  /** Output format. Determines the shape emitted via `ngModelChange` / `kjCommit`. */
  readonly kjFormat = input<KjColorFormat>('hex');

  /** When true, the alpha slider is mounted and hex emit flips to 8 chars when α<1. */
  readonly kjShowAlpha = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** When true and `kjShowAlpha=true`, hex always emits 8 chars (stable shape). */
  readonly kjAlwaysEmitAlpha = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** Preset swatches; an empty array hides the preset row. */
  readonly kjPresets = input<readonly KjColorPreset[]>([]);

  /** Touched-gated invalid posture; mirrors `KjInput`. */
  readonly kjInvalid = input<boolean, unknown>(false, { transform: booleanAttribute });

  /** Override the default "Color picker" name on the trigger. */
  readonly kjAriaLabel = input<string | undefined>(undefined);

  /** Fires whenever the panel transitions between open and closed. */
  readonly kjOpenChange = output<boolean>();

  /** Fires when the user commits a color (panel close, hex enter, preset click). */
  readonly kjCommit = output<KjColorValue>();

  // ── canonical state ────────────────────────────────────────────────
  private readonly _hue = signal(0);
  private readonly _saturation = signal(0);
  private readonly _value = signal(0);
  private readonly _alpha = signal(1);
  private readonly _open = signal(false);

  readonly hue = this._hue.asReadonly();
  readonly saturation = this._saturation.asReadonly();
  readonly value = this._value.asReadonly();
  readonly alpha = this._alpha.asReadonly();
  readonly open = this._open.asReadonly();

  readonly disabled = this.disabledPrim.disabled;
  readonly format = computed(() => this.kjFormat());
  readonly showAlpha = computed(() => this.kjShowAlpha());
  readonly presets = computed(() => this.kjPresets());

  // Stable wiring ids for trigger ↔ panel ↔ ARIA.
  private readonly _id = ++_kjColorPickerIdCounter;
  readonly panelId = signal(`kj-color-picker-panel-${this._id}`).asReadonly();
  readonly triggerId = signal(`kj-color-picker-trigger-${this._id}`).asReadonly();

  // ── derived projections ────────────────────────────────────────────
  readonly rgb = computed(() => kjHsvToRgb({
    h: this._hue(), s: this._saturation(), v: this._value(), a: this._alpha(),
  }));
  readonly hsv = computed<KjHsv>(() => ({
    h: this._hue(), s: this._saturation(), v: this._value(), a: this._alpha(),
  }));
  readonly hsl = computed(() => kjHsvToHsl(this.hsv()));
  readonly hex = computed(() => {
    const includeAlpha = this.kjShowAlpha()
      && (this.kjAlwaysEmitAlpha() || this._alpha() < 1);
    return kjRgbToHex(this.rgb(), includeAlpha);
  });

  /** The current value projected through the active `kjFormat`. */
  readonly currentValue = computed<KjColorValue>(() => projectValue(
    this.kjFormat(),
    this.hex(),
    this.rgb(),
    this.hsl(),
    this.kjShowAlpha(),
  ));

  // ── form integration ───────────────────────────────────────────────
  // Track the last value we *emitted* so writeValue → state → emit doesn't
  // loop. We compare against the currentValue projection.
  private _suppressEmit = false;

  constructor() {
    // External writes (writeValue / setValue) parse into HSV state.
    effect(() => {
      const incoming = this.formCtrl.value();
      if (incoming === undefined || incoming === null || incoming === '') return;
      this._suppressEmit = true;
      try {
        this.applyExternal(incoming);
      } finally {
        this._suppressEmit = false;
      }
    });

    // Internal state changes propagate to the form layer.
    effect(() => {
      const next = this.currentValue();
      if (this._suppressEmit) return;
      const current = this.formCtrl.value();
      // Avoid spamming when the value is structurally unchanged.
      if (sameValue(current, next)) return;
      this.formCtrl.notifyChange(next);
    });
  }

  // ── mutators ───────────────────────────────────────────────────────
  setHue(h: number): void {
    if (this.disabled()) return;
    this._hue.set(((h % 360) + 360) % 360);
  }

  setSaturationValue(s: number, v: number): void {
    if (this.disabled()) return;
    this._saturation.set(kjClamp(s, 0, 1));
    this._value.set(kjClamp(v, 0, 1));
  }

  setAlpha(a: number): void {
    if (this.disabled()) return;
    if (!this.kjShowAlpha()) return;
    this._alpha.set(kjClamp(a, 0, 1));
  }

  setHex(hex: string): boolean {
    if (this.disabled()) return false;
    const rgb = kjParseHex(hex);
    if (!rgb) return false;
    const hsv = kjRgbToHsv(rgb);
    this._hue.set(hsv.h);
    this._saturation.set(hsv.s);
    this._value.set(hsv.v);
    if (this.kjShowAlpha()) this._alpha.set(rgb.a);
    return true;
  }

  setRgb(r: number, g: number, b: number, a?: number): void {
    if (this.disabled()) return;
    const rgb = {
      r: kjClamp(r, 0, 255),
      g: kjClamp(g, 0, 255),
      b: kjClamp(b, 0, 255),
      a: a === undefined ? this._alpha() : kjClamp(a, 0, 1),
    };
    const hsv = kjRgbToHsv(rgb);
    this._hue.set(hsv.h);
    this._saturation.set(hsv.s);
    this._value.set(hsv.v);
    if (this.kjShowAlpha() && a !== undefined) this._alpha.set(rgb.a);
  }

  setOpen(open: boolean): void {
    if (this.disabled() && open) return;
    if (this._open() === open) return;
    this._open.set(open);
    this.kjOpenChange.emit(open);
    if (!open) this.kjCommit.emit(this.currentValue());
  }

  toggle(): void {
    this.setOpen(!this._open());
  }

  /** @internal */
  private applyExternal(v: unknown): void {
    if (typeof v === 'string') {
      this.setHex(v);
      return;
    }
    if (Array.isArray(v) && v.length >= 3) {
      const [r, g, b, a] = v as number[];
      this.setRgb(r, g, b, a);
      return;
    }
    if (v && typeof v === 'object') {
      const o = v as Record<string, number>;
      if ('h' in o && 's' in o && 'l' in o) {
        // Convert HSL → HSV by way of RGB so alpha and round-tripping
        // are consistent with the rest of the pipeline.
        const hslToRgb = hslToRgbValue(o['h'], o['s'], o['l']);
        this.setRgb(hslToRgb.r, hslToRgb.g, hslToRgb.b, 'a' in o ? o['a'] : undefined);
      } else if ('r' in o && 'g' in o && 'b' in o) {
        this.setRgb(o['r'], o['g'], o['b'], 'a' in o ? o['a'] : undefined);
      }
    }
  }
}

function projectValue(
  fmt: KjColorFormat,
  hex: string,
  rgb: { r: number; g: number; b: number; a: number },
  hsl: { h: number; s: number; l: number; a: number },
  showAlpha: boolean,
): KjColorValue {
  if (fmt === 'hex') return hex;
  if (fmt === 'rgb') {
    return showAlpha
      ? [rgb.r, rgb.g, rgb.b, kjRound(rgb.a, 2)] as const
      : [rgb.r, rgb.g, rgb.b] as const;
  }
  return showAlpha
    ? { h: kjRound(hsl.h, 1), s: kjRound(hsl.s, 3), l: kjRound(hsl.l, 3), a: kjRound(hsl.a, 2) }
    : { h: kjRound(hsl.h, 1), s: kjRound(hsl.s, 3), l: kjRound(hsl.l, 3) };
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'string' || typeof b === 'string') return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      if ((a as Record<string, unknown>)[k] !== (b as Record<string, unknown>)[k]) return false;
    }
    return true;
  }
  return false;
}

function hslToRgbValue(h: number, s: number, l: number): { r: number; g: number; b: number } {
  // Standard HSL → RGB; matches CSS Color spec.
  const C = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const X = C * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp < 1)      { r = C; g = X; }
  else if (hp < 2) { r = X; g = C; }
  else if (hp < 3) { g = C; b = X; }
  else if (hp < 4) { g = X; b = C; }
  else if (hp < 5) { r = X; b = C; }
  else             { r = C; b = X; }
  const m = l - C / 2;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// ────────────────────────────────────────────────────────────────────
// Sub-directives
// ────────────────────────────────────────────────────────────────────

/**
 * Trigger button that opens the color-picker panel and renders the
 * current color as its background. Carries `aria-haspopup="dialog"`,
 * `aria-expanded` and `aria-controls` automatically.
 *
 * @category Core/Inputs
 * @doc
 * @doc-name color-picker
 */
@Directive({
  selector: '[kjColorPickerTrigger]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'type': 'button',
    '[id]': 'ctx.triggerId()',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-expanded]': 'ctx.open() ? "true" : "false"',
    '[attr.aria-controls]': 'ctx.panelId()',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[attr.data-disabled]': 'ctx.disabled() ? "" : null',
    '[style.--kj-color-picker-current]': 'ctx.hex()',
    '(click)': 'onClick($event)',
  },
})
export class KjColorPickerTrigger {
  /** @internal */
  readonly ctx = inject(KJ_COLOR_PICKER);
  private readonly root = inject(KjColorPicker);

  /** @internal */
  readonly ariaLabel = computed(() =>
    this.root.kjAriaLabel() || `Color picker, current value ${this.ctx.hex()}`);

  /** @internal */
  onClick(event: Event): void {
    event.stopPropagation();
    if (this.ctx.disabled()) return;
    this.root.toggle();
  }
}

/**
 * Popup panel container. Visible only when `ctx.open()` is true.
 * Marked `role="dialog"` with the trigger's id as `aria-labelledby`.
 *
 * @category Core/Inputs
 * @doc
 * @doc-name color-picker
 */
@Directive({
  selector: '[kjColorPickerPanel]',
  standalone: true,
  host: {
    'role': 'dialog',
    '[id]': 'ctx.panelId()',
    '[attr.aria-modal]': '"false"',
    '[attr.aria-labelledby]': 'ctx.triggerId()',
    '[attr.hidden]': '!ctx.open() ? "" : null',
    '(keydown.escape)': 'onEscape($event)',
  },
})
export class KjColorPickerPanel {
  /** @internal */
  readonly ctx = inject(KJ_COLOR_PICKER);

  /** @internal */
  onEscape(event: Event): void {
    event.stopPropagation();
    this.ctx.setOpen(false);
  }
}

/**
 * Two-axis saturation/value rectangle. Pointer drag updates both axes;
 * arrow keys step ±1% (Shift = ±10%). Single `role="slider"` per the
 * APG color-picker pattern; full state announced via `aria-valuetext`.
 *
 * @category Core/Inputs
 * @doc
 * @doc-name color-picker
 */
@Directive({
  selector: '[kjColorPickerArea]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'role': 'slider',
    'tabindex': '0',
    '[attr.aria-label]': '"Color saturation and value"',
    '[attr.aria-orientation]': '"horizontal"',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuemax]': '100',
    '[attr.aria-valuenow]': 'ariaValueNow()',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[style.--kj-color-picker-hue]': 'ctx.hue()',
    '[style.--kj-color-picker-x]': 'ctx.saturation()',
    '[style.--kj-color-picker-y]': 'ctx.value()',
    '(pointerdown)': 'onPointerDown($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjColorPickerArea {
  /** @internal */
  readonly ctx = inject(KJ_COLOR_PICKER);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** @internal */
  readonly ariaValueNow = computed(() => Math.round(this.ctx.saturation() * 100));
  /** @internal */
  readonly ariaValueText = computed(() => {
    const s = Math.round(this.ctx.saturation() * 100);
    const v = Math.round(this.ctx.value() * 100);
    const h = Math.round(this.ctx.hue());
    return `Saturation ${s} percent, value ${v} percent, hue ${h} degrees`;
  });

  /** @internal */
  onPointerDown(event: PointerEvent): void {
    if (this.ctx.disabled()) return;
    const target = this.el.nativeElement;
    target.setPointerCapture?.(event.pointerId);
    this.update(event);
    const move = (e: PointerEvent) => this.update(e);
    const up = (e: PointerEvent) => {
      target.releasePointerCapture?.(e.pointerId);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  }

  private update(event: PointerEvent): void {
    const rect = this.el.nativeElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = kjClamp((event.clientX - rect.left) / rect.width, 0, 1);
    // Visual y=0 is value=1 (top of rectangle = brightest).
    const y = 1 - kjClamp((event.clientY - rect.top) / rect.height, 0, 1);
    this.ctx.setSaturationValue(x, y);
  }

  /** @internal */
  onKeydown(event: Event): void {
    if (this.ctx.disabled()) return;
    const ke = event as KeyboardEvent;
    const step = ke.shiftKey ? 0.1 : 0.01;
    let s = this.ctx.saturation();
    let v = this.ctx.value();
    let handled = true;
    switch (ke.key) {
      case 'ArrowRight': s = kjClamp(s + step, 0, 1); break;
      case 'ArrowLeft':  s = kjClamp(s - step, 0, 1); break;
      case 'ArrowUp':    v = kjClamp(v + step, 0, 1); break;
      case 'ArrowDown':  v = kjClamp(v - step, 0, 1); break;
      case 'Home':       s = 0; break;
      case 'End':        s = 1; break;
      case 'PageUp':     v = 1; break;
      case 'PageDown':   v = 0; break;
      default: handled = false;
    }
    if (handled) {
      event.preventDefault();
      this.ctx.setSaturationValue(s, v);
    }
  }
}

/**
 * Hue slider. Renders as a native `<input type="range">` so screen
 * readers and keyboard users get the standard `role="slider"` model
 * for free; the visual track gradient is rendered via the wrapper
 * stylesheet.
 *
 * @category Core/Inputs
 * @doc
 * @doc-name color-picker
 */
@Directive({
  selector: 'input[kjColorPickerHueSlider]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'type': 'range',
    'min': '0',
    'max': '360',
    'step': '1',
    '[attr.aria-label]': '"Hue"',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[disabled]': 'ctx.disabled() || null',
    '[value]': 'Math.round(ctx.hue())',
    '(input)': 'onInput($event)',
  },
})
export class KjColorPickerHueSlider {
  /** @internal */
  readonly ctx = inject(KJ_COLOR_PICKER);
  /** @internal */
  protected readonly Math = Math;
  /** @internal */
  readonly ariaValueText = computed(() => `Hue ${Math.round(this.ctx.hue())} degrees`);

  /** @internal */
  onInput(event: Event): void {
    const v = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(v)) this.ctx.setHue(v);
  }
}

/**
 * Optional alpha slider. Mounts only when `KjColorPicker.kjShowAlpha`
 * is true; otherwise the wrapper hides it. Like the hue slider it
 * delegates to a native range input for AT support.
 *
 * @category Core/Inputs
 * @doc
 * @doc-name color-picker
 */
@Directive({
  selector: 'input[kjColorPickerAlphaSlider]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'type': 'range',
    'min': '0',
    'max': '100',
    'step': '1',
    '[attr.aria-label]': '"Opacity"',
    '[attr.aria-valuetext]': 'ariaValueText()',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[disabled]': 'ctx.disabled() || !ctx.showAlpha() || null',
    '[value]': 'Math.round(ctx.alpha() * 100)',
    '(input)': 'onInput($event)',
  },
})
export class KjColorPickerAlphaSlider {
  /** @internal */
  readonly ctx = inject(KJ_COLOR_PICKER);
  /** @internal */
  protected readonly Math = Math;
  /** @internal */
  readonly ariaValueText = computed(() =>
    `Opacity ${Math.round(this.ctx.alpha() * 100)} percent`);

  /** @internal */
  onInput(event: Event): void {
    const pct = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(pct)) this.ctx.setAlpha(pct / 100);
  }
}

/**
 * Hex / CSS-color text input. Commits on blur or Enter; reverts to the
 * canonical value on parse failure. Pattern attribute restricts to
 * 3 / 4 / 6 / 8 hex digits with optional leading hash.
 *
 * @category Core/Inputs
 * @doc
 * @doc-name color-picker
 */
@Directive({
  selector: 'input[kjColorPickerInput]',
  standalone: true,
  hostDirectives: [KjFocusRing],
  host: {
    'type': 'text',
    'autocomplete': 'off',
    'autocapitalize': 'off',
    'spellcheck': 'false',
    'pattern': '^#?[0-9a-fA-F]{3,8}$',
    '[attr.aria-label]': '"Hex color value"',
    '[attr.aria-invalid]': 'invalid() ? "true" : null',
    '[attr.aria-disabled]': 'ctx.disabled() ? "true" : null',
    '[disabled]': 'ctx.disabled() || null',
    '[value]': 'displayValue()',
    '(blur)': 'commit($event)',
    '(keydown.enter)': 'commit($event)',
    '(input)': 'onInput($event)',
  },
})
export class KjColorPickerInput {
  /** @internal */
  readonly ctx = inject(KJ_COLOR_PICKER);

  private readonly _draft = signal<string | null>(null);
  private readonly _invalid = signal(false);

  /** @internal */
  readonly invalid = this._invalid.asReadonly();
  /** @internal */
  readonly displayValue = computed(() => this._draft() ?? this.ctx.hex());

  /** @internal */
  onInput(event: Event): void {
    this._draft.set((event.target as HTMLInputElement).value);
  }

  /** @internal */
  commit(event: Event): void {
    const draft = this._draft();
    if (draft == null) return;
    const ok = this.ctx.setHex(draft);
    this._invalid.set(!ok);
    if (ok) {
      this._draft.set(null);
    } else if (event.type === 'blur') {
      // Revert on blur if invalid.
      this._draft.set(null);
      this._invalid.set(false);
    }
  }
}
