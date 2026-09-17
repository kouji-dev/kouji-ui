import {
  Directive,
} from '@angular/core';
import {
  KJ_STEP,
} from './stepper.context';
import { injectParent } from '../primitives/diagnostics/inject-parent';

/**
 * Marks an element as the *content panel* of its parent {@link KjStep}.
 * Host-binds `role="region"`, `aria-labelledby` to the step's label id,
 * and toggles `[hidden]` / `[inert]` based on the step's active state.
 *
 * The wrapper layer renders the content via `@if (step.active())` so only
 * the active panel is in the DOM. This directive's host bindings remain
 * correct even when the wrapper opts to keep all panels mounted (e.g.
 * for a crossfade).
 *
 * @example
 * ```html
 * <section kjStepContent>...</section>
 * ```
 * @doc-category Core/Navigation
 * @doc
 * @doc-name stepper
 */
@Directive({
  selector: '[kjStepContent]',
  standalone: true,
  host: {
    role: 'region',
    '[attr.id]': 'step.contentId()',
    '[attr.aria-labelledby]': 'step.labelId()',
    '[attr.hidden]': '!step.active() ? "" : null',
    '[attr.inert]': '!step.active() ? "" : null',
    '[attr.data-state]': 'step.active() ? "active" : "inactive"',
    '[attr.tabindex]': 'step.active() ? "-1" : null',
  },
})
export class KjStepContent {
  /** Parent step context. */
  readonly step = injectParent(KJ_STEP, { child: 'KjStepContent', parent: '[kjStep]' });
}
