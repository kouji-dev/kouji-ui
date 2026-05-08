import {
  Directive,
  ElementRef,
  InjectionToken,
  Signal,
  computed,
  effect,
  inject,
  input,
  isDevMode,
} from '@angular/core';
import { KjRovingTabindex } from '../a11y/roving-tabindex';
import { KjSize, KjVariant } from '../presets';

/**
 * Orientation axis for a list. Drives `aria-orientation` on the root and a
 * `data-orientation` mirror that wrapper CSS hangs flex-direction off.
 */
export type KjListOrientation = 'vertical' | 'horizontal';

/**
 * Host element kind the consumer chose for the list root. The directive does
 * not render this element — the consumer does — but the input lets the
 * directive emit the right `role` and warn on landmark misuse.
 *
 * `'ul'` is the default and the recommended choice in 90% of cases.
 */
export type KjListAs = 'ul' | 'ol' | 'div' | 'nav';

/** @internal Public shape of the parent list context exposed to descendants. */
export interface KjListContext {
  readonly kjOrientation: Signal<KjListOrientation>;
  readonly kjDivided: Signal<boolean>;
  readonly kjHoverable: Signal<boolean>;
}

/** Context token for the parent `KjList`, injected by descendants. */
export const KJ_LIST = new InjectionToken<KjListContext>('KjList');

/** Context token for the parent `KjListItem`, injected by descendants. */
export const KJ_LIST_ITEM = new InjectionToken<KjListItemContext>('KjListItem');

/** @internal Public shape of the per-row context exposed to descendants. */
export interface KjListItemContext {
  readonly active: Signal<boolean>;
  readonly disabled: Signal<boolean>;
}

/**
 * Root list container. Owns the container ARIA role, orientation,
 * divider/hover data attributes, and an opt-in roving-tabindex composition for
 * sidebar-nav-list use cases. Composes `KjVariant` + `KjSize` via
 * `hostDirectives` so theme CSS can read the standard `data-variant` /
 * `data-size` mirrors.
 *
 * The directive does **not** render the host element — the consumer does. The
 * `kjAs` input declares which element the consumer chose so the directive can
 * emit (or omit) `role="list"` and warn when a `<nav>` host is missing an
 * accessible name.
 *
 * **Why `role="list"` on `<ul>`/`<ol>`?** Safari's WebKit "list voice"
 * heuristic strips the implicit `role="list"` from a `<ul>` whose CSS sets
 * `list-style: none` (the default in our wrapper CSS). Re-emitting the role
 * defeats the heuristic. The redundancy is deliberate.
 *
 * @example
 * ```html
 * <ul kjList kjOrientation="vertical" aria-label="Recent files">
 *   <li kjListItem>Item A</li>
 *   <li kjListItem>Item B</li>
 * </ul>
 * ```
 *
 * @example Sidebar nav with arrow-key navigation
 * ```html
 * <nav kjList kjAs="nav" kjArrowNavigation aria-label="Primary">
 *   <div kjListItem [kjActive]="true">
 *     <a kjLink kjRovingTabindexItem aria-current="page">Home</a>
 *   </div>
 *   <div kjListItem>
 *     <a kjLink kjRovingTabindexItem>Settings</a>
 *   </div>
 * </nav>
 * ```
 *
 * @category Core/Data display
 * @doc
 * @doc-name list
 * @doc-description Unstyled list container with role, orientation, and opt-in arrow-key navigation for sidebars.
 * @doc-is-main
 */
@Directive({
  selector: '[kjList]',
  standalone: true,
  hostDirectives: [
    { directive: KjVariant, inputs: ['kjVariant'] },
    { directive: KjSize, inputs: ['kjSize'] },
    // Forward the composed roving primitive's orientation under the same
    // external name as `kjOrientation` so consumers writing
    // `<ul kjList kjOrientation="horizontal">` get both axes wired.
    {
      directive: KjRovingTabindex,
      inputs: ['kjRovingOrientation: kjOrientation'],
    },
  ],
  providers: [{ provide: KJ_LIST, useExisting: KjList }],
  exportAs: 'kjList',
  host: {
    '[attr.role]': 'roleAttr()',
    // `aria-orientation` is rejected by axe's `aria-allowed-attr` on
    // `role="list"` (the implicit/explicit list role does not list
    // `aria-orientation` as a supported attribute in ARIA 1.2). The keyboard
    // axis is enforced via the composed `KjRovingTabindex.kjRovingOrientation`
    // and themes read `data-orientation` for visual layout. Same precedent
    // as `KjStepper`.
    '[attr.data-orientation]': 'kjOrientation()',
    '[attr.data-divided]': 'kjDivided() ? "" : null',
    '[attr.data-hoverable]': 'kjHoverable() ? "" : null',
  },
})
export class KjList implements KjListContext {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Declares which host element the consumer is rendering this list as.
   * Default `'ul'` matches the `<ul kjList>` ergonomic. `'nav'` switches the
   * implicit role to the `navigation` landmark (the directive omits its
   * `role="list"` binding in that case) and triggers a dev-mode warning when
   * neither `aria-label` nor `aria-labelledby` is set on the host.
   */
  readonly kjAs = input<KjListAs>('ul');

  /**
   * List orientation. Drives `aria-orientation` and `data-orientation`.
   * Forwarded to the composed `KjRovingTabindex` (when `kjArrowNavigation` is
   * `true`) so arrow-key navigation moves on the right axis.
   */
  readonly kjOrientation = input<KjListOrientation>('vertical');

