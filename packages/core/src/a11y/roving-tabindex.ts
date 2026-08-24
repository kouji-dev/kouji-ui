import {
  DestroyRef,
  Directive,
  ElementRef,
  InjectionToken,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';

/** Context token for roving tabindex coordination. */
export const KJ_ROVING_TABINDEX = new InjectionToken<KjRovingTabindex>(
  'KjRovingTabindex',
);

/**
 * Marks an individual item within a `[kjRovingTabindex]` container.
 * Its `tabindex` is managed automatically by the parent directive.
 *
 * @example
 * ```html
 * <button kjRovingTabindexItem>Item</button>
 * ```
 * @doc-category Core/Accessibility
 * @doc
 * @doc-name a11y
 */
@Directive({
  selector: '[kjRovingTabindexItem]',
  standalone: true,
  host: {
    '[attr.tabindex]': 'active() ? "0" : "-1"',
  },
})
export class KjRovingTabindexItemDirective {
  /** @internal */
  readonly el = inject(ElementRef<HTMLElement>);
  /** @internal */
  readonly active = signal(false);

  constructor() {
    // Registration is by DI, NOT by a content query on the container: a styled
    // wrapper (`<kj-tab>`) renders its item inside its OWN view, and a content
    // query cannot cross that boundary. Querying left every item at
    // tabindex="-1" whenever the wrappers were used — i.e. in every app — so
    // the tab strip could not be reached by keyboard at all.
    const parent = inject(KJ_ROVING_TABINDEX, { optional: true });
    if (!parent) return;
    parent.register(this);
    inject(DestroyRef).onDestroy(() => parent.unregister(this));
  }
}

/**
 * Implements the roving tabindex pattern for composite widgets such as toolbars and tab lists.
 * Only one item has `tabindex="0"` at a time; arrow keys move focus between items.
 *
 * @example
 * ```html
 * <div kjRovingTabindex role="toolbar" aria-label="Formatting">
 *   <button kjRovingTabindexItem>Bold</button>
 *   <button kjRovingTabindexItem>Italic</button>
 * </div>
 * ```
 * @doc-category Core/Accessibility
 * @doc
 * @doc-name a11y
 */
@Directive({
  selector: '[kjRovingTabindex]',
  standalone: true,
  providers: [{ provide: KJ_ROVING_TABINDEX, useExisting: forwardRef(() => KjRovingTabindex) }],
  host: {
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn($event)',
  },
})
export class KjRovingTabindex {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly registered = signal<readonly KjRovingTabindexItemDirective[]>([]);
  /** Items in DOM order — registration order follows creation, which a
   *  re-order (`@for` with a changing track) does not preserve. */
  private readonly items = computed(() =>
    [...this.registered()].sort((a, b) =>
      a.el.nativeElement.compareDocumentPosition(b.el.nativeElement) &
      Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1,
    ),
  );
  private readonly activeIndex = signal(0);

  /** @internal */
  register(item: KjRovingTabindexItemDirective): void {
    this.registered.update((all) => [...all, item]);
  }

  /** @internal */
  unregister(item: KjRovingTabindexItemDirective): void {
    this.registered.update((all) => all.filter((i) => i !== item));
  }

  /**
   * Restricts arrow-key navigation to a single axis.
   * - `'horizontal'`: only ArrowLeft / ArrowRight move focus.
   * - `'vertical'`: only ArrowUp / ArrowDown move focus.
   * - `'both'`: all four arrow keys move focus (default — preserves prior behaviour).
   *
   * Under `'horizontal'`, ArrowLeft / ArrowRight are swapped when the host
   * element resolves to `dir="rtl"`.
   */
  readonly kjRovingOrientation = input<'horizontal' | 'vertical' | 'both'>('both');

  constructor() {
    effect(() => {
      const all = this.items();
      all.forEach((item, i) => item.active.set(i === this.activeIndex()));
    });
  }

  private resolveRtl(): boolean {
    const el = this.host.nativeElement;
    if (typeof getComputedStyle === 'function') {
      const direction = getComputedStyle(el).direction;
      if (direction === 'rtl') return true;
      if (direction === 'ltr') {
        // Some test environments (jsdom) return the default 'ltr' even when an
        // ancestor sets `dir="rtl"`. Fall through to attribute lookup.
      }
    }
    const dirHost = el.closest('[dir]') as HTMLElement | null;
    return dirHost?.dir.toLowerCase() === 'rtl';
  }

  /** @internal — syncs activeIndex when focus moves into an item programmatically */
  onFocusIn(event: FocusEvent): void {
    const all = this.items();
    const idx = all.findIndex((item) => item.el.nativeElement === event.target);
    if (idx !== -1) {
      this.activeIndex.set(idx);
    }
  }

  /** @internal */
  onKeydown(event: KeyboardEvent): void {
    const all = this.items();
    if (!all.length) return;
    let next = this.activeIndex();

    const orientation = this.kjRovingOrientation();
    const horizontalActive = orientation === 'horizontal' || orientation === 'both';
    const verticalActive = orientation === 'vertical' || orientation === 'both';

    // Resolve directionality lazily; only matters when horizontal arrows are active.
    // Prefer computed style; fall back to the nearest `dir` attribute (jsdom does
    // not propagate ancestor `dir` to computed style in all cases).
    const isRtl = horizontalActive && this.resolveRtl();
    const forwardKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const backwardKey = isRtl ? 'ArrowRight' : 'ArrowLeft';

    if (horizontalActive && event.key === forwardKey) {
      next = (next + 1) % all.length;
    } else if (horizontalActive && event.key === backwardKey) {
      next = (next - 1 + all.length) % all.length;
    } else if (verticalActive && event.key === 'ArrowDown') {
      next = (next + 1) % all.length;
    } else if (verticalActive && event.key === 'ArrowUp') {
      next = (next - 1 + all.length) % all.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = all.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    this.activeIndex.set(next);
    all[next].el.nativeElement.focus();
  }
}
