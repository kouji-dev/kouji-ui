import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';
import { KjList, KjListItem, type KjListAs, type KjListOrientation } from '@kouji-ui/core';

/**
 * Themed wrapper around the headless `KjList` directive. Re-maps the directive's
 * `kj`-prefixed inputs to terse public names (`orientation`, `divided`,
 * `hoverable`, `arrowNavigation`, `wrap`) and surfaces the `as` declaration so
 * theme CSS can paint chrome (divider rules, hover highlight, orientation flex
 * direction) off the standard `data-*` mirrors emitted by the directive.
 *
 * The wrapper host is the list root: composing `KjList` via `hostDirectives`
 * means `<kj-list>` itself carries `role="list"` (or omits it when
 * `as="nav"`, where the wrapper opts the host into the `navigation` landmark
 * via `role="navigation"`).
 *
 * **Active vs. selected discipline.** The wrapper paints `data-active` on the
 * row chrome but never infers ARIA. Consumers set `aria-current="page"` (or
 * `step`, `date`, `true`) on the projected `<a>` / `<button>` because the
 * right token depends on the consumer's domain — it is never a List concern.
 *
 * @example Settings list with leading icons
 * ```html
 * <kj-list ariaLabel="Account settings" divided hoverable>
 *   <kj-list-item>Profile</kj-list-item>
 *   <kj-list-item>Notifications</kj-list-item>
 *   <kj-list-item>Billing</kj-list-item>
 * </kj-list>
 * ```
 *
 * @example Sidebar nav with active row
 * ```html
 * <kj-list as="nav" arrowNavigation ariaLabel="Primary">
 *   <kj-list-item active="true">
 *     <a href="/home" aria-current="page">Home</a>
 *   </kj-list-item>
 *   <kj-list-item>
 *     <a href="/settings">Settings</a>
 *   </kj-list-item>
 * </kj-list>
 * ```
 *
 * @doc-example Default
 *   @doc-file list.example.ts
 * @doc-example Divided
 *   @doc-file list.divided.example.ts
 * @doc-example Nav landmark
 *   @doc-file list.nav.example.ts
 * @doc-example Interactive rows
 *   @doc-file list.interactive.example.ts
 * @doc-example With icons and badges
 *   @doc-file list.with-icons.example.ts
 * @category Library/Data display
 */
@Component({
  selector: 'kj-list',
  standalone: true,
  hostDirectives: [
    {
      directive: KjList,
      inputs: [
        'kjAs: as',
        'kjOrientation: orientation',
        'kjDivided: divided',
        'kjHoverable: hoverable',
        'kjArrowNavigation: arrowNavigation',
        'kjListWrap: wrap',
      ],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './list.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-list',
    '[attr.role]': 'roleAttr()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]': 'ariaLabelledby() || null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjListComponent {
  /**
   * Declares which semantic element the consumer wants the list to behave as.
   * The wrapper does not literally swap host tags (the host stays
   * `<kj-list>`), but the directive uses `as` to decide whether to emit
   * `role="list"`, and the wrapper layers a `role="navigation"` on top when
   * `as="nav"` so the host doubles as a landmark.
   */
  readonly as = input<KjListAs>('ul');

  /** List axis. Drives `data-orientation` on the host for theme CSS. */
  readonly orientation = input<KjListOrientation>('vertical');

  /** Whether the list draws between-row borders. CSS-only effect. */
  readonly divided = input(false, { transform: booleanAttribute });

  /** Whether rows highlight on hover. Off by default — purely informational lists should not hint at interactivity. */
  readonly hoverable = input(false, { transform: booleanAttribute });

  /** Opt-in roving-tabindex group for sidebar-nav-list use cases. Mirrors the accordion arrow-nav pattern. */
  readonly arrowNavigation = input(false, { transform: booleanAttribute });

  /** Whether arrow-key navigation wraps at the ends. Only meaningful when `arrowNavigation` is `true`. */
  readonly wrap = input(true, { transform: booleanAttribute });

  /** Accessible name for the list. Required for `as="nav"` (landmark naming rule). */
  readonly ariaLabel = input<string | undefined>(undefined);

  /** Accessible name reference for the list. Use when an existing heading labels the list. */
  readonly ariaLabelledby = input<string | undefined>(undefined);

  /**
   * @internal Computed role for the wrapper host. When `as="nav"`, the host
   * acts as the navigation landmark; otherwise it stays a plain `role="list"`.
   * The wrapper owns this binding (rather than letting the composed `KjList`
   * directive emit it) because Angular gives the component-level host binding
   * priority over a host-directive's binding on the same attribute, so the
   * directive's value would otherwise be silently shadowed.
   */
  protected readonly roleAttr = computed<string | null>(() =>
    this.as() === 'nav' ? 'navigation' : 'list',
  );
}

/**
 * Per-row wrapper around the headless `KjListItem` directive. Re-maps
 * `kjActive` / `kjDisabled` to terse public names and ensures the row chrome
 * (active highlight, disabled dim) reads off the same `data-*` attributes the
 * core directive emits.
 *
 * The list-item host is **not** a focus stop. Keyboard reachability lives on
 * the projected interactive child (`<a>`, `<button>`). Disabling the row is a
 * two-layer story: `disabled` on `<kj-list-item>` paints the chrome via
 * `data-disabled`, and the projected child wires its own `aria-disabled` /
 * `tabindex` discipline (e.g. via `KjDisabled` on a button).
 *
 * @category Library/Data display
 */
@Component({
  selector: 'kj-list-item',
  standalone: true,
  hostDirectives: [
    {
      directive: KjListItem,
      inputs: ['kjActive: active', 'kjDisabled: disabled'],
    },
  ],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-list-item' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjListItemComponent {
  /**
   * Whether the row is the current/active selection (e.g. the current page in
   * a sidebar nav). Reflects to `data-active=""` on the host. Consumers must
   * also set the appropriate `aria-current` token on the projected
   * link/button.
   */
  readonly active = input(false, { transform: booleanAttribute });

  /**
   * Whether the row is disabled. Reflects to `data-disabled=""` on the host so
   * theme CSS can dim the chrome. Does not block keyboard reachability — that
   * belongs to the projected interactive child.
   */
  readonly disabled = input(false, { transform: booleanAttribute });
}
