import {
  Directive,
  ElementRef,
  InputSignalWithTransform,
  type OnDestroy,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  isDevMode,
  output,
  signal,
} from '@angular/core';
import { KjButton } from '../button/button';
import { KJ_ALERT, KjAlertContext, KjAlertMode } from './alert.context';
import { KJ_ALERT_CONFIG } from './config';

let _alertIdCounter = 0;

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
  providers: [
    { provide: KJ_ALERT, useExisting: KjAlert },
  ],
  host: {
    '[attr.role]': 'role()',
    '[attr.aria-live]': 'live()',
    '[attr.aria-atomic]': 'live() ? "true" : null',
    '[attr.aria-labelledby]': 'titleId()',
    '[attr.aria-describedby]': 'descriptionId()',
    '[attr.data-variant]': 'variant()',
    '[attr.data-size]': 'size()',
    '[attr.data-dismissed]': 'dismissed() ? "true" : null',
    '[attr.data-mode]': 'mode()',
    '[id]': 'alertId()',
  },
})
export class KjAlert implements KjAlertContext {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly preset = inject(KJ_ALERT_CONFIG);

  /**
   * Stable, deterministic id for the alert root. Used to derive
   * `${alertId}-title` / `${alertId}-description` ids from descendant
   * directives. The host's `[id]` is set so descendants can reference it
   * via `aria-labelledby` / `aria-describedby` cross-references.
   */
  readonly alertId = signal(`kj-alert-${++_alertIdCounter}`);

  /**
   * Severity variant (validated against `KJ_ALERT_CONFIG.variants` in dev).
   * Reflects to `data-variant`. Drives the default `kjAlertMode` resolution
   * (error → assertive, others → polite).
   *
   * Field-annotated explicitly so ng-packagr does not narrow the emitted
   * `.d.ts` write-side to `string` (dropping `string | undefined` flow-through
   * — same trick as `KjButton.kjPressed` and `KjVariant.kjVariant`).
   */
  readonly kjVariant: InputSignalWithTransform<string, string | undefined> = input(
    this.preset.defaults.variant,
    { transform: (v?: string) => v || this.preset.defaults.variant },
  );

  /** Size token validated against `KJ_ALERT_CONFIG.sizes`. Reflects to `data-size`. */
  readonly kjSize: InputSignalWithTransform<string, string | undefined> = input(
    this.preset.defaults.size,
    { transform: (v?: string) => v || this.preset.defaults.size },
  );

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

  /** Resolved variant for context consumers (`KjAlertIcon`, etc.). */
  readonly variant = this.kjVariant;

  /** Resolved size signal exposed for symmetry — currently used only as `data-size`. */
  readonly size = this.kjSize;

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
    if (isDevMode()) {
      effect(() => {
        const v = this.kjVariant();
        if (!this.preset.variants.includes(v)) {
          console.warn(
            `[kj-alert] unknown variant "${v}". Allowed values: ${this.preset.variants.join(', ')}.`,
          );
        }
      });
      effect(() => {
        const s = this.kjSize();
        if (!this.preset.sizes.includes(s)) {
          console.warn(
            `[kj-alert] unknown size "${s}". Allowed values: ${this.preset.sizes.join(', ')}.`,
          );
        }
      });

      effect(() => {
        const m = this.mode();
        const node = this.el.nativeElement;

        // 1. Static mode without an accessible name → unlabelled region.
        if (m === 'static') {
          const hasAriaLabel = node.hasAttribute('aria-label');
          const hasAriaLabelledby = node.hasAttribute('aria-labelledby') || this.titleId() != null;
          if (!hasAriaLabel && !hasAriaLabelledby) {
            console.warn(
              '[kj-alert] static mode requires an accessible name — add aria-label, ' +
              'aria-labelledby, or a [kjAlertTitle] child.',
            );
          }
        }

        // 2. No accessible content at all.
        if (this.titleId() == null && this.descriptionId() == null && !node.textContent?.trim()) {
          console.warn('[kj-alert] alert has no accessible content (no title, description, or text).');
        }

        // 3. Assertive + success — almost certainly a misuse.
        if (m === 'assertive' && this.variant() === 'success') {
          console.warn(
            '[kj-alert] assertive mode with success variant is unusual — success messages ' +
            'should not interrupt screen reader speech.',
          );
        }
      });
    }
  }
}

/**
 * Marks an element as the alert title. Generates `${alertId}-title`,
 * registers with the `KJ_ALERT` context so the root reflects
 * `aria-labelledby`. Apply to a heading element (`<h3 kjAlertTitle>`)
 * when the alert is in a content region.
 *
 * @doc-category Core/Feedback
 * @doc
 * @doc-name alert
 */
