import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  Signal,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import {
  KJ_ACCORDION,
  KJ_ACCORDION_ITEM,
  KjAccordionContext,
  KjAccordionItemContext,
  KjAccordionType,
} from './accordion.context';

let kjAccordionSeedCounter = 0;
function nextSeed(): string {
  // Try crypto.randomUUID where available (browser, jsdom 22+, node 19+).
  // Fall back to a counter so SSR / older environments still produce a stable string.
  const cryptoLike = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoLike?.randomUUID) return cryptoLike.randomUUID().slice(0, 8);
  return `kj${(++kjAccordionSeedCounter).toString(36)}`;
}

/**
 * Root accordion container. Manages open/close state for accordion items.
 * Supports `'single'` (only one item open) or `'multiple'` (any number open).
 *
 * Two-way bound `kjValue` mirrors the open set as a string (single mode) or
 * `string[]` (multiple mode). Internally the directive keeps a single
 * `ReadonlySet<string>` so single ↔ multiple flips don't lose state.
 *
 * Arrow-key roving navigation is opt-in via `kjArrowNavigation`; when enabled
 * the root listens for ArrowUp/ArrowDown/Home/End on registered triggers and
 * moves focus between them. When disabled (the default) each trigger is a
 * plain button in the page tab sequence — the WAI-ARIA APG-recommended
 * arrangement for FAQ-style content.
 *
 * @example
 * ```html
 * <div kjAccordion [(kjValue)]="open" kjType="multiple">
 *   <div kjAccordionItem kjItemValue="billing">
 *     <button kjAccordionTrigger>Billing</button>
 *     <div kjAccordionContent>...</div>
 *   </div>
 * </div>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name accordion
 * @doc-description Unstyled accordion root that manages expand/collapse state across child accordion items.
 * @doc-is-main
 */
@Directive({
  selector: '[kjAccordion]',
  standalone: true,
  providers: [{ provide: KJ_ACCORDION, useExisting: KjAccordion }],
  host: {
    '[attr.data-orientation]': '"vertical"',
  },
})
export class KjAccordion implements KjAccordionContext {
  /** Mode: `'single'` (one open at a time) or `'multiple'` (any number open). */
  readonly kjType = input<KjAccordionType>('single');

  /**
   * Two-way bound open value. In `'single'` mode it is a string (the open
   * item's value, or `''` when nothing is open); in `'multiple'` mode it is a
   * `string[]` (open item values, in insertion order).
   */
  readonly kjValue = model<string | string[]>('');

  /**
   * Opt-in roving tabindex on triggers. When `true`, ArrowUp/ArrowDown/Home/End
   * move focus between triggers and the group becomes a single tab stop.
   * When `false` (default), each trigger is a plain button in the page tab
   * sequence — the simpler arrangement for FAQ-style content where Tab also
   * needs to reach links and form fields inside an open panel.
   */
  readonly kjArrowNavigation = input(false, { transform: booleanAttribute });

  private readonly _openIds = signal<ReadonlySet<string>>(new Set());
  /** Set of currently open item values. */
  readonly openIds = this._openIds.asReadonly();

  /** Read-only view of `kjType` for context consumers. */
  readonly type: Signal<KjAccordionType> = this.kjType;

  /** Read-only view of `kjArrowNavigation` for context consumers. */
  readonly arrowNavigation: Signal<boolean> = this.kjArrowNavigation;

  /** @internal Registered triggers in document order — for arrow-key roving. */
  private readonly _triggers = signal<readonly KjAccordionTrigger[]>([]);

  /** Public read-only registration list, in document order. */
  readonly triggers = this._triggers.asReadonly();

  constructor() {
    // Reconcile incoming kjValue → internal _openIds (controlled binding).
    effect(() => {
      const v = this.kjValue();
      const next = new Set<string>();
      if (typeof v === 'string') {
        if (v) next.add(v);
      } else if (Array.isArray(v)) {
        for (const id of v) if (id) next.add(id);
      }
      // In single mode, only first wins.
      if (this.kjType() === 'single' && next.size > 1) {
        const [first] = next;
        next.clear();
        next.add(first);
      }
      // Avoid set-equal write loops with the toggle path.
      const current = untracked(this._openIds);
      if (!setsEqual(current, next)) this._openIds.set(next);
    });
  }

