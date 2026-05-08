import { Directive, Signal, booleanAttribute, input } from '@angular/core';
import {
  KJ_BUTTON_GROUP,
  KjButtonGroupContext,
  KjButtonGroupOrientation,
} from './button-group.context';

/**
 * Coordinates a visually-joined cluster of `KjButton` children. Owns the
 * group's layout role (`role="group"`), orientation, and the per-group
 * variant/size defaults that child buttons read via the `KJ_BUTTON_GROUP`
 * context token (children fall back to the group's value when they don't
 * set their own variant/size).
 *
 * The directive is structural-only: it sets the host role, ARIA orientation,
 * and `data-orientation` attribute used by the wrapper package's segmented
 * styling. It does not own selection state, dropdown wiring, or roving
 * tabindex — keep those in dedicated directives (see `button-group.md`).
 *
 * Disabled propagates: when `kjDisabled` is true, every projected child
 * `KjButton` reads it from the context and OR-s it with its own.
 *
 * @example
 * ```html
 * <div kjButtonGroup [kjOrientation]="'horizontal'" [kjVariant]="'outline'">
 *   <button kjButton>Save</button>
 *   <button kjButton>Cancel</button>
 *   <button kjButton>Delete</button>
 * </div>
 * ```
 * @category Core/Actions
 * @doc
 * @doc-name button-group
 * @doc-is-main
 */
@Directive({
  selector: '[kjButtonGroup]',
  standalone: true,
  exportAs: 'kjButtonGroup',
  providers: [{ provide: KJ_BUTTON_GROUP, useExisting: KjButtonGroup }],
  host: {
    '[attr.role]': '"group"',
    // `role="group"` does not accept `aria-orientation` per WAI-ARIA, so the
    // orientation is only surfaced as a styling hook via `data-orientation`.
    // Roles that *do* take the attribute (e.g. `toolbar`, `radiogroup`) are
    // out of scope for this directive — see `button-group.md` for the
    // dedicated toolbar/radiogroup variants.
    '[attr.data-orientation]': 'kjOrientation()',
    '[attr.data-disabled]': 'kjDisabled() ? "" : null',
  },
})
export class KjButtonGroup implements KjButtonGroupContext {
  /**
   * Layout axis. Drives `aria-orientation` and the `data-orientation`
   * styling hook used by the wrapper package's CSS.
   * @default 'horizontal'
   */
  readonly kjOrientation = input<KjButtonGroupOrientation>('horizontal');

  /**
   * Default variant forwarded to children via `KJ_BUTTON_GROUP`. Children
   * that set their own `kjVariant` override this; children that don't read
   * the group's value as a fallback.
   */
  readonly kjVariant = input<string | undefined>(undefined);

  /**
   * Default size forwarded to children via `KJ_BUTTON_GROUP`. Per-child
   * overrides win.
   */
  readonly kjSize = input<string | undefined>(undefined);

  /**
   * Group-level disabled flag. OR-ed with each child button's own
   * `kjDisabled` — if either is `true` the child is disabled.
   */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Read-only context view — exposed for the wrapper / spec ergonomics. */
  get orientation(): Signal<KjButtonGroupOrientation> {
    return this.kjOrientation;
  }

  /** Read-only context view. */
  get variant(): Signal<string | undefined> {
    return this.kjVariant;
  }

  /** Read-only context view. */
  get size(): Signal<string | undefined> {
    return this.kjSize;
  }

  /** Read-only context view. */
  get disabled(): Signal<boolean> {
    return this.kjDisabled;
  }
}
