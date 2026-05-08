import {
  DestroyRef,
  Directive,
  ElementRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import {
  KjDropdownMenuTrigger,
} from '../dropdown-menu/dropdown-menu-trigger';
import { KJ_MENUBAR } from './menubar.context';
import type { KjMenubarItemContext } from './menubar.context';

/**
 * A top-level item in a `[kjMenubar]` — `role="menuitem"` with
 * `aria-haspopup="menu"`. Composes the existing
 * `[kjDropdownMenuTriggerFor]` directive so the popup contract — open /
 * close, `aria-expanded`, `aria-controls`, focus restoration — is reused
 * unchanged. The bar item adds menubar-specific wiring on top:
 *
 * - registers / unregisters with the parent `[kjMenubar]` coordinator;
 * - participates in the bar's roving tabindex (only one bar item is
 *   tabbable at a time);
 * - reports its hover state to the bar so roll-over disclosure (auto-
 *   disclose) can transfer popup ownership without a click;
 * - reports its open / close transitions so the bar can track which popup
 *   is open and orchestrate cross-bar arrow navigation.
 *
 * Apply on a `<button type="button">` and forward
 * `[kjDropdownMenuTriggerFor]` to a `<ng-template>` containing a
 * `[kjDropdownMenu]` panel:
 *
 * ```html
 * <button kjMenubarItem [kjDropdownMenuTriggerFor]="fileMenu">File</button>
 *
 * <ng-template #fileMenu>
 *   <div kjDropdownMenu>
 *     <button kjDropdownMenuItem (kjSelect)="newFile()">New</button>
 *   </div>
 * </ng-template>
 * ```
 *
 * Disabled bar items still announce `aria-haspopup="menu"` (the popup
 * exists; it is currently inaccessible), matching the dropdown menu
 * trigger's contract for disabled buttons.
 *
 * @category Core/Navigation
 * @doc
 * @doc-name menubar
 */
@Directive({
  selector: '[kjMenubarItem]',
  standalone: true,
  exportAs: 'kjMenubarItem',
  hostDirectives: [
    {
      directive: KjDropdownMenuTrigger,
      inputs: [
        'kjDropdownMenuTriggerFor',
        'kjDisabled',
        'kjSide',
        'kjAlign',
        'kjOffset',
        'kjCloseOnSelect',
        'kjOpen',
      ],
      outputs: [
        'kjOpenChange',
        'kjMenuOpened',
        'kjMenuClosed',
      ],
    },
  ],
  host: {
    'role': 'menuitem',
    '[attr.tabindex]': 'tabIndexAttr()',
    '[attr.data-state]': 'trigger.open() ? "active" : "inactive"',
    '[attr.aria-disabled]': 'kjDisabled() ? "true" : null',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
    '(focus)': 'onFocus()',
  },
})
export class KjMenubarItem implements KjMenubarItemContext {
  /** @internal Available to host bindings. */
  protected readonly trigger = inject(KjDropdownMenuTrigger, { self: true });
  private readonly bar = inject(KJ_MENUBAR);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Disable the item. Reflects `aria-disabled`; popup never opens. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  // ── KjMenubarItemContext ─────────────────────────────────────────

  /** This item's host element. */
  get el(): HTMLElement {
    return this.elRef.nativeElement;
  }

  /** Disabled signal, for the bar coordinator. */
  readonly disabled = this.kjDisabled;

  /** Whether this item's popup is currently open. */
  readonly open = this.trigger.open;

  openPopup(focus: 'first' | 'last' | 'none'): void {
    if (this.kjDisabled()) return;
    this.trigger.show(this.el, focus);
  }

  closePopup(): void {
    this.trigger.hide('programmatic');
  }

  focusItem(): void {
    try {
      this.el.focus();
    } catch {
      /* element may be detached */
    }
  }

  // ── Roving tabindex attribute ────────────────────────────────────

  protected readonly tabIndexAttr = computed(() => {
    return (this.bar as unknown as {
      isActive(item: KjMenubarItemContext): boolean;
    }).isActive(this) ? '0' : '-1';
  });

  constructor() {
    this.bar.registerItem(this);

    // Mirror the trigger's open / close into the bar's open-item tracker.
    effect(() => {
      const isOpen = this.trigger.open();
      if (isOpen) {
        this.bar.notifyItemOpened(this);
      } else {
        this.bar.notifyItemClosed(this);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.bar.unregisterItem(this);
    });
  }

  // ── Pointer / focus host handlers ────────────────────────────────

  protected onPointerEnter(_event: PointerEvent): void {
    this.bar.notifyItemPointerEnter(this);
  }

  protected onPointerLeave(_event: PointerEvent): void {
    this.bar.notifyItemPointerLeave(this);
  }

  protected onFocus(): void {
    // Promote this item to the active member of the roving tabindex.
    // Read isActive via the bar context — `KjMenubar.isActive` updates the
    // signal on the next tick when the active index moves.
    const items = (this.bar as unknown as { items?: { (): KjMenubarItemContext[] } }).items;
    if (typeof items === 'function') {
      const idx = items().indexOf(this);
      if (idx >= 0) {
        // Set the bar's active index so other bar items become tabindex="-1".
        const active = (this.bar as unknown as { activeIndex?: { set(n: number): void } }).activeIndex;
        active?.set?.(idx);
      }
    }
  }
}
