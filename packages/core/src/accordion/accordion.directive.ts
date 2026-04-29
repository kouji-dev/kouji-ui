import { Directive, computed, inject, input, signal } from '@angular/core';
import { KJ_ACCORDION, KJ_ACCORDION_ITEM, KjAccordionContext, KjAccordionItemContext } from './accordion.context';

/**
 * Root accordion container. Manages open items.
 * @example `<div kjAccordion [kjAccordionType]="'single'">...</div>`
 */
@Directive({ selector: '[kjAccordion]', standalone: true, providers: [{ provide: KJ_ACCORDION, useExisting: KjAccordionDirective }] })
export class KjAccordionDirective implements KjAccordionContext {
  kjAccordionType = input<'single' | 'multiple'>('single');
  private readonly _openItems = signal<Set<string>>(new Set());
  readonly openItems = this._openItems.asReadonly();
  toggle(value: string): void {
    this._openItems.update(items => {
      const next = new Set(items);
      if (next.has(value)) { next.delete(value); } else { if (this.kjAccordionType() === 'single') next.clear(); next.add(value); }
      return next;
    });
  }
}

/** Individual accordion item. */
@Directive({ selector: '[kjAccordionItem]', standalone: true, providers: [{ provide: KJ_ACCORDION_ITEM, useExisting: KjAccordionItemDirective }] })
export class KjAccordionItemDirective implements KjAccordionItemContext {
  private readonly accordion = inject(KJ_ACCORDION);
  kjItemValue = input.required<string>();
  readonly itemValue = this.kjItemValue;
  readonly open = computed(() => this.accordion.openItems().has(this.kjItemValue()));
}

/**
 * Trigger button for accordion item.
 * @example `<button kjAccordionTrigger>Section</button>`
 */
@Directive({ selector: '[kjAccordionTrigger]', standalone: true, host: { '[attr.aria-expanded]': 'item.open().toString()', '[attr.data-open]': 'item.open() ? "" : null', '(click)': 'toggle()' } })
export class KjAccordionTriggerDirective {
  readonly item = inject(KJ_ACCORDION_ITEM);
  private readonly accordion = inject(KJ_ACCORDION);
  toggle(): void { this.accordion.toggle(this.item.itemValue()); }
}

/**
 * Accordion content panel. Hidden when collapsed.
 * @example `<div kjAccordionContent>Content</div>`
 */
@Directive({ selector: '[kjAccordionContent]', standalone: true, host: { '[attr.hidden]': '!item.open() ? "" : null' } })
export class KjAccordionContentDirective { readonly item = inject(KJ_ACCORDION_ITEM); }
