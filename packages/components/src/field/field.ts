import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';
import {
  KjField,
  KjFieldError,
  KjFieldGroup,
  KjFieldHelp,
  KjFieldLabel,
} from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjField` directive family.
 *
 * Renders a vertical stack of label, control slot, and helper / error
 * messages. The inner control should be projected as a child element with
 * the `kjField`-aware id binding (the wrapper exposes `controlId` via the
 * `KjField` host directive) — `kj-field-label` resolves `for=`
 * automatically and the wrapper composes `aria-describedby` from any
 * `kj-field-help` and `kj-field-error` siblings.
 *
 * @doc-example Default
 *   Label + input + help text — anchors the default chrome with auto-wired
 *   id and `aria-describedby` plumbing.
 *   @doc-file field.example.ts
 * @doc-example Usage
 *   Common field shapes — required, with help, with error, and a prefix/suffix
 *   group — assembled into one screen as a copy-paste starting point.
 *   @doc-file field.usage.example.ts
 * @doc-example With error
 *   `[kjInvalid]="true"` flips the label tone and links the `kj-field-error`
 *   id into the input's `aria-describedby`.
 *   @doc-file field.with-error.example.ts
 * @doc-example Required
 *   `[kjRequired]="true"` paints the asterisk and sets `aria-required` on the
 *   underlying input.
 *   @doc-file field.required.example.ts
 * @doc-example Disabled
 *   `[kjDisabled]="true"` dims the row and propagates `disabled` to the
 *   projected control.
 *   @doc-file field.disabled.example.ts
 * @doc-example Prefix and suffix
 *   Wraps the input in `<kj-field-group>` with `[prefix]` / `[suffix]` slots
 *   for currency symbols, units, or inline actions.
 *   @doc-file field.with-prefix-suffix.example.ts
 *
 * @doc-keyboard
 *   Tab — Moves focus to the projected control inside the field
 *
 * @doc-aria
 *   aria-describedby — Auto-composed from any kj-field-help / kj-field-error siblings via controlId / describedByIds
 *   aria-invalid     — Reflected on the projected control when [kjInvalid] is true
 *   aria-required    — Reflected on the projected control when [kjRequired] is true
 *   data-disabled    — Mirrors [kjDisabled] for theme CSS
 *   data-invalid     — Mirrors [kjInvalid] for theme CSS
 *
 * @doc-touch
 *   The field itself is not a touch target — the projected control sets the
 *   hit area. Pair with `kj-input` / `kj-input-otp` / etc. sized for ≥ 44×44 px.
 *
 * @doc-a11y
 *   `KjField` owns the id wiring: `controlId()` provides a stable id for the
 *   projected control, and `describedByIds()` aggregates the ids of any
 *   `kj-field-help` and `kj-field-error` siblings so consumers can pipe them
 *   straight into `aria-describedby`. Label association is automatic when
 *   the projected control consumes `controlId()`.
 *
 * @doc-related input,form,input-group
 *
 * @doc-css-var
 *   --kj-field-gap                — Vertical gap between label, control, and help/error rows.
 *   --kj-field-label-fg           — Label color. Flips to the error tone when the field is invalid.
 *   --kj-field-label-font         — Label font family. Inherits --kj-font-sans.
 *   --kj-field-label-font-size    — Label font size. Defaults to --kj-text-sm.
 *   --kj-field-label-weight       — Label font weight. Default 500.
 *   --kj-field-help-fg            — Help / description text color. Muted by default.
 *   --kj-field-help-font-size     — Help / description text size. Defaults to --kj-text-xs.
 *   --kj-field-error-fg           — Error text color and invalid-label color.
 *   --kj-field-error-font-size    — Error text size. Defaults to --kj-text-xs.
 *   --kj-field-required-fg       — Color of the required asterisk.
 *   --kj-field-disabled-opacity   — Opacity applied when the field is disabled.
 *   --kj-field-group-bg           — Background fill for the inline group (input + prefix/suffix).
 *   --kj-field-group-fg           — Foreground color inside the group.
 *   --kj-field-group-border-color — Border color of the group; focus/invalid retarget this.
 *   --kj-field-group-radius       — Corner radius of the group. Inherits --kj-radius-field.
 *   --kj-field-group-addon-fg     — Foreground color of prefix/suffix addons.
 *   --kj-field-group-addon-bg     — Background fill of prefix/suffix addons.
 *   --kj-field-group-padding-x    — Horizontal padding inside addons.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name field
 * @doc-description Themed form field wrapper that auto-wires label, help, error, and required/invalid/disabled state.
 * @doc-is-main
 */
@Component({
  selector: 'kj-field',
  standalone: true,
  hostDirectives: [
    {
      directive: KjField,
      inputs: [
        'kjFieldOrientation',
        'kjRequired',
        'kjDisabled',
        'kjInvalid',
        'kjFieldId',
        'kjFieldLabelId',
      ],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './field.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-field',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFieldComponent {}

/**
 * Styled wrapper around `KjFieldLabel`.
 * @doc-category Library/Data input
 * @doc
 * @doc-name field
 */
@Component({
  selector: 'kj-field-label',
  standalone: true,
  imports: [KjFieldLabel],
  template: `
    <!-- The label is associated via [attr.for] set on it by KjFieldLabel from
         the field's controlId signal — the static analyzer can't see that. -->
    <!-- eslint-disable-next-line @angular-eslint/template/label-has-associated-control -->
    <label kjFieldLabel class="kj-field-label"><ng-content /></label>
  `,
  styleUrl: './field.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFieldLabelComponent {}

/**
 * Styled wrapper around `KjFieldHelp`.
 * @doc-category Library/Data input
 * @doc
 * @doc-name field
 */
@Component({
  selector: 'kj-field-help',
  standalone: true,
  imports: [KjFieldHelp],
  template: `<span kjFieldHelp class="kj-field-help"><ng-content /></span>`,
  styleUrl: './field.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFieldHelpComponent {}

/**
 * Styled wrapper around `KjFieldError`.
 *
 * With `kjReserve`, the error line keeps its box while the field is valid
 * (invisible, one text line tall) so errors appearing / disappearing never
 * shift the form layout.
 *
 * @example
 * ```html
 * <kj-field-error kjReserve>Please enter a valid email.</kj-field-error>
 * ```
 * @doc-category Library/Data input
 * @doc
 * @doc-name field
 */
@Component({
  selector: 'kj-field-error',
  standalone: true,
  imports: [KjFieldError],
  template: `<span kjFieldError [kjFieldErrorReserve]="kjReserve()" class="kj-field-error"><ng-content /></span>`,
  styleUrl: './field.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFieldErrorComponent {
  /** Keep the error line's box while valid, so showing it never moves the layout. */
  readonly kjReserve = input(false, { transform: booleanAttribute });
}

/**
 * Styled wrapper around `KjFieldGroup`. Lays out an input with optional
 * leading / trailing addons (icons, units, action buttons) as a single
 * visual control.
 *
 * Project addons via the `prefix` and `suffix` content slots:
 *
 * @example
 * ```html
 * <kj-field-group>
 *   <span prefix>$</span>
 *   <input kjInput type="number" />
 *   <span suffix>USD</span>
 * </kj-field-group>
 * ```
 * @doc-category Library/Data input
 * @doc
 * @doc-name field
 */
@Component({
  selector: 'kj-field-group',
  standalone: true,
  imports: [KjFieldGroup],
  template: `
    <div kjFieldGroup class="kj-field-group">
      <span class="kj-field-group__prefix" [attr.data-empty]="null">
        <ng-content select="[prefix]" />
      </span>
      <span class="kj-field-group__control">
        <ng-content />
      </span>
      <span class="kj-field-group__suffix">
        <ng-content select="[suffix]" />
      </span>
    </div>
  `,
  styleUrl: './field.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFieldGroupComponent {}
