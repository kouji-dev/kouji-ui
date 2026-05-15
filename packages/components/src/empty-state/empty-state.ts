import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  input,
} from '@angular/core';
import { KjSize, KJ_SIZE_PRESET } from '@kouji-ui/core';

const KJ_EMPTY_STATE_SIZE_PRESET = {
  values: ['sm', 'md', 'lg'],
  default: 'md',
};

/** Tonal variant for the empty state. */
export type KjEmptyStateVariant = 'neutral' | 'error';

/** Live-region politeness setting. `false` opts out entirely. */
export type KjEmptyStateLive = false | 'polite' | 'assertive';

/** Heading level for `<kj-empty-state-title>`. */
export type KjEmptyStateLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Placeholder shown in place of a list, table, feed, or detail panel when
 * there is no data to display — never-populated, search-no-results, or a
 * contained error. Components-only family with no headless directive in
 * `@kouji-ui/core`: the visual contract is "centre four things", and the
 * a11y contract (when to live-announce, with which role) is one input on
 * the root component.
 *
 * Compose with `<kj-empty-state-icon>`, `<kj-empty-state-title>`,
 * `<kj-empty-state-description>`, and `<kj-empty-state-actions>` for the
 * standard layout. All four sub-components are optional.
 *
 * Variants:
 * - `neutral` (default) — "no data yet", "no results", any non-error empty.
 * - `error` — "we couldn't load this" with retry affordance.
 *
 * Live region:
 * - `kjLive=false` (default) — no role; appropriate for initial-render
 *   never-populated empties read in document flow.
 * - `kjLive='polite'` — `role="status"` (neutral) for search-no-results
 *   that appear in response to user action.
 * - `kjLive='assertive'` — `role="alert"` (error) for runtime failures
 *   that demand the user's attention now.
 *
 * @example
 * ```html
 * <kj-empty-state>
 *   <kj-empty-state-icon>📁</kj-empty-state-icon>
 *   <kj-empty-state-title>No projects yet</kj-empty-state-title>
 *   <kj-empty-state-description>Create your first project to get started.</kj-empty-state-description>
 *   <kj-empty-state-actions>
 *     <kj-button>Create project</kj-button>
 *   </kj-empty-state-actions>
 * </kj-empty-state>
 * ```
 * @doc-example Default
 *   Never-populated case — neutral variant with no `kjLive`.
 *   @doc-file empty-state.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common empty-state usages — never-populated
 *   neutral, search-no-results polite, and assertive error.
 *   @doc-file empty-state.usage.example.ts
 * @doc-example Error
 *   `kjVariant="error"` + `kjLive="assertive"` for runtime load failures.
 *   @doc-file empty-state.error.example.ts
 * @doc-example No search results
 *   Search-no-results pattern with a polite live announcement.
 *   @doc-file empty-state.search.example.ts
 * @doc-example Sizes
 *   `kjSize="sm"` / `md` / `lg` — drives padding, icon size, and font sizes.
 *   @doc-file empty-state.sizes.example.ts
 * @doc-example With secondary actions
 *   Primary + secondary action rows (the secondary stack appears beneath).
 *   @doc-file empty-state.with-actions.example.ts
 *
 * @doc-aria
 *   role         — Derived from `kjLive` + `kjVariant`: `alert` for error+live, `status` for neutral+live, none otherwise
 *   aria-live    — `assertive` for the error variant, `polite` for neutral, omitted when `kjLive=false`
 *   aria-atomic  — `"true"` whenever a live region is active so the full message re-announces
 *   aria-label   — Forwarded from `[kjEmptyStateLabel]` when provided
 *   aria-hidden  — `"true"` on the icon slot — the meaning lives in the title / description
 *
 * @doc-css-var
 *   --kj-empty-state-bg          — Background fill. Defaults to transparent so the surface inherits.
 *   --kj-empty-state-fg          — Title and primary text color. Defaults to --kj-fg-default.
 *   --kj-empty-state-muted-fg    — Description and icon tint. Defaults to --kj-fg-muted.
 *   --kj-empty-state-accent      — Accent color used for the error variant icon.
 *   --kj-empty-state-padding-y   — Vertical padding around the centered stack. Sizes override.
 *   --kj-empty-state-padding-x   — Horizontal padding around the centered stack. Sizes override.
 *   --kj-empty-state-gap         — Gap between icon, title, description, and actions.
 *   --kj-empty-state-icon-size   — Edge length of the icon slot. Sizes override (2/3/4.5rem).
 *   --kj-empty-state-title-size  — Title font size. Sizes override.
 *   --kj-empty-state-desc-size   — Description font size. Sizes override.
 *   --kj-empty-state-max-width   — Max width for title and description blocks. Defaults to 32rem.
 *
 * @doc-a11y
 *   The component is purely visual until `kjLive` is set. Initial-render
 *   never-populated empties read in flow without a live region (`kjLive=false`).
 *   Search-no-results — `kjLive="polite"` so AT announces the new state without
 *   interrupting. Errors — `kjLive="assertive"` for failures that demand
 *   immediate attention. Pick a heading level on `<kj-empty-state-title>` that
 *   matches the empty state's depth in the outline.
 *
 * @doc-related alert,toast,skeleton
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name empty-state
 * @doc-description Themed placeholder surface for no-data, no-results, or error scenarios with title, description, and actions.
 * @doc-is-main
 */
