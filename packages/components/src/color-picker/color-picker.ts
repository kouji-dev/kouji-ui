import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  ViewEncapsulation,
  booleanAttribute,
  input,
  output,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import {
  KjColorPicker,
  KjColorPickerAlphaSlider,
  KjColorPickerArea,
  KjColorPickerHueSlider,
  KjColorPickerInput,
  KjColorPickerPanel,
  KjColorPickerTrigger,
  type KjColorFormat,
  type KjColorPreset,
  type KjColorValue,
} from '@kouji-ui/core';

/**
 * Styled color-picker. Wraps the headless `KjColorPicker` family with a
 * popover panel containing the saturation/value area, hue slider,
 * optional alpha slider, hex input, and preset palette.
 *
 * Two-way bind through Angular forms:
 *
 * ```html
 * <kj-color-picker [(ngModel)]="brand" kjFormat="hex" kjShowAlpha />
 * ```
 *
 * @doc-example Default
 *   Hex output, no alpha, no presets — the simplest two-way binding.
 *   @doc-file color-picker.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common color-picker usages — hex output, an
 *   alpha channel, brand presets, and Angular forms.
 *   @doc-file color-picker.usage.example.ts
 * @doc-example With presets
 *   A brand palette projected via `[kjPresets]` for one-click selection.
 *   @doc-file color-picker.with-presets.example.ts
 * @doc-example With alpha
 *   `kjShowAlpha` mounts the alpha slider and switches to 8-char hex output.
 *   @doc-file color-picker.alpha.example.ts
 * @doc-example Hex input
 *   The free-form hex text input inside the panel, validated on Enter / blur.
 *   @doc-file color-picker.hex-input.example.ts
 * @doc-example In a form
 *   Bound via `[formControl]` inside a reactive form alongside other fields.
 *   @doc-file color-picker.in-form.example.ts
 *
 * @doc-keyboard
 *   Enter|Space — Opens the panel from the swatch trigger
 *   ArrowLeft|ArrowRight — Steps the hue or alpha slider when focused
 *   ArrowUp|ArrowDown    — Steps the saturation/value crosshair when the area is focused
 *   Tab                  — Moves focus into and through the panel; cycles back to the trigger
 *   Escape               — Closes the panel and restores focus to the trigger
 *
 * @doc-aria
 *   aria-label    — Provided on the trigger; override with `[kjAriaLabel]`
 *   aria-haspopup — "dialog" on the trigger button
 *   aria-expanded — Reflects open / closed state on the trigger
 *   aria-invalid  — Reflected on the panel hex input when the typed value fails to parse
 *   role          — "listbox" on the preset row; "option" + `aria-selected` per swatch
 *
 * @doc-css-var
 *   --kj-color-picker-current — Hex of the currently-selected color (no alpha). Used to paint the trigger swatch and the alpha-slider gradient.
 *
 * @doc-touch
 *   The trigger swatch is 44×44px — meets WCAG 2.5.5 out of the box. Preset
 *   chips are 24×24px and rely on the inline-control exception inside the
 *   panel.
 *
 * @doc-a11y
 *   The picker is a real combobox + popover — the trigger button has
 *   `aria-haspopup="dialog"` and `aria-expanded`, the panel is mounted on the
 *   body to escape clipping, and focus returns to the trigger on close.
 *   `ControlValueAccessor` is wired so `[(ngModel)]` and `[formControl]` work
 *   directly on `<kj-color-picker>` — the inner directive owns the canonical
 *   accessor and we delegate.
 *
 * @doc-related input,form,field
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name color-picker
 * @doc-description Themed color picker with saturation canvas, hue and alpha sliders, hex input, and preset swatches.
 * @doc-is-main
 */
