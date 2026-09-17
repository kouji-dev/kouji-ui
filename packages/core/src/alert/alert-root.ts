import {
  Directive,
  ElementRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { KjSize, KjVariant, bindPresets } from '../presets';
import { KJ_ALERT, KjAlertContext, KjAlertMode } from './alert.context';
import { KJ_ALERT_CONFIG } from './config';
import { KjId } from '../primitives/overlay/id';
import { kjDevMode, kjDevWarn } from '../primitives/diagnostics/dev-mode';

/**
 * Persistent, in-flow notification (also known as a banner). Owns the
 * `role` / `aria-live` matrix described in `docs/component-analyses/feedback/alert.md`:
 * `kjAlertMode='assertive'` → `role="alert"` + `aria-live="assertive"`;
 * `'polite'` → `role="status"` + `aria-live="polite"`;
 * `'static'` → `role="region"` (no live, requires `aria-label` /
 * `aria-labelledby`); `'off'` → no role, no live region.
 *
 * When `kjAlertMode` is unset, the directive resolves the matrix from
 * `kjAlertStatic` and `kjVariant`:
 *
 * 1. `kjAlertStatic === true` → `'static'`
 * 2. `kjVariant === 'error'` → `'assertive'`
 * 3. otherwise → `'polite'`
 *
 * Visibility is consumer-managed: `KjAlertDismiss` (or programmatic
 * `dismiss()`) fires `kjAlertDismissed` and the parent `*ngIf` / `@if`
 * unmounts. The directive itself is stateless beyond exposing
 * `data-dismissed="true"` for the brief render window before unmount,
 * so themes can run an exit animation.
 *
 * @example
 * ```html
 * <div kjAlert kjVariant="error" #a="kjAlert">
 *   <h3 kjAlertTitle>Could not save draft</h3>
 *   <p kjAlertDescription>Network request timed out — retry?</p>
 *   <div kjAlertActions>
 *     <button kjButton (click)="retry()">Retry</button>
 *   </div>
 *   <button kjAlertDismiss>×</button>
 * </div>
 * ```
 * @doc-category Core/Feedback
 * @doc
 * @doc-name alert
 * @doc-description Unstyled in-flow alert that picks the right ARIA live-region role for its severity.
 * @doc-is-main
 */
@Directive({
  selector: '[kjAlert]',
  standalone: true,
  exportAs: 'kjAlert',
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
  ],
  providers: [
    { provide: KJ_ALERT, useExisting: KjAlert },
    ...bindPresets(KJ_ALERT_CONFIG),
  ],
  host: {
    '[attr.role]': 'role()',
    '[attr.aria-live]': 'live()',
    '[attr.aria-atomic]': 'live() ? "true" : null',
    '[attr.aria-labelledby]': 'titleId()',
    '[attr.aria-describedby]': 'descriptionId()',
    '[attr.data-dismissed]': 'dismissed() ? "true" : null',
    '[attr.data-mode]': 'mode()',
    '[id]': 'alertId()',
  },
})
export class KjAlert implements KjAlertContext {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The composed preset directives. They own the `kjVariant` / `kjSize`
   * inputs, the `data-variant` / `data-size` reflection and the dev-mode
   * "unknown value" warning against `KJ_ALERT_CONFIG` — Alert used to
   * hand-roll all three, which kept it out of the `KJ_VARIANT_FALLBACK`
   * cascade every other stylistic component participates in.
   */
  private readonly variantPreset = inject(KjVariant, { self: true });
  private readonly sizePreset = inject(KjSize, { self: true });

  /**
   * Stable, deterministic id for the alert root. Used to derive
   * `${alertId}-title` / `${alertId}-description` ids from descendant
   * directives. The host's `[id]` is set so descendants can reference it
   * via `aria-labelledby` / `aria-describedby` cross-references.
   */
  readonly alertId = signal(inject(KjId).mint('alert'));

  /**
   * Explicit override for the role/live matrix. Leave unset to let the
   * directive resolve from `kjAlertStatic` / `kjVariant`.
   */
  readonly kjAlertMode = input<KjAlertMode | undefined>(undefined);

  /**
   * Marks the alert as a static page-level banner. When `true` and
   * `kjAlertMode` is unset, resolves to `'static'` (`role="region"`,
   * no `aria-live`). The host MUST also carry an accessible name —
   * either `aria-label`, `aria-labelledby`, or a projected
   * `[kjAlertTitle]` (validated in dev mode).
   */
  readonly kjAlertStatic = input(false, { transform: booleanAttribute });

  /**
   * Last-resort override for the host `role` attribute. Discouraged —
   * prefer `kjAlertMode`. Only honoured when the resolved mode is
   * `'off'`. Kept for consumers who need a non-standard role
   * (e.g., `role="alertdialog"` is wrong here, but `role="status"`
   * forced on a non-error is valid).
   */
  readonly kjAlertRole = input<string | undefined>(undefined);