@Directive({
  selector: '[kjAlertTitle]',
  standalone: true,
  host: {
    '[attr.id]': 'titleId',
  },
})
export class KjAlertTitle implements OnDestroy {
  private readonly ctx = inject(KJ_ALERT);
  readonly titleId = `${this.ctx.alertId()}-title`;

  constructor() {
    this.ctx.registerTitle(this.titleId);
    inject(ElementRef); // ensure host element is bound before destroy
  }

  ngOnDestroy(): void {
    this.ctx.unregisterTitle(this.titleId);
  }
}

/**
 * Marks an element as the alert description. Generates
 * `${alertId}-description`, registers with `KJ_ALERT` for
 * `aria-describedby`. Same id-registration pattern as `KjAlertTitle`.
 *
 * @doc-category Core/Feedback
 * @doc
 * @doc-name alert
 */
@Directive({
  selector: '[kjAlertDescription]',
  standalone: true,
  host: {
    '[attr.id]': 'descriptionId',
  },
})
export class KjAlertDescription implements OnDestroy {
  private readonly ctx = inject(KJ_ALERT);
  readonly descriptionId = `${this.ctx.alertId()}-description`;

  constructor() {
    this.ctx.registerDescription(this.descriptionId);
  }

  ngOnDestroy(): void {
    this.ctx.unregisterDescription(this.descriptionId);
  }
}

/**
 * Decorative icon slot for an alert. Sets `aria-hidden="true"` (the
 * meaning is carried by the title/description) and mirrors the
 * resolved variant as `data-variant` so themes can swap glyphs without
 * the consumer re-typing it.
 *
 * @doc-category Core/Feedback
 * @doc
 * @doc-name alert
 */
@Directive({
  selector: '[kjAlertIcon]',
  standalone: true,
  host: {
    '[attr.aria-hidden]': '"true"',
    '[attr.data-variant]': 'variant()',
  },
})
export class KjAlertIcon {
  private readonly ctx = inject(KJ_ALERT);
  readonly variant = this.ctx.variant;
}

/**
 * Semantic group for action buttons inside an alert. Sets
 * `role="group"` on the host and an overridable
 * `aria-label="Alert actions"` so AT users can skip past the
 * actions container as a unit.
 *
 * @doc-category Core/Feedback
 * @doc
 * @doc-name alert
 */
@Directive({
  selector: '[kjAlertActions]',
  standalone: true,
  host: {
    'role': 'group',
    '[attr.aria-label]': 'kjAlertActionsLabel()',
  },
})
export class KjAlertActions {
  /** AT label for the group. Localisable. */
  readonly kjAlertActionsLabel = input<string>('Alert actions');
}

/**
 * Dismiss button for an alert. Composes `KjButton` via host directives
 * so the button gets the full focus-ring / aria-disabled / capture-phase
 * click contract. Calls `KJ_ALERT.dismiss()` on click — the consumer's
 * own `(click)` listener still fires (e.g. for analytics).
 *
 * Aliased inputs: `kjAlertDismissLabel` → `KjButton.kjAriaLabel`,
 * `kjAlertDismissVariant` → `KjButton.kjVariant`,
 * `kjAlertDismissSize` → `KjButton.kjSize`.
 *
 * @doc-category Core/Feedback
 * @doc
 * @doc-name alert
 */
@Directive({
  selector: '[kjAlertDismiss]',
  standalone: true,
  hostDirectives: [KjButton],
  host: {
    '[attr.aria-label]': 'kjAlertDismissLabel()',
    '[attr.data-variant]': 'kjAlertDismissVariant()',
    '[attr.data-size]': 'kjAlertDismissSize()',
    '(click)': 'onClick()',
  },
})
export class KjAlertDismiss {
  private readonly ctx = inject(KJ_ALERT);

  /** AT label for the dismiss button. */
  readonly kjAlertDismissLabel = input<string>('Dismiss');

  /**
   * Variant token mirrored as `data-variant`. Defaults to `'ghost'` so themes
   * pick up the unobtrusive close-button surface. Mirrored directly rather
   * than aliased through `KjButton`'s host-directive `kjVariant` input
   * because Angular does not let `hostDirectives.inputs` alias an input that
   * is itself only exposed via a nested host directive.
   */
  readonly kjAlertDismissVariant = input<string>('ghost');

  /** Size token mirrored as `data-size`. Defaults to `'icon'` for the 44×44 touch target. */
  readonly kjAlertDismissSize = input<string>('icon');

  onClick(): void {
    this.ctx.dismiss();
  }
}
