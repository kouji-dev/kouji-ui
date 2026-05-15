import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjAccordion, KjAccordionItem, KjAccordionTrigger, KjAccordionContent } from '@kouji-ui/core';

/**
 * Root accordion container.
 *
 * Applies `KjAccordion` via `hostDirectives` so the `KJ_ACCORDION` provider lives
 * on the `<kj-accordion>` host element — projected `<kj-accordion-item>` children
 * find it in their element-injector chain.
 *
 * @doc-example Default
 *   The default playground — single-open accordion with two items.
 *   @doc-file accordion.default.example.ts
 * @doc-example Usage
 *   The common shape: labelled items, controlled value, and arrow-key
 *   navigation. Use this as the copy-paste starting point.
 *   @doc-file accordion.usage.example.ts
 * @doc-example Multiple open
 *   `type="multiple"` lets users expand several panels at once. Bind an array
 *   of open ids to `[(value)]`.
 *   @doc-file accordion.multiple.example.ts
 * @doc-example Disabled item
 *   Mark an item `disabled` to skip it in tab order and arrow navigation.
 *   @doc-file accordion.disabled.example.ts
 * @doc-example Rich content
 *   Project anything inside `<kj-accordion-content>` — paragraphs, lists, forms.
 *   @doc-file accordion.rich-content.example.ts
 * @doc-example Arrow navigation
 *   `arrowNavigation` enables APG roving focus across triggers.
 *   @doc-file accordion.arrow-nav.example.ts
 * @doc-example Controlled value
 *   Two-way bind `[(value)]` to drive open state from a signal or form.
 *   @doc-file accordion.value.example.ts
 *
 * @doc-keyboard
 *   Enter|Space   — Toggles the focused trigger's panel
 *   Tab           — Moves focus to the next trigger (default) or out of the accordion (roving mode)
 *   ArrowDown     — When `arrowNavigation`, moves focus to the next trigger (clamps at the end)
 *   ArrowUp       — When `arrowNavigation`, moves focus to the previous trigger (clamps at the start)
 *   Home          — When `arrowNavigation`, moves focus to the first trigger
 *   End           — When `arrowNavigation`, moves focus to the last trigger
 *
 * @doc-aria
 *   aria-expanded   — Reflected on each trigger; flips with the panel's open state
 *   aria-controls   — Trigger references its panel id
 *   aria-labelledby — Panel references its trigger id
 *   aria-disabled   — Reflected when an item is disabled
 *   role            — Panel host carries `region` so it's a navigable landmark
 *
 * @doc-css-var
 *   --kj-accordion-bg          — Background fill of the accordion shell. Inherits --kj-bg-body.
 *   --kj-accordion-border      — Border color around the shell and between items. Inherits --kj-border-default.
 *   --kj-accordion-radius      — Outer corner radius. Inherits --kj-radius-box.
 *
 * @doc-touch
 *   Triggers render real `<button>` elements that span the row width — easily
 *   clears WCAG 2.5.5 ≥ 44×44 on the default size.
 *
 * @doc-a11y
 *   Implements the WAI-ARIA APG Accordion pattern. Triggers are real
 *   `<button>` hosts (Enter / Space activation, native focus ring). Roving
 *   focus is opt-in via `arrowNavigation`; without it Tab walks through every
 *   trigger sequentially.
 *
 * @doc-related card,tabs,dropdown-menu
 *
 * @doc-category Library/Data display
 * @doc
 * @doc-name accordion
 * @doc-description Themed accordion for collapsible content sections with single or multi-open panels and keyboard navigation.
 * @doc-is-main
 */
@Component({
  selector: 'kj-accordion',
  standalone: true,
  hostDirectives: [{
    directive: KjAccordion,
    inputs: ['kjType: type', 'kjValue: value', 'kjArrowNavigation: arrowNavigation'],
    outputs: ['kjValueChange: valueChange'],
  }],
  template: `<ng-content />`,
  styleUrl: './accordion.css',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-accordion' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAccordionComponent {}

/**
 * Click target that toggles the parent item.
 * @doc
 * @doc-name accordion
 */
@Component({
  selector: 'kj-accordion-trigger',
  standalone: true,
  imports: [KjAccordionTrigger],
  template: `<button type="button" kjAccordionTrigger class="kj-accordion-trigger" [disabled]="disabled()" [attr.aria-disabled]="disabled() ? 'true' : null"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAccordionTriggerComponent {
  readonly disabled = input(false);
}

/**
 * Single accordion item. Bind a unique `value`.
 *
 * When `label` is provided the trigger is rendered internally — users only need
 * to project `<kj-accordion-content>`. When `label` is omitted, project a
 * `<kj-accordion-trigger>` manually for full control.
 * @doc
 * @doc-name accordion
 */
@Component({
  selector: 'kj-accordion-item',
  standalone: true,
  hostDirectives: [{
    directive: KjAccordionItem,
    inputs: ['kjItemValue: value', 'kjItemDisabled: disabled'],
  }],
  imports: [KjAccordionTriggerComponent],
  template: `
    @if (label()) {
      <kj-accordion-trigger [disabled]="disabled()">{{ label() }}</kj-accordion-trigger>
    }
    <ng-content />
  `,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-accordion-item' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAccordionItemComponent {
  readonly label = input<string | undefined>(undefined);
  readonly disabled = input(false);
}

/**
 * Body shown when the parent item is expanded.
 * @doc
 * @doc-name accordion
 */
@Component({
  selector: 'kj-accordion-content',
  standalone: true,
  imports: [KjAccordionContent],
  template: `<div kjAccordionContent class="kj-accordion-content"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAccordionContentComponent {}
