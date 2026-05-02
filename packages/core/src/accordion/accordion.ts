import { Directive, computed, inject, input, signal } from '@angular/core';
import { KJ_ACCORDION, KJ_ACCORDION_ITEM } from './accordion.context';

/**
 * Root accordion container. Manages open/close state for accordion items.
 * Supports `'single'` (only one item open) or `'multiple'` (any number open).
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
  providers: [{ provide: KJ_ACCORDION, useExisting: KjAccordion }],
})
export class KjAccordion {
  /** Whether multiple items can be open simultaneously. Defaults to `'single'`. */
  readonly kjAccordionType = input<'single' | 'multiple'>('single');

  private readonly _openIds = signal<ReadonlySet<string>>(new Set());
  /** Set of currently open item values. */
  readonly openIds = this._openIds.asReadonly();

  /** Toggles an item open or closed. In single mode, closes all others first. */
  toggle(id: string): void {
    this._openIds.update(ids => {
      const next = new Set(ids);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (this.kjAccordionType() === 'single') next.clear();
        next.add(id);
      }
      return next;
    });
  }

  /** Returns whether the given item value is currently open. */
  isOpen(id: string): boolean {
    return this._openIds().has(id);
  }
}

/**
 * Individual accordion item. Manages its own expanded state via the parent accordion context.
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
  providers: [{ provide: KJ_ACCORDION_ITEM, useExisting: KjAccordionItem }],
})
export class KjAccordionItem {
  private readonly accordion = inject(KJ_ACCORDION) as KjAccordion;

  /** The unique value identifying this item within the accordion. */
  readonly kjItemValue = input.required<string>();

  /** Whether this item is currently expanded. */
  readonly expanded = computed(() => this.accordion.isOpen(this.kjItemValue()));

  /** Toggles this item's expanded state. */
  toggle(): void { this.accordion.toggle(this.kjItemValue()); }

  /** Opens this item. */
  open(): void { if (!this.expanded()) this.toggle(); }

  /** Closes this item. */
  close(): void { if (this.expanded()) this.toggle(); }
}

/**
 * Trigger button for an accordion item. Controls expand/collapse.
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
    '[attr.aria-expanded]': 'item.expanded().toString()',
    '[attr.data-open]': 'item.expanded() ? "" : null',
    '(click)': 'item.toggle()',
  },
})
export class KjAccordionTrigger {
  /** The parent accordion item context. */
  readonly item = inject(KJ_ACCORDION_ITEM);
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
    '[attr.hidden]': '!item.expanded() ? "" : null',
  },
})
export class KjAccordionContent {
  /** The parent accordion item context. */
  readonly item = inject(KJ_ACCORDION_ITEM);
}