  /** Fired when the dismiss button (or programmatic `dismiss()`) runs. */
  readonly kjAlertDismissed = output<void>();

  private readonly _titleIds = signal<readonly string[]>([]);
  private readonly _descriptionIds = signal<readonly string[]>([]);
  private readonly _dismissed = signal(false);

  /**
   * Resolved severity variant — what `KjAlertIcon` mirrors and what the
   * `kjAlertMode` matrix branches on. Read from the composed {@link KjVariant},
   * so it follows `explicit kjVariant input > KJ_VARIANT_FALLBACK cascade >
   * provideKjAlert default` exactly like Button, Tag and Spinner. `kjVariant`
   * itself is the composed directive's input and keeps its public name.
   */
  readonly variant = this.variantPreset.resolvedVariant;

  /** Resolved size — reflected as `data-size` by the composed {@link KjSize}. */
  readonly size = this.sizePreset.resolvedSize;

  /**
   * Resolved mode following the matrix:
   * 1. explicit `kjAlertMode`,
   * 2. `kjAlertStatic` → `'static'`,
   * 3. `error` variant → `'assertive'`,
   * 4. else `'polite'`.
   */
  readonly mode = computed<KjAlertMode>(() => {
    const explicit = this.kjAlertMode();
    if (explicit) return explicit;
    if (this.kjAlertStatic()) return 'static';
    if (this.variant() === 'error') return 'assertive';
    return 'polite';
  });

  /** Resolved `role` attribute value (or `null` when in `'off'` mode without a `kjAlertRole`). */
  readonly role = computed<string | null>(() => {
    switch (this.mode()) {
      case 'assertive': return 'alert';
      case 'polite':    return 'status';
      case 'static':    return 'region';
      case 'off':       return this.kjAlertRole() ?? null;
    }
  });

  /** Resolved `aria-live` value, or `null` for static / off. */
  readonly live = computed<'assertive' | 'polite' | null>(() => {
    const m = this.mode();
    return m === 'assertive' ? 'assertive'
         : m === 'polite'    ? 'polite'
         : null;
  });

  /** First registered title id (most recent registration wins, but only one is expected). */
  readonly titleId = computed<string | null>(() => this._titleIds()[0] ?? null);

  /** First registered description id. */
  readonly descriptionId = computed<string | null>(() => this._descriptionIds()[0] ?? null);

  /** Brief flag set on `dismiss()` so themes can animate exit. */
  readonly dismissed = this._dismissed.asReadonly();

  registerTitle(id: string): void {
    this._titleIds.update(ids => ids.includes(id) ? ids : [...ids, id]);
  }
  unregisterTitle(id: string): void {
    this._titleIds.update(ids => ids.filter(x => x !== id));
  }
  registerDescription(id: string): void {
    this._descriptionIds.update(ids => ids.includes(id) ? ids : [...ids, id]);
  }
  unregisterDescription(id: string): void {
    this._descriptionIds.update(ids => ids.filter(x => x !== id));
  }

  /**
   * Marks the alert as dismissed and emits `kjAlertDismissed`. The consumer
   * is responsible for unmounting (this directive does not remove itself).
   */
  dismiss(): void {
    if (this._dismissed()) return;
    this._dismissed.set(true);
    this.kjAlertDismissed.emit();
  }

  constructor() {
    if (kjDevMode()) {
      // Unknown variant / size are reported by the composed KjVariant / KjSize
      // against KJ_ALERT_CONFIG; Alert no longer duplicates that warning.
      effect(() => {
        const m = this.mode();
        const node = this.el.nativeElement;

        // 1. Static mode without an accessible name → unlabelled region.
        if (m === 'static') {
          const hasAriaLabel = node.hasAttribute('aria-label');
          const hasAriaLabelledby = node.hasAttribute('aria-labelledby') || this.titleId() != null;
          if (!hasAriaLabel && !hasAriaLabelledby) {
            kjDevWarn(
              'kj-alert',
              'static mode requires an accessible name — add aria-label, ' +
              'aria-labelledby, or a [kjAlertTitle] child.',
            );
          }
        }

        // 2. No accessible content at all.
        if (this.titleId() == null && this.descriptionId() == null && !node.textContent?.trim()) {
          kjDevWarn('kj-alert', 'alert has no accessible content (no title, description, or text).');
        }

        // 3. Assertive + success — almost certainly a misuse.
        if (m === 'assertive' && this.variant() === 'success') {
          kjDevWarn(
            'kj-alert',
            'assertive mode with success variant is unusual — success messages ' +
            'should not interrupt screen reader speech.',
          );
        }
      });
    }
  }
}
