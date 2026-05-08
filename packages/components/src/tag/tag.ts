import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';
import { KjTag, KjTagList, KjTagRemove } from '@kouji-ui/core';

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
 *   @doc-file tag.example.ts
 * @doc-example Variants
 *   @doc-file tag.variants.example.ts
 * @doc-example Sizes
 *   @doc-file tag.sizes.example.ts
 * @doc-example Removable
 *   @doc-file tag.removable.example.ts
 * @doc-example Selectable
 *   @doc-file tag.selectable.example.ts
 * @doc-example Tag list
 *   @doc-file tag.list.example.ts
 * @category Library/Data display
 * @doc
 * @doc-name tag
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
  hostDirectives: [
    {
      directive: KjTagRemove,
      inputs: ['kjTagRemoveLabel'],
    },
  ],
  template: `<ng-content>×</ng-content>`,
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
