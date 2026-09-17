import {
  Directive,
  computed,
  inject,
  input,
} from '@angular/core';
import { KjButton } from '../button/button';
import { KjTranslateService } from '../i18n/translate.service';
import { KJ_ALERT } from './alert.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

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
    '[attr.aria-label]': 'label()',
    '[attr.data-variant]': 'kjAlertDismissVariant()',
    '[attr.data-size]': 'kjAlertDismissSize()',
    '(click)': 'onClick()',
  },
})
export class KjAlertDismiss {
  private readonly ctx = injectParent(KJ_ALERT, { child: 'KjAlertDismiss', parent: '[kjAlert]' });
  private readonly i18n = inject(KjTranslateService);

  /**
   * AT label for the dismiss button. Unset, it resolves from the i18n
   * catalog key `alert.dismiss`.
   */
  readonly kjAlertDismissLabel = input<string | undefined>(undefined);

  /** Explicit input, else the catalog. Locale-reactive. */
  protected readonly label = computed(
    () => this.kjAlertDismissLabel() ?? this.i18n.translate('alert.dismiss'),
  );

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