  /** Toggles an item open or closed. In single mode, closes all others first. */
  toggle(id: string): void {
    const next = new Set(this._openIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (this.kjType() === 'single') next.clear();
      next.add(id);
    }
    this._openIds.set(next);
    this.syncModelFromSet(next);
  }

  /** Returns whether the given item value is currently open. */
  isOpen(id: string): boolean {
    return this._openIds().has(id);
  }

  /** @internal Trigger registration — called from `KjAccordionTrigger.ngOnInit`. */
  registerTrigger(t: KjAccordionTrigger): void {
    this._triggers.update((list) => (list.includes(t) ? list : [...list, t]));
  }

  /** @internal Trigger un-registration — called from `KjAccordionTrigger.ngOnDestroy`. */
  unregisterTrigger(t: KjAccordionTrigger): void {
    this._triggers.update((list) => list.filter((x) => x !== t));
  }

  /** @internal Move focus by delta among non-disabled triggers. */
  focusTrigger(delta: number, fromIndex: number): void {
    const list = this._triggers();
    if (!list.length) return;
    const len = list.length;
    let i = fromIndex;
    for (let step = 0; step < len; step++) {
      i = (i + delta + len) % len;
      const t = list[i];
      if (!t.item.disabled()) {
        t.el.nativeElement.focus();
        return;
      }
    }
  }

  /** @internal Focus first / last non-disabled trigger. */
  focusEdge(edge: 'first' | 'last'): void {
    const list = this._triggers();
    if (!list.length) return;
    const range = edge === 'first' ? list : [...list].reverse();
    for (const t of range) {
      if (!t.item.disabled()) {
        t.el.nativeElement.focus();
        return;
      }
    }
  }

