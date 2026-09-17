import {
  booleanAttribute,
  Directive,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { KjDisabled, KjFormControl } from '../primitives';
import { KjOverlayController } from '../primitives/overlay/controller';
import {
  KJ_OVERLAY_TRIGGER_EVENT_STRATEGY,
  KJ_OVERLAY_PANEL_ROLE,
  KJ_OVERLAY_MOUNT_STRATEGY,
  KJ_OVERLAY_POSITION_STRATEGY,
} from '../primitives/overlay/tokens';
import type { KjSide, KjAlign } from '../primitives/overlay/types';
import { onClick } from '../primitives/overlay/strategies/trigger-event/on-click';
import { bodyPortal } from '../primitives/overlay/strategies/mount/body-portal';
import { anchoredTo, injectAnchoredPosition } from '../primitives/overlay/strategies/position/anchored-to';
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
import { KjId } from '../primitives/overlay/id';

/**
 * Root color-picker state container.
 *
 * Owns the canonical HSV+alpha state and Angular forms integration through
 * composed `KjFormControl`. Provides `KJ_COLOR_PICKER` so every sub-directive
 * (`KjColorPickerTrigger`, `KjColorPickerPanel`, `KjColorPickerArea`,
 * `KjColorPickerHueSlider`, `KjColorPickerAlphaSlider`,
 * `KjColorPickerInput`) reads the same derived signals and writes through
 * the same mutators. The open / closed UI flag and panel positioning are
 * delegated to the overlay primitives — the controller, the click trigger
 * strategy, the body-portal mount, and the anchored-to position strategy
 * are all provided here so the trigger and panel sub-directives share the
 * same overlay scope.
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
 * @doc-category Core/Inputs
 * @doc-name color-picker
 * @doc-description Unstyled color-picker root that owns HSV+alpha state and emits hex, RGB, or HSL values.
 * @doc-is-main
 */
@Directive({
  selector: '[kjColorPicker]',
  standalone: true,
  hostDirectives: [
    { directive: KjDisabled, inputs: ['kjDisabled'] },
    KjFormControl,
  ],
  providers: [
    { provide: KJ_COLOR_PICKER, useExisting: KjColorPicker },
    KjOverlayController,
    { provide: KJ_OVERLAY_TRIGGER_EVENT_STRATEGY, useFactory: () => onClick() },
    { provide: KJ_OVERLAY_PANEL_ROLE, useValue: 'dialog' as const },
    { provide: KJ_OVERLAY_MOUNT_STRATEGY, useFactory: () => bodyPortal() },
    { provide: KJ_OVERLAY_POSITION_STRATEGY, useFactory: () => anchoredTo() },
  ],
  exportAs: 'kjColorPicker',
})
export class KjColorPicker implements KjColorPickerContext {
  /** @internal */
  readonly formCtrl = inject(KjFormControl);
  private readonly disabledPrim = inject(KjDisabled);
  /** @internal */
  readonly overlay = inject(KjOverlayController);

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

  /** Side the popup panel is anchored to relative to its trigger. */
  readonly kjSide = input<KjSide>('bottom');

  /** Alignment of the popup panel along its anchored side. */
  readonly kjAlign = input<KjAlign>('start');

  /** Fires whenever the panel transitions between open and closed. */
  readonly kjOpenChange = output<boolean>();

  /** Fires when the user commits a color (panel close, hex enter, preset click). */
  readonly kjCommit = output<KjColorValue>();

  // ── canonical state ────────────────────────────────────────────────
  private readonly _hue = signal(0);
  private readonly _saturation = signal(0);
  private readonly _value = signal(0);
  private readonly _alpha = signal(1);

  readonly hue = this._hue.asReadonly();
  readonly saturation = this._saturation.asReadonly();
  readonly value = this._value.asReadonly();
  readonly alpha = this._alpha.asReadonly();
  /** Bridged to the overlay controller's open state. */
  readonly open = this.overlay.isOpen;

  readonly disabled = this.disabledPrim.disabled;
  readonly format = computed(() => this.kjFormat());
  readonly showAlpha = computed(() => this.kjShowAlpha());
  readonly presets = computed(() => this.kjPresets());

  // Stable wiring ids used by the input / area / labels — the overlay
  // primitives mint their own ids on the trigger and panel hosts.
  private readonly ids = inject(KjId);
  readonly panelId = signal(this.ids.mint('color-picker-panel')).asReadonly();
  readonly triggerId = signal(this.ids.mint('color-picker-trigger')).asReadonly();

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
  // The state-projection effect runs once on subscription with the picker's
  // DEFAULT HSV state (which projects to `#000000`). That used to fire
  // `notifyChange` BEFORE the form's initial `writeValue(...)` reached us,
  // so a `[ngModel]`-bound consumer received `#000000` ahead of its real
  // value — corrupting the bound state. Swallow the bootstrap pass so
  // emissions only flow after either an external write or a real user
  // interaction.
  private _initialEmitConsumed = false;

  constructor() {
    injectAnchoredPosition({ side: this.kjSide, align: this.kjAlign });
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
      if (!this._initialEmitConsumed) {
        this._initialEmitConsumed = true;
        return;
      }
      const current = this.formCtrl.value();
      // Avoid spamming when the value is structurally unchanged.
      if (sameValue(current, next)) return;
      this.formCtrl.notifyChange(next);
    });

    // Bridge overlay open/close transitions to the consumer-facing
    // outputs. Only emit when the state genuinely flips (the controller
    // exposes both open/opening and closed/closing — collapse to a
    // boolean and dedupe).
    let lastOpen = this.overlay.isOpen();
    effect(() => {
      const isOpen = this.overlay.isOpen();
      if (isOpen === lastOpen) return;
      lastOpen = isOpen;
      this.kjOpenChange.emit(isOpen);
      if (!isOpen) this.kjCommit.emit(this.currentValue());
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
    if (this.overlay.isOpen() === open) return;
    if (open) this.overlay.open();
    else this.overlay.close('programmatic');
  }

  toggle(): void {
    this.setOpen(!this.overlay.isOpen());
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
