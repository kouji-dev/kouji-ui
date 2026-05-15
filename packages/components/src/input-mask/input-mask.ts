import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KjInputMask } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjInputMask` directive. Owns the visual
 * shape of a masked text input. The inner `<input>` carries native input
 * semantics (focus, form integration, validation).
 *
 * The component proxies all `KjInputMask` inputs and the `kjComplete` output.
 * Use `[(ngModel)]` or `[formControl]` on the inner `<input>` for form wiring.
 *
 * @example
 * ```html
 * <kj-input-mask kjMask="(999) 999-9999" [(ngModel)]="phone" />
 * ```
 *
 * @doc-example Default
 *   Phone number mask — anchors the chrome and the `kjMaskMode="unmasked"` default.
 *   @doc-file input-mask.example.ts
 * @doc-example Usage
 *   Common mask patterns assembled into one screen — phone, date, and credit card.
 *   @doc-file input-mask.usage.example.ts
 * @doc-example Credit card
 *   16-digit mask with grouped quads.
 *   @doc-file input-mask.credit-card.example.ts
 * @doc-example Date
 *   ISO `YYYY-MM-DD` mask with format-hint announcement for AT.
 *   @doc-file input-mask.date.example.ts
 * @doc-example Validation
 *   Pairs `kjComplete` with reactive form validators to flag incomplete masks.
 *   @doc-file input-mask.validation.example.ts
 * @doc-example Custom tokens
 *   Per-instance token map for masks beyond `9` / `A` / `*`.
 *   @doc-file input-mask.custom-tokens.example.ts
 *
 * @doc-keyboard
 *   Tab        — Moves focus into and out of the masked input (native semantics)
 *   Backspace  — Removes the previous variable slot; static separators are skipped
 *   Arrow keys — Move the caret across slots; the directive snaps over static chars
 *
 * @doc-aria
 *   aria-invalid    — Reflected when [kjInvalid] is true (via the composed KjInput plumbing)
 *   aria-describedby— Auto-augmented with the auto-generated format hint unless [kjFormatHint] is empty
 *   data-mask-mode  — Mirrors [kjMaskMode] ("unmasked" | "masked") for CSS hooks
 *
 * @doc-touch
 *   Height inherits the `kj-input` defaults — `md` is 36 px; use `data-size="lg"`
 *   for primary touch fields so the slot-tap surface meets WCAG 2.5.5.
 *
 * @doc-a11y
 *   `KjInputMask` auto-generates a screen-reader format hint from the mask
 *   template (e.g. `'(999) 999-9999'` → "Format: (___) ___-____") and wires
 *   it through `aria-describedby`. Override or suppress with `[kjFormatHint]`.
 *   The native `<input>` underneath keeps full focus + caret semantics.
 *
 * @doc-related input,field,form,number-input
 *
 * @doc-css-var
 *   --kj-input-mask-height — Explicit height of the masked input. Sizes (sm/lg via data-size) override.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name input-mask
 * @doc-description Themed masked text input for phone numbers, dates, credit cards, and custom formats.
 * @doc-is-main
 */
@Component({
  selector: 'kj-input-mask',
  standalone: true,
  imports: [KjInputMask, FormsModule],
  template: `
    <input
      kjInputMask
      class="kj-input-mask__input"
      [kjMask]="kjMask()"
      [kjMaskTokens]="kjMaskTokens()"
      [kjMaskMode]="kjMaskMode()"
      [kjSlotChar]="kjSlotChar()"
      [kjDisabled]="kjDisabled()"
      [kjInvalid]="kjInvalid()"
      [kjAutoClear]="kjAutoClear()"
      [kjFormatHint]="kjFormatHint()"
      (kjComplete)="kjComplete.emit()"
    />
  `,
  styleUrl: './input-mask.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-input-mask' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjInputMaskComponent {
  /** Mask template. Required. e.g. `'(999) 999-9999'`. */
  readonly kjMask = input.required<string>();

  /** Per-instance token overrides merged with the app-wide defaults. */
  readonly kjMaskTokens = input<Record<string, RegExp>>({});

  /**
   * What value is committed to the FormControl.
   * - `'unmasked'` (default) — raw alphanumerics.
   * - `'masked'` — full display string.
   */
  readonly kjMaskMode = input<'unmasked' | 'masked'>('unmasked');

  /** Placeholder char for empty variable slots. @default '_' */
  readonly kjSlotChar = input<string>('_');

  /** Disabled state. @default false */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Invalid state — wires to `aria-invalid` via the inner `KjInput`. @default false */
  readonly kjInvalid = input(false, { transform: booleanAttribute });

  /** Clear on blur if incomplete. @default false */
  readonly kjAutoClear = input(false, { transform: booleanAttribute });

  /** Override or suppress the auto-generated screen-reader format hint. */
  readonly kjFormatHint = input<string>('');

  /** Emits when every variable slot is filled. */
  readonly kjComplete = output<void>();
}
