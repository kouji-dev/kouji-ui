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
 *   @doc-file accordion.default.example.ts
 * @doc-example Multiple open
 *   @doc-file accordion.multiple.example.ts
 * @doc-example Disabled item
 *   @doc-file accordion.disabled.example.ts
 * @doc-example Rich content
 *   @doc-file accordion.rich-content.example.ts
 * @category Library/Data display
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
