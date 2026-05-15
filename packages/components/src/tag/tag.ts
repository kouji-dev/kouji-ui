import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { KjIconDirective, KjTag, KjTagList, KjTagRemove } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjTag` directive. Renders the visual
 * chrome (rounded pill, density tokens, variant tones) and exposes the
 * directive's full input surface via `hostDirectives` aliasing — same
 * composition shape as `<kj-badge>`, with the interactive states (selectable,
 * removable, group-coordinated) layered on top.
 *
 * Compose `<kj-tag-remove>` for the removable shape and wrap chips in
 * `<kj-tag-list>` for group keyboard / ARIA. Interactivity is conveyed via
 * the directive's host-bound `role` / `tabindex` / `aria-pressed`, never by
 * swapping the tag name.
 *
 * @example
 * ```html
 * <kj-tag kjVariant="primary">Acme</kj-tag>
 *
 * <kj-tag>
 *   Acme
 *   <kj-tag-remove>×</kj-tag-remove>
 * </kj-tag>
 *
 * <kj-tag kjTagSelectable [(kjTagSelected)]="on">Filter</kj-tag>
 * ```
 * @doc-example Default
 *   The default playground — a static decorative chip with `default` variant.
 *   @doc-file tag.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common tag usages — decorative chip, removable
 *   chip, selectable filter, and a tag list with arrow-key navigation.
 *   @doc-file tag.usage.example.ts
 * @doc-example Variants
 *   `default` / `secondary` / `success` / `warning` / `destructive` / `info` /
 *   `outline` / `ghost`. Match the tone to the data.
 *   @doc-file tag.variants.example.ts
 * @doc-example Sizes
 *   `xs` / `sm` / `md` / `lg` — `md` is the default density.
 *   @doc-file tag.sizes.example.ts
 * @doc-example Removable
 *   Project `<kj-tag-remove>` for a trailing dismiss button; `(kjTagRemoved)`
 *   fires when the user clicks it.
 *   @doc-file tag.removable.example.ts
 * @doc-example Selectable
 *   `kjTagSelectable` + `[(kjTagSelected)]` turns the tag into a toggle pill.
 *   @doc-file tag.selectable.example.ts
 * @doc-example Tag list
 *   Wrap chips in `<kj-tag-list>` for single-tab-stop + arrow-key navigation.
 *   @doc-file tag.list.example.ts
 *
 * @doc-keyboard
 *   Enter|Space — Activates a selectable tag; flips `aria-pressed`
 *   Delete      — Fires `kjTagRemoved` when the tag is removable
 *   ArrowKeys   — Move focus between tags when wrapped in `<kj-tag-list>`
 *   Tab         — Tags participate in the tab order only when interactive
 *
 * @doc-aria
 *   role           — Set by the headless directive: "button" when selectable,
 *                    "listitem" inside a tag-list, otherwise none (decorative)
 *   aria-pressed   — Reflected on selectable tags
 *   aria-disabled  — Reflected when `[kjTagDisabled]="true"`
 *   aria-label     — Auto-derived for the remove button as "Remove {label}"
 *   data-variant   — Mirrors the resolved variant for theme hooks
 *   data-size      — Mirrors the resolved size for theme hooks
 *
 * @doc-touch
 *   `md` (default) and `lg` meet WCAG 2.5.5 for the interactive surface. Use
 *   `xs` / `sm` only for purely decorative chips embedded in dense lists.
 *
 * @doc-a11y
 *   Decorative tags carry no role — they read as plain text to AT. Selectable
 *   tags adopt button semantics with `aria-pressed`. Removable tags expose a
 *   real `<button>` for the dismiss action so it lands in the tab order with
 *   the native focus ring.
 *
 * @doc-related badge,button-group,chip
 *
 * @doc-css-var
 *   --kj-tag-bg            — Background fill. Variant rules set this; override to brand-paint a one-off.
 *   --kj-tag-fg            — Foreground (label + icon) color. Resolved per variant.
 *   --kj-tag-border-color  — Border color. Outline variant sets this; others default to transparent.
 *   --kj-tag-radius        — Corner radius. Inherits --kj-radius-selector.
 *   --kj-tag-padding-x     — Horizontal padding. Sizes override.
 *   --kj-tag-padding-y     — Vertical padding. Sizes override.
 *   --kj-tag-font-size     — Font size. Sizes (xs/sm/md/lg) override.
 *   --kj-tag-gap           — Gap between label and trailing remove button.
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name tag
 * @doc-description Themed tag or chip with decorative, removable, and selectable variants for filters and labels.
 * @doc-is-main
 */
@Component({
  selector: 'kj-tag',
  standalone: true,
  // KjTag itself supplies KjVariant / KjSize / KjDisabled / KjFocusRing as
  // host directives + the `bindPresets(KJ_TAG_CONFIG)` providers. Composing
  // KjTag here cascades all of them onto the wrapper's host element.
  hostDirectives: [
    {
      directive: KjTag,
      inputs: [
        'kjTagSelectable',
        'kjTagSelected',
        'kjTagLabel',
        'kjTagDisabled',
      ],
      outputs: ['kjTagSelectedChange', 'kjTagRemoved'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './tag.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-tag',
    // The KjVariant / KjSize host directives nested inside KjTag set
    // [data-variant] / [data-size] on the same host element automatically.
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTagComponent {}

/**
 * Trailing remove button for `<kj-tag>`. Composes the headless `KjTagRemove`
 * directive (which itself composes `KjButton` for native button semantics,
 * ARIA-disabled, and the focus ring). Auto-derives an
 * `aria-label="Remove {label}"` from the parent tag's projected text;
 * override with `kjTagRemoveLabel`.
 * @doc
 * @doc-name tag
 */
@Component({
  selector: 'kj-tag-remove',
  standalone: true,
  imports: [KjIconDirective],
  hostDirectives: [
    {
      directive: KjTagRemove,
      inputs: ['kjTagRemoveLabel'],
    },
  ],
  template: `<ng-content><i kjIcon="x"></i></ng-content>`,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-tag-remove',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTagRemoveComponent {}

/**
 * Optional chip-group container. Provides the listbox / grid / group ARIA
 * wiring + roving tabindex via the headless `KjTagList` directive. Standalone
 * tags work without it; wrap chips in `<kj-tag-list>` whenever the group
 * needs a single tab stop and arrow-key navigation.
 * @doc
 * @doc-name tag
 */
@Component({
  selector: 'kj-tag-list',
  standalone: true,
  hostDirectives: [
    {
      directive: KjTagList,
      inputs: [
        'kjTagListRole',
        'kjTagListOrientation',
        'kjTagListMultiple',
        'kjTagListDisabled',
      ],
    },
  ],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-tag-list',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTagListComponent {}
