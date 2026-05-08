import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
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
 *   @doc-file field.example.ts
 * @doc-example With error
 *   @doc-file field.with-error.example.ts
 * @doc-example Required
 *   @doc-file field.required.example.ts
 * @doc-example Disabled
 *   @doc-file field.disabled.example.ts
 * @doc-example Prefix and suffix
 *   @doc-file field.with-prefix-suffix.example.ts
 * @category Library/Data input
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
 * @category Library/Data input
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
 * @category Library/Data input
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
 * @category Library/Data input
 * @doc
 * @doc-name field
 */
@Component({
  selector: 'kj-field-error',
  standalone: true,
  imports: [KjFieldError],
  template: `<span kjFieldError class="kj-field-error"><ng-content /></span>`,
  styleUrl: './field.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    style: 'display: contents;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFieldErrorComponent {}

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
 * @category Library/Data input
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