@Component({
  selector: 'kj-color-picker',
  standalone: true,
  imports: [
    KjColorPicker,
    KjColorPickerTrigger,
    KjColorPickerPanel,
    KjColorPickerArea,
    KjColorPickerHueSlider,
    KjColorPickerAlphaSlider,
    KjColorPickerInput,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: KjColorPickerComponent,
      multi: true,
    },
  ],
  template: `
    <div
      kjColorPicker
      #root="kjColorPicker"
      [kjFormat]="kjFormat()"
      [kjShowAlpha]="kjShowAlpha()"
      [kjAlwaysEmitAlpha]="kjAlwaysEmitAlpha()"
      [kjPresets]="kjPresets()"
      [kjInvalid]="kjInvalid()"
      [kjAriaLabel]="kjAriaLabel()"
      [kjDisabled]="kjDisabled()"
      (kjOpenChange)="kjOpenChange.emit($event)"
      (kjCommit)="kjCommit.emit($event)"
    >
      <button
        type="button"
        kjColorPickerTrigger
        class="kj-color-picker-trigger"
        aria-label="Open color picker"
      ></button>
      <div kjColorPickerPanel class="kj-color-picker-panel">
        <div kjColorPickerArea class="kj-color-picker-area"></div>
        <input kjColorPickerHueSlider class="kj-color-picker-hue-slider" />
        @if (kjShowAlpha()) {
          <input
            kjColorPickerAlphaSlider
            class="kj-color-picker-alpha-slider"
            [style.--kj-color-picker-current]="opaqueCurrent(root)"
          />
        }
        @if (kjShowHexInput()) {
          <input kjColorPickerInput class="kj-color-picker-input" />
        }
        @if (kjPresets().length > 0) {
          <div role="listbox" aria-label="Preset colors" class="kj-color-picker-presets">
            @for (preset of kjPresets(); track preset.value) {
              <button
                type="button"
                role="option"
                class="kj-color-picker-preset"
                [attr.aria-label]="preset.label ?? preset.value"
                [attr.aria-selected]="preset.value.toLowerCase() === root.hex().toLowerCase() ? 'true' : 'false'"
                [style.background]="preset.value"
                (click)="selectPreset(root, preset)"
              ></button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './color-picker.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-color-picker',
    style: 'display: inline-block;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjColorPickerComponent implements ControlValueAccessor {
  /** Output format. Default `'hex'`. */
  readonly kjFormat = input<KjColorFormat>('hex');
  /** Mount the alpha slider and switch to 8-char hex output when α<1. */
  readonly kjShowAlpha = input(false, { transform: booleanAttribute });
  /** Force 8-char hex output even when α=1. */
  readonly kjAlwaysEmitAlpha = input(false);
  /** Brand-palette preset swatches. Empty array hides the preset row. */
  readonly kjPresets = input<readonly KjColorPreset[]>([]);
  /** Touched-gated invalid posture; mirrors `KjInput`. */
  readonly kjInvalid = input(false);
  /** Override the default "Color picker" name on the trigger. */
  readonly kjAriaLabel = input<string>('');
  /** Mirror the headless `KjDisabled` posture. */
  readonly kjDisabled = input(false);
  /** Show or hide the hex text input within the default panel layout. */
  readonly kjShowHexInput = input<boolean>(true);

  /** Fires when the panel transitions between open and closed. */
  readonly kjOpenChange = output<boolean>();
  /** Fires when the user commits a color (panel close, hex Enter, preset click). */
  readonly kjCommit = output<KjColorValue>();

  @ViewChild(KjColorPicker, { static: true })
  protected innerPicker?: KjColorPicker;

  /**
   * Opaque-only current hex (no alpha digits). Used as the alpha-slider
   * track's gradient end-stop so users see "current → transparent" at full
   * saturation regardless of the active alpha value.
   */
  protected opaqueCurrent(root: KjColorPicker): string {
    const rgb = root.rgb();
    const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n)))
      .toString(16).padStart(2, '0');
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  /** @internal */
  protected selectPreset(root: KjColorPicker, preset: KjColorPreset): void {
    root.setHex(preset.value);
  }

  // ── ControlValueAccessor ──────────────────────────────────────────
  // Re-expose the inner directive's CVA so consumers can bind `[formControl]`
  // / `[(ngModel)]` directly on `<kj-color-picker>`. The inner KjFormControl
  // is the canonical accessor — we just delegate.

  writeValue(val: unknown): void {
    this.innerPicker?.formCtrl.writeValue(val);
  }
  registerOnChange(fn: (value: unknown) => void): void {
    this.innerPicker?.formCtrl.registerOnChange(fn);
  }
  registerOnTouched(fn: () => void): void {
    this.innerPicker?.formCtrl.registerOnTouched(fn);
  }
  setDisabledState(isDisabled: boolean): void {
    this.innerPicker?.formCtrl.setDisabledState(isDisabled);
  }
}

// Re-export types so consumers don't need a second import path.
export type { KjColorFormat, KjColorPreset, KjColorValue };
