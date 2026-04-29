import { Directive, effect, inject, input } from '@angular/core';
import { CDK_ACCORDION, CdkAccordion, CdkAccordionItem } from '@angular/cdk/accordion';
import { KJ_ACCORDION, KJ_ACCORDION_ITEM } from './accordion.context';

/**
 * Root accordion container. Extends CDK `CdkAccordion` for multi/single item management.
 * Supports single or multiple expanded items.
 *
 * @example
 * ```html
 * <div kjAccordion [kjAccordionType]="'multiple'">
 *   <div kjAccordionItem [kjItemValue]="'item-1'">...</div>
 * </div>
 * ```
 * @category Core/Navigation/Accordion
 */
@Directive({
  selector: '[kjAccordion]',
  standalone: true,
  providers: [
    { provide: KJ_ACCORDION, useExisting: KjAccordionDirective },
    { provide: CDK_ACCORDION, useExisting: KjAccordionDirective },
  ],
})
export class KjAccordionDirective extends CdkAccordion {
  /** Whether multiple items can be open simultaneously. Defaults to `'single'`. */
  kjAccordionType = input<'single' | 'multiple'>('single');

  constructor() {
    super();
    effect(() => {
      this.multi = this.kjAccordionType() === 'multiple';
    });
  }
}

/**
 * Individual accordion item. Extends CDK `CdkAccordionItem`.
 * Manages expanded state via CDK's `UniqueSelectionDispatcher` for single-mode coordination.
 *
 * @example
 * ```html
 * <div kjAccordionItem [kjItemValue]="'section-1'">
 *   <button kjAccordionTrigger>Section 1</button>
 *   <div kjAccordionContent>Content</div>
 * </div>
 * ```
 * @category Core/Navigation/Accordion
 */
@Directive({
  selector: '[kjAccordionItem]',
  standalone: true,
  providers: [{ provide: KJ_ACCORDION_ITEM, useExisting: KjAccordionItemDirective }],
})
export class KjAccordionItemDirective extends CdkAccordionItem {
  /** The unique value identifying this item within the accordion. */
  kjItemValue = input.required<string>();

  /** Alias for `kjItemValue` signal, for consistent context access. */
  readonly itemValue = this.kjItemValue;
}

/**
 * Trigger button for an accordion item. Controls expand/collapse via CDK `toggle()`.
 * Sets `aria-expanded` and `data-open` attributes based on the item's expanded state.
 *
 * @example
 * ```html
 * <button kjAccordionTrigger>Section title</button>
 * ```
 * @category Core/Navigation/Accordion
 */
@Directive({
  selector: '[kjAccordionTrigger]',
  standalone: true,
  host: {
    '[attr.aria-expanded]': 'item.expanded.toString()',
    '[attr.data-open]': 'item.expanded ? "" : null',
    '(click)': 'item.toggle()',
  },
})
export class KjAccordionTriggerDirective {
  /** The parent accordion item context. */
  readonly item = inject(KJ_ACCORDION_ITEM) as KjAccordionItemDirective;
}

/**
 * Accordion content panel. Hidden when the parent item is collapsed.
 * Uses the `hidden` attribute for accessibility-compliant visibility.
 *
 * @example
 * ```html
 * <div kjAccordionContent>Panel content</div>
 * ```
 * @category Core/Navigation/Accordion
 */
@Directive({
  selector: '[kjAccordionContent]',
  standalone: true,
  host: {
    '[attr.hidden]': '!item.expanded ? "" : null',
  },
})
export class KjAccordionContentDirective {
  /** The parent accordion item context. */
  readonly item = inject(KJ_ACCORDION_ITEM) as KjAccordionItemDirective;
}
