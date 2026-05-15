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
 *   A login form with email + password — anchors the default chrome and the
 *   submit-on-valid plumbing.
 *   @doc-file form.example.ts
 * @doc-example Usage
 *   Common form shapes — validation summary, reactive form, and an actions
 *   row — assembled as a copy-paste starting point.
 *   @doc-file form.usage.example.ts
 * @doc-example Validation with summary
 *   `<kj-form-summary />` lists invalid controls after a failed submit and
 *   focuses on populate.
 *   @doc-file form.validation.example.ts
 * @doc-example Async submit
 *   `[kjAsyncSubmit]` toggles `[kjSubmitting]` while a promise resolves —
 *   wire to a button's `[kjLoading]`.
 *   @doc-file form.async-submit.example.ts
 * @doc-example Compound (multiple groups)
 *   Multiple `<kj-field>` groups coordinated under a single
 *   `<form kj-form>` parent.
 *   @doc-file form.compound.example.ts
 *
 * @doc-keyboard
 *   Enter — Submits the form when focus is inside any non-multiline control
 *   Tab   — Moves focus across fields in DOM order
 *
 * @doc-aria
 *   role="form"      — Native on the underlying <form>
 *   aria-live        — kj-form-summary uses [kjPoliteness] (default polite) to announce errors
 *   aria-busy        — Reflected on the form when [kjSubmitting] is true
 *   data-submitting  — Mirrors [kjSubmitting] for theme CSS
 *   data-invalid     — Mirrors the form's invalid state for theme CSS
 *
 * @doc-touch
 *   The form itself is layout-only; touch-target compliance lives on each
 *   projected control (`kj-input`, `kj-button`, etc.).
 *
 * @doc-a11y
 *   `KjForm` intercepts submit so the form only fires `(kjSubmit)` when valid,
 *   marks all controls as touched, focuses the first invalid control, and
 *   optionally scrolls it into view. `<kj-form-summary>` reads the invalid
 *   controls live and focuses on populate when configured.
 *
 * @doc-related field,input,button
 *
 * @doc-css-var
 *   --kj-form-gap             — Vertical gap between projected form rows.
 *   --kj-form-actions-gap     — Gap between buttons inside the actions row.
 *   --kj-form-summary-bg      — Background fill for the error summary alert.
 *   --kj-form-summary-fg      — Foreground text color of the error summary body.
 *   --kj-form-summary-accent  — Accent color for the summary title and left bar.
 *   --kj-form-summary-radius  — Corner radius of the error summary block.
 *
 * @doc-category Library/Data input
 * @doc
 * @doc-name form
 * @doc-description Themed form host with submit interception, focus-on-first-error, async state, and an optional error summary.
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
 * @doc-category Library/Data input
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
 * @doc-category Library/Data input
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
