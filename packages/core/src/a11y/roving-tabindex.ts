import {
  Directive,
  ElementRef,
  InjectionToken,
  contentChildren,
  effect,
  inject,
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
 * @category Core/Accessibility
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
 * @category Core/Accessibility
 */
@Directive({
  selector: '[kjRovingTabindex]',
  standalone: true,
  providers: [{ provide: KJ_ROVING_TABINDEX, useExisting: KjRovingTabindex }],
  host: {
    '(keydown)': 'onKeydown($event)',
    '(focusin)': 'onFocusIn($event)',
  },
})
export class KjRovingTabindex {
  private readonly items = contentChildren(KjRovingTabindexItemDirective);
  private readonly activeIndex = signal(0);

  constructor() {
    effect(() => {
      const all = this.items();
      all.forEach((item, i) => item.active.set(i === this.activeIndex()));
    });
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

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (next + 1) % all.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
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
