import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { KjAccordion, KjAccordionItem, KjAccordionTrigger, KjAccordionContent } from '@kouji-ui/core';

/**
 * Root accordion container.
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
 */
@Component({
  selector: 'kj-accordion',
  standalone: true,
  imports: [KjAccordion],
  template: `<div kjAccordion [kjAccordionType]="type()" class="kj-accordion"><ng-content /></div>`,
  styleUrl: './accordion.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAccordionComponent {
  readonly type = input<'single' | 'multiple'>('single');
}

/** Single accordion item. Provide a unique `value`. */
@Component({
  selector: 'kj-accordion-item',
  standalone: true,
  imports: [KjAccordionItem],
  template: `<div kjAccordionItem [kjItemValue]="value()" class="kj-accordion-item"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAccordionItemComponent {
  readonly value = input.required<string>();
}

/** Click target that toggles the parent item. */
@Component({
  selector: 'kj-accordion-trigger',
  standalone: true,
  imports: [KjAccordionTrigger],
  template: `<button type="button" kjAccordionTrigger class="kj-accordion-trigger"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjAccordionTriggerComponent {}

/** Body shown when the parent item is expanded. */
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