  /**
   * Whether the list draws between-row borders. Theme CSS reads
   * `data-divided` on the root and applies a `:not(:last-child)` border on
   * `KjListItem`. Pure CSS effect — no JS.
   */
  readonly kjDivided = input<boolean>(false);

  /**
   * Whether rows highlight on hover. Theme CSS reads `data-hoverable` on the
   * root. Off by default because purely informational lists (stat blocks)
   * should not hint at interactivity.
   */
  readonly kjHoverable = input<boolean>(false);

  /**
   * Opt-in flag that turns the list into a roving-tabindex group. When
   * `false` (default), the composed `KjRovingTabindex` is configured with
   * `kjRovingOrientation="vertical" | "horizontal"` but no item is registered
   * unless the consumer applies `kjRovingTabindexItem` to a focusable child.
   * Setting this to `true` documents the intent at the consumer site; the
   * actual focus-stop wiring is done by the consumer applying
   * `kjRovingTabindexItem` on their projected `<a>` / `<button>`.
   */
  readonly kjArrowNavigation = input<boolean>(false);

  /**
   * Whether arrow-key navigation wraps at the ends. Forwarded conceptually to
   * theme/keyboard logic; only meaningful when `kjArrowNavigation` is `true`.
   * Defaults to `true` to match the typical sidebar-nav UX.
   */
  readonly kjListWrap = input<boolean>(true);

  /** @internal Computes the role the directive should host-bind. */
  protected readonly roleAttr = computed<string | null>(() => {
    const as = this.kjAs();
    // `<nav>` is a landmark (implicit `role="navigation"`); emitting
    // `role="list"` on top of it would conflict with the landmark semantics.
    if (as === 'nav') return null;
    // Always emit on `<ul>` / `<ol>` to defeat Safari's `list-style: none`
    // voice-stripping heuristic, and on `<div>` because there is no implicit
    // role to inherit from.
    return 'list';
  });

  constructor() {
    if (isDevMode()) {
      // Landmark naming discipline: a `<nav>` MUST have an accessible name.
      // We warn (not throw) so downstream tooling that adds the attribute via
      // a wrapper or a parent `aria-labelledby` on the surrounding heading
      // does not flake under unit tests; the wrapper layer escalates to an
      // error per the analysis doc.
      effect(() => {
        if (this.kjAs() !== 'nav') return;
        // Read host attributes lazily — the host element is the consumer's,
        // so attribute presence is the source of truth.
        const host = this.el.nativeElement;
        const hasLabel =
          host.hasAttribute('aria-label') || host.hasAttribute('aria-labelledby');
        if (!hasLabel) {
          console.warn(
            '[kj] kjList with kjAs="nav" requires aria-label or aria-labelledby on the host. ' +
              'A <nav> is a landmark and must be named.',
          );
        }
      });
    }
  }
}

/**
 * Per-row directive. Owns the listitem ARIA role and reflects active /
 * disabled state to data attributes the wrapper CSS reads to paint chrome.
 * Provides a tiny `KJ_LIST_ITEM` token so descendants (e.g. an icon button
 * inside the row) can read the parent's active/disabled signals.
 *
 * The list-item host is **not** a focus stop. Keyboard reachability lives on
 * the projected interactive child (`<a kjLink>`, `<button kjButton>`). The
 * directive's `kjDisabled` only paints the chrome via `data-disabled`; it
 * does **not** wire `aria-disabled` on the projected child — that is the
 * projected child's responsibility (via `KjDisabled`).
 *
 * @example
 * ```html
 * <li kjListItem [kjActive]="route === '/home'">
 *   <a kjLink href="/home" aria-current="page">Home</a>
 * </li>
 * ```
 *
 * @category Core/Data display
 * @doc
 * @doc-name list
 */
@Directive({
  selector: '[kjListItem]',
  standalone: true,
  providers: [{ provide: KJ_LIST_ITEM, useExisting: KjListItem }],
  exportAs: 'kjListItem',
  host: {
    '[attr.role]': 'roleAttr()',
    '[attr.data-active]': 'kjActive() ? "" : null',
    '[attr.data-disabled]': 'kjDisabled() ? "" : null',
  },
})
export class KjListItem implements KjListItemContext {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Whether the row is the current/active selection (e.g. the current page in
   * a sidebar nav). Reflects to `data-active=""`. The directive does **not**
   * infer `aria-current` from this — the consumer sets `aria-current="page"`
   * (or `step`, `date`, `true`) on the projected link/button because the
   * right token depends on the consumer's domain.
   */
  readonly kjActive = input<boolean>(false);

  /**
   * Whether the row is disabled. Reflects to `data-disabled=""` so theme CSS
   * can dim the projected interactive child. Does not block keyboard
   * reachability — that responsibility is the projected child's (via
   * `KjDisabled`).
   */
  readonly kjDisabled = input<boolean>(false);

  /** @internal Mirrors `kjActive` for descendant-side reads via `KJ_LIST_ITEM`. */
  readonly active = this.kjActive;

  /** @internal Mirrors `kjDisabled` for descendant-side reads via `KJ_LIST_ITEM`. */
  readonly disabled = this.kjDisabled;

  /** @internal Computes the role to host-bind, omitting when the host is `<li>`. */
  protected readonly roleAttr = computed<string | null>(() => {
    const tag = this.el.nativeElement.tagName?.toLowerCase();
    return tag === 'li' ? null : 'listitem';
  });
}
