import {
  Directive,
  ElementRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { KjLiveRegion, KjLivePoliteness } from '../a11y/index';
import { KjForm } from './form';

let nextId = 0;

/**
 * Optional companion to `KjForm` that renders a polite/assertive live-region
 * summary of the invalid controls after a failed submit. Composes
 * `KjLiveRegion` via `hostDirectives`. The presence of a registered summary
 * causes the parent `KjForm` to wire `aria-describedby` to its id.
 *
 * @example
 * ```html
 * <form kjForm [formGroup]="form" (kjSubmit)="onSubmit($event)">
 *   <div kjFormErrorSummary></div>
 *   …
 * </form>
 * ```
 * @doc-category Core/Inputs
 * @doc
 * @doc-name form
 */
@Directive({
  selector: '[kjFormErrorSummary]',
  standalone: true,
  exportAs: 'kjFormErrorSummary',
  hostDirectives: [{ directive: KjLiveRegion, inputs: ['kjPoliteness: kjPoliteness'] }],
  host: {
    '[id]': 'id()',
    '[attr.role]': '"status"',
    '[attr.data-visible]': 'visible() ? "" : null',
  },
})
export class KjFormErrorSummary {
  // Inject the concrete class so we can call internal methods like
  // `setErrorSummaryId` that are not part of the public KjFormContext.
  private readonly form = inject(KjForm, { optional: true });
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Politeness for the underlying live region. Default `'assertive'` — users are awaiting a response. */
  readonly kjPoliteness = input<KjLivePoliteness>('assertive');
  /** When `true`, focuses the summary host after population. Default `false`. */
  readonly kjFocusOnPopulate = input(false, { transform: booleanAttribute });

  /** Generated id, advertised to the parent KjForm so it can set `aria-describedby`. */
  readonly id = input<string>(`kj-form-error-summary-${++nextId}`);

  /** Visible whenever there is at least one invalid control to summarise. */
  readonly visible = computed(() => (this.form?.invalidControls().length ?? 0) > 0);

  /** Invalid leaves snapshot (re-exposed for templates rendering the list). */
  readonly invalidControls = computed(() => this.form?.invalidControls() ?? []);

  constructor() {
    if (this.form) {
      // Advertise our id to the parent form so it can wire aria-describedby.
      effect((onCleanup) => {
        const id = this.id();
        this.form!.setErrorSummaryId(id);
        onCleanup(() => this.form!.setErrorSummaryId(null));
      });
    }

    // Optional focus-on-populate side-effect.
    effect(() => {
      if (this.kjFocusOnPopulate() && this.visible()) {
        const host = this.el.nativeElement;
        host.tabIndex = host.tabIndex === -1 || host.tabIndex >= 0 ? host.tabIndex : -1;
        if (host.tabIndex === undefined || host.tabIndex < 0) host.tabIndex = -1;
        try {
          host.focus({ preventScroll: false });
        } catch {
          host.focus?.();
        }
      }
    });
  }
}
