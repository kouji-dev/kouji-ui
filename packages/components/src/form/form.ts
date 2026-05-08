import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  KjForm,
  KjFormErrorSummary,
} from '@kouji-ui/core';

/**
 * Styled component-layer wrapper that attaches to a real `<form>` element
 * via the attribute selector `form[kj-form]`. Composes the headless `KjForm`
 * coordinator (submit interception, focus-on-first-error, async submitting,
 * error summary) and applies the `.kj-form` class chrome.
 *
 * Use it as you would any `<form>`: the consumer keeps full control over
 * `[formGroup]` (or `ngForm`) and `formControlName` bindings — they sit in
 * the consumer's template, so projected content works without context
 * gymnastics.
 *
 * Forward-only forwarding: every coordination knob lives on the underlying
 * `KjForm` directive (composed via `hostDirectives`); this wrapper exists
 * solely to stamp the class and own the `<kj-form-summary>` slot.
 *
 * @example
 * ```html
 * <form kj-form [formGroup]="form" (kjSubmit)="onSubmit($event)">
 *   <kj-input formControlName="email" />
 *   <kj-form-actions>
 *     <kj-button kjType="submit">Sign in</kj-button>
 *   </kj-form-actions>
 * </form>
 * ```
 * @doc-example Default
 *   @doc-file form.example.ts
 * @doc-example Validation with summary
 *   @doc-file form.validation.example.ts
 * @doc-example Async submit
 *   @doc-file form.async-submit.example.ts
 * @doc-example Compound (multiple groups)
 *   @doc-file form.compound.example.ts
 * @category Library/Data input
 * @doc
 * @doc-name form
 * @doc-is-main
 */
@Component({
  selector: 'kj-form, form[kj-form]',
  standalone: true,
  hostDirectives: [
    {
      directive: KjForm,
      inputs: [
        'kjFocusOnError',
        'kjScrollOnError',
        'kjScrollBehavior',
        'kjScrollBlock',
        'kjMarkAllAsTouchedOnSubmit',
        'kjResetOnSuccess',
        'kjAsyncSubmit',
        'kjSubmitting',
      ],
      outputs: ['kjSubmit', 'kjInvalidSubmit', 'kjSubmittingChange'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './form.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-form' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFormComponent {}

/**
 * Slot for form action buttons (Submit, Cancel, …). Sets `role="group"` and
 * defaults to right-aligned with a `var(--kj-form-actions-gap)` gap. Override
 * alignment via `kjAlign` (`'start' | 'end' | 'center' | 'between'`).
 *
 * @example
 * ```html
 * <kj-form-actions>
 *   <kj-button kjVariant="ghost" kjType="reset">Cancel</kj-button>
 *   <kj-button kjType="submit">Save</kj-button>
 * </kj-form-actions>
 * ```
 * @category Library/Data input
 * @doc
 * @doc-name form
 */
@Component({
  selector: 'kj-form-actions',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './form.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-form-actions',
    role: 'group',
    '[attr.aria-label]': 'kjLabel()',
    '[attr.data-align]': 'kjAlign()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFormActionsComponent {
  /** Accessible label for the action group. */
  readonly kjLabel = input<string>('Form actions');
  /** Alignment of the action row. Defaults to `'end'`. */
  readonly kjAlign = input<'start' | 'end' | 'center' | 'between'>('end');
}

/**
 * Live-region error summary that lists invalid controls after a failed
 * submit. Reads from the parent `<form kj-form>` (via the injected `KjForm`)
 * and renders an accessible alert-shaped block. Hidden when there are no
 * invalid controls.
 *
 * Renders a `data-visible` attribute when there is at least one invalid
 * control, allowing themes to drive show/hide via CSS without an `@if`.
 *
 * @example
 * ```html
 * <form kj-form [formGroup]="form">
 *   <kj-form-summary />
 *   <kj-input formControlName="email" />
 *   <kj-form-actions><kj-button kjType="submit">Save</kj-button></kj-form-actions>
 * </form>
 * ```
 * @category Library/Data input
 * @doc
 * @doc-name form
 */
@Component({
  selector: 'kj-form-summary',
  standalone: true,
  hostDirectives: [{ directive: KjFormErrorSummary, inputs: ['kjPoliteness', 'kjFocusOnPopulate'] }],
  template: `
    @if (visible()) {
      <p class="kj-form-summary__title">{{ titleFor(invalidControls().length) }}</p>
      <ul class="kj-form-summary__list">
        @for (item of invalidControls(); track item.path) {
          <li>{{ item.label }}</li>
        }
      </ul>
    }
  `,
  styleUrl: './form.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-form-summary',
    '[attr.data-visible]': 'visible() ? "" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjFormSummaryComponent {
  private readonly form = inject(KjForm, { optional: true });
  private readonly fallbackInvalid = signal<readonly { path: string; label: string }[]>([]);

  protected readonly invalidControls = computed(
    () => this.form?.invalidControls() ?? this.fallbackInvalid(),
  );
  protected readonly visible = computed(() => this.invalidControls().length > 0);

  protected titleFor(count: number): string {
    return count === 1 ? '1 error in this form' : `${count} errors in this form`;
  }
}