  private syncModelFromSet(set: ReadonlySet<string>): void {
    if (this.kjType() === 'single') {
      const first = set.values().next().value ?? '';
      const current = this.kjValue();
      if (typeof current === 'string') {
        if (current !== first) this.kjValue.set(first);
      } else {
        this.kjValue.set(first);
      }
    } else {
      const arr = Array.from(set);
      const current = this.kjValue();
      if (Array.isArray(current) && arraysEqual(current, arr)) return;
      this.kjValue.set(arr);
    }
  }
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Individual accordion item. Owns the per-item `value`, `expanded` state, and
 * the stable `headerId` / `contentId` pair the trigger and content use to wire
 * `aria-controls` / `aria-labelledby`.
 *
 * @example
 * ```html
 * <div kjAccordionItem kjItemValue="section-1">
 *   <button kjAccordionTrigger>Section 1</button>
 *   <div kjAccordionContent>Content</div>
 * </div>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name accordion
 */
@Directive({
  selector: '[kjAccordionItem]',
  standalone: true,
  providers: [{ provide: KJ_ACCORDION_ITEM, useExisting: KjAccordionItem }],
  host: {
    '[attr.data-state]': 'expanded() ? "open" : "closed"',
    '[attr.data-disabled]': 'kjItemDisabled() ? "" : null',
  },
})
export class KjAccordionItem implements KjAccordionItemContext {
  private readonly accordion = inject(KJ_ACCORDION) as KjAccordion;

  /** The unique value identifying this item within the accordion. */
  readonly kjItemValue = input.required<string>();

  /**
   * Whether this item is disabled. Gates `toggle`/`open`/`close`, drives
   * `aria-disabled` on the trigger and `data-disabled` on the item host.
   */
  readonly kjItemDisabled = input(false, { transform: booleanAttribute });

  private readonly idSeed = nextSeed();

  /** Stable id for the trigger element. */
  readonly headerId = computed(() => `kj-accordion-trigger-${this.kjItemValue()}-${this.idSeed}`);

  /** Stable id for the content region element. */
  readonly contentId = computed(() => `kj-accordion-content-${this.kjItemValue()}-${this.idSeed}`);

  /** Read-only mirror of the item value for context consumers. */
  readonly value: Signal<string> = this.kjItemValue;

  /** Read-only mirror of the disabled flag for context consumers. */
  readonly disabled: Signal<boolean> = this.kjItemDisabled;

  /** Whether this item is currently expanded. */
  readonly expanded = computed(() => this.accordion.isOpen(this.kjItemValue()));

  /** Toggles this item's expanded state. No-op when disabled. */
  toggle(): void {
    if (this.kjItemDisabled()) return;
    this.accordion.toggle(this.kjItemValue());
  }

  /** Opens this item. No-op when disabled. */
  open(): void {
    if (this.kjItemDisabled()) return;
    if (!this.expanded()) this.accordion.toggle(this.kjItemValue());
  }

  /** Closes this item. No-op when disabled. */
  close(): void {
    if (this.kjItemDisabled()) return;
    if (this.expanded()) this.accordion.toggle(this.kjItemValue());
  }
}

/**
 * Trigger button for an accordion item. Wires `aria-expanded`, `aria-controls`,
 * `aria-disabled`, and the click toggle. Also provides Enter / Space / arrow
 * key handling — arrow keys are gated on the root's `kjArrowNavigation` flag.
 *
 * The host element should be a `<button>` per WAI-ARIA APG so Enter / Space
 * activation, focus, and disabled semantics work without extra wiring.
 *
 * @example
 * ```html
 * <button kjAccordionTrigger>Section title</button>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name accordion
 */
@Directive({
  selector: '[kjAccordionTrigger]',
  standalone: true,
  host: {
    '[attr.id]': 'item.headerId()',
    '[attr.aria-expanded]': 'item.expanded() ? "true" : "false"',
    '[attr.aria-controls]': 'item.contentId()',
    '[attr.aria-disabled]': 'item.disabled() ? "true" : null',
    '[attr.data-state]': 'item.expanded() ? "open" : "closed"',
    '[attr.data-open]': 'item.expanded() ? "" : null',
    '[attr.data-disabled]': 'item.disabled() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjAccordionTrigger implements OnInit, OnDestroy {
  /** The parent accordion item context. */
  readonly item = inject(KJ_ACCORDION_ITEM) as KjAccordionItem;
  private readonly accordion = inject(KJ_ACCORDION) as KjAccordion;
  /** @internal Native host element. */
  readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  ngOnInit(): void {
    this.accordion.registerTrigger(this);
  }

  ngOnDestroy(): void {
    this.accordion.unregisterTrigger(this);
  }

  /** @internal Click handler. */
  onClick(): void {
    if (this.item.disabled()) return;
    this.item.toggle();
  }

  /** @internal Keydown handler — arrow-nav opt-in via `kjArrowNavigation` on the root. */
  onKeydown(event: KeyboardEvent): void {
    if (!this.accordion.arrowNavigation()) return;
    const list = this.accordion.triggers();
    const idx = list.indexOf(this);
    if (idx === -1) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.accordion.focusTrigger(1, idx);
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.accordion.focusTrigger(-1, idx);
        return;
      case 'Home':
        event.preventDefault();
        this.accordion.focusEdge('first');
        return;
      case 'End':
        event.preventDefault();
        this.accordion.focusEdge('last');
        return;
    }
  }
}

/**
 * Accordion content panel. Hosts `role="region"` + `aria-labelledby` to the
 * trigger's id. Visibility is signalled via `[data-state]` (`"open"` /
 * `"closed"`) so consumers can CSS-animate the open/close transition. While
 * closed, `aria-hidden="true"` and `inert` keep the panel out of the AT tree
 * and tab sequence — the element stays in the DOM rather than being removed
 * with `hidden`, which would interrupt the animation.
 *
 * @example
 * ```html
 * <div kjAccordionContent>Panel content</div>
 * ```
 * @doc-category Core/Data display
 * @doc
 * @doc-name accordion
 */
@Directive({
  selector: '[kjAccordionContent]',
  standalone: true,
  host: {
    '[attr.role]': '"region"',
    '[attr.id]': 'item.contentId()',
    '[attr.aria-labelledby]': 'item.headerId()',
    '[attr.data-state]': 'item.expanded() ? "open" : "closed"',
    // `aria-hidden` keeps the closed panel out of the AT tree while leaving
    // the element in the DOM so CSS can animate its open/close transition
    // (driven by [data-state]). The visual hide is owned by the component CSS.
    '[attr.aria-hidden]': '!item.expanded() ? "true" : null',
    '[attr.inert]': '!item.expanded() ? "" : null',
  },
})
export class KjAccordionContent {
  /** The parent accordion item context. */
  readonly item = inject(KJ_ACCORDION_ITEM);
}
