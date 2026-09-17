import { ElementRef, InjectionToken, Signal } from '@angular/core';

/** Accordion mode: `'single'` (one item open at a time) or `'multiple'` (any number open). */
export type KjAccordionType = 'single' | 'multiple';

/** Context interface for the root accordion directive. */
export interface KjAccordionContext {
  /** Set of currently open item values. */
  readonly openIds: Signal<ReadonlySet<string>>;
  /** Current mode: single or multiple. */
  readonly type: Signal<KjAccordionType>;
  /** Whether opt-in arrow-key roving navigation is enabled. */
  readonly arrowNavigation: Signal<boolean>;
  /** Toggle an item by its string value. In single mode, closes others first. */
  toggle(id: string): void;
  /** Whether the given item value is currently open. */
  isOpen(id: string): boolean;

  /** @internal Registered triggers, in DOM order. */
  readonly triggers: Signal<readonly KjAccordionTriggerRef[]>;
  /** @internal */ registerTrigger(trigger: KjAccordionTriggerRef): void;
  /** @internal */ unregisterTrigger(trigger: KjAccordionTriggerRef): void;
  /** @internal Move focus by `delta` among non-disabled triggers, wrapping. */
  focusTrigger(delta: number, fromIndex: number): void;
  /** @internal Focus the first / last non-disabled trigger. */
  focusEdge(edge: 'first' | 'last'): void;
}

/**
 * What the root needs from a registered trigger for the opt-in arrow-key
 * roving. Structural rather than `KjAccordionTrigger` so this file stays free
 * of directive imports and a child never has to cast the injected context
 * back to the concrete class (arch F-14).
 */
export interface KjAccordionTriggerRef {
  /** The trigger's host element — the focus target. */
  readonly el: ElementRef<HTMLElement>;
  /** The item the trigger belongs to; its `disabled` gates focus. */
  readonly item: KjAccordionItemContext;
}

/** Context interface for an individual accordion item directive. */
export interface KjAccordionItemContext {
  /** Stable string value identifying the item within the parent accordion. */
  readonly value: Signal<string>;
  /** Whether this item is currently expanded. */
  readonly expanded: Signal<boolean>;
  /** Whether this item is disabled (toggle is a no-op, trigger announces aria-disabled). */
  readonly disabled: Signal<boolean>;
  /** Stable id for the trigger element — `aria-labelledby` target on the content region. */
  readonly headerId: Signal<string>;
  /** Stable id for the content region — `aria-controls` target on the trigger. */
  readonly contentId: Signal<string>;
  /** Toggle this item's expanded state. No-op when disabled. */
  toggle(): void;
  /** Open this item. No-op when disabled. */
  open(): void;
  /** Close this item. No-op when disabled. */
  close(): void;
}

/** Injection token for the root accordion directive. */
export const KJ_ACCORDION = new InjectionToken<KjAccordionContext>('KjAccordion');

/** Injection token for an individual accordion item directive. */
export const KJ_ACCORDION_ITEM = new InjectionToken<KjAccordionItemContext>('KjAccordionItem');