@Component({
  selector: 'kj-empty-state',
  standalone: true,
  template: `<ng-content />`,
  styleUrl: './empty-state.css',
  encapsulation: ViewEncapsulation.None,
  hostDirectives: [{ directive: KjSize, inputs: ['kjSize'] }],
  providers: [
    { provide: KJ_SIZE_PRESET, useValue: KJ_EMPTY_STATE_SIZE_PRESET },
  ],
  host: {
    'class': 'kj-empty-state',
    '[attr.data-variant]': 'kjVariant()',
    '[attr.role]': 'role()',
    '[attr.aria-live]': 'ariaLive()',
    '[attr.aria-atomic]': 'ariaAtomic()',
    '[attr.aria-label]': 'kjEmptyStateLabel() ?? null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjEmptyStateComponent {
  /** Tonal variant — `'neutral'` (default) or `'error'`. Reflects to `data-variant`. */
  readonly kjVariant = input<KjEmptyStateVariant>('neutral');

  /**
   * Live-region politeness. `false` (default) renders no role. `'polite'`
   * yields `role="status"`; `'assertive'` yields `role="alert"`. The
   * derived role also depends on `kjVariant`: an error variant with any
   * truthy `kjLive` becomes `role="alert"`; a neutral variant with truthy
   * `kjLive` becomes `role="status"`.
   */
  readonly kjLive = input<KjEmptyStateLive>(false);

  /** Optional `aria-label` override. Defaults to `undefined` (no override). */
  readonly kjEmptyStateLabel = input<string | undefined>(undefined);

  protected readonly role = computed(() => {
    if (!this.kjLive()) return null;
    return this.kjVariant() === 'error' ? 'alert' : 'status';
  });

  protected readonly ariaLive = computed(() => {
    const live = this.kjLive();
    if (!live) return null;
    return this.kjVariant() === 'error' ? 'assertive' : 'polite';
  });

  protected readonly ariaAtomic = computed(() => (this.kjLive() ? 'true' : null));
}

/**
 * Decorative icon / illustration slot. Always `aria-hidden="true"` — the
 * accessible meaning lives in `<kj-empty-state-title>` and
 * `<kj-empty-state-description>`. Consumers project an `<svg>`, an icon
 * component, or an `<img>`.
 * @doc
 * @doc-name empty-state
 */
@Component({
  selector: 'kj-empty-state-icon',
  standalone: true,
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-empty-state-icon',
    'aria-hidden': 'true',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjEmptyStateIconComponent {}

/**
 * Title slot. Renders an `<hN>` element where `N` is `kjLevel` (default `3`).
 * Pick the level that matches the empty state's depth in the document
 * outline — full-page placements want `1` or `2`; deep card-body
 * placements want `4` or higher.
 * @doc
 * @doc-name empty-state
 */
@Component({
  selector: 'kj-empty-state-title',
  standalone: true,
  template: `
    @switch (kjLevel()) {
      @case (1) { <h1 class="kj-empty-state-title"><ng-content /></h1> }
      @case (2) { <h2 class="kj-empty-state-title"><ng-content /></h2> }
      @case (4) { <h4 class="kj-empty-state-title"><ng-content /></h4> }
      @case (5) { <h5 class="kj-empty-state-title"><ng-content /></h5> }
      @case (6) { <h6 class="kj-empty-state-title"><ng-content /></h6> }
      @default  { <h3 class="kj-empty-state-title"><ng-content /></h3> }
    }
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjEmptyStateTitleComponent {
  /** Heading level rendered for the title. Defaults to `3`. */
  readonly kjLevel = input<KjEmptyStateLevel>(3);
}

/**
 * Description slot. Renders a `<p>` containing the projected text. May
 * contain inline `<a kjLink>` for "browse all items" / "contact support"
 * style affordances.
 * @doc
 * @doc-name empty-state
 */
@Component({
  selector: 'kj-empty-state-description',
  standalone: true,
  template: `<p class="kj-empty-state-description"><ng-content /></p>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjEmptyStateDescriptionComponent {}

/**
 * Actions slot. Renders a flex row of projected buttons / links, with an
 * optional secondary row underneath for tertiary affordances ("contact
 * support", "learn more"). Project secondary actions via the
 * `[secondary]` attribute selector.
 *
 * @example
 * ```html
 * <kj-empty-state-actions>
 *   <kj-button>Create project</kj-button>
 *   <a kjLink secondary href="/help">Learn more</a>
 * </kj-empty-state-actions>
 * ```
 * @doc
 * @doc-name empty-state
 */
@Component({
  selector: 'kj-empty-state-actions',
  standalone: true,
  template: `
    <div class="kj-empty-state-actions__primary">
      <ng-content />
    </div>
    <div class="kj-empty-state-actions__secondary">
      <ng-content select="[secondary]" />
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-empty-state-actions',
    '[attr.data-has-secondary]': 'kjHasSecondary() ? "" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjEmptyStateActionsComponent {
  /**
   * When `true`, lays out the secondary slot beneath the primary row in
   * smaller type. Defaults to `false`. Set declaratively when projecting
   * `[secondary]` content; the CSS `:has()` rule also handles the visual
   * fallback for consumers that omit the flag.
   */
  readonly kjHasSecondary = input(false, { transform: booleanAttribute });
}
