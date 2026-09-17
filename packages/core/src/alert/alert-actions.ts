import {
  Directive,
  computed,
  inject,
  input,
} from '@angular/core';
import { KjTranslateService } from '../i18n/translate.service';

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
    '[attr.aria-label]': 'label()',
  },
})
export class KjAlertActions {
  private readonly i18n = inject(KjTranslateService);

  /**
   * AT label for the group. Unset, it resolves from the i18n catalog key
   * `alert.actions` — translate it with `provideKjTranslations(…)` rather
   * than by re-typing the string on every alert.
   */
  readonly kjAlertActionsLabel = input<string | undefined>(undefined);

  /** Explicit input, else the catalog. Locale-reactive. */
  protected readonly label = computed(
    () => this.kjAlertActionsLabel() ?? this.i18n.translate('alert.actions'),
  );
}
