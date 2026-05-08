import {
  Directive,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { KjRovingTabindexItemDirective } from '../a11y/roving-tabindex';
import {
  KJ_DROPDOWN_MENU,
  type KjDropdownMenuContext,
} from './dropdown-menu-trigger';

/**
 * An individual item inside a `[kjDropdownMenu]` panel.
 *
 * Apply on a `<button>`. Sets `role="menuitem"` and participates in the
 * panel's roving tabindex via `[kjRovingTabindexItem]` (composed as a host
 * directive so consumers don't have to apply it).
 *
 * Activation:
 *
 * - Click / Enter / Space activates the item.
 * - Closes the parent menu unless `kjCloseOnSelect="false"` (defaults to the
 *   menu root's `kjCloseOnSelect`, which itself defaults to `true`).
 * - If `kjDisabled=true`, click events are intercepted in the capture phase
 *   and suppressed before any consumer template-bound listener fires
 *   (mirrors `KjButton`'s a11y stance — ARIA-disabled, not native).
 *
 * @category Core/Actions
 */
@Directive({
  selector: '[kjDropdownMenuItem]',
  standalone: true,
  hostDirectives: [KjRovingTabindexItemDirective],
  host: {
    'role': 'menuitem',
    '[attr.aria-disabled]': 'kjDisabled() ? "true" : null',
    '[attr.data-disabled]': 'kjDisabled() ? "" : null',
    '(click)': 'onActivate($event)',
    '(keydown.enter)': 'onKeyActivate($event)',
    '(keydown.space)': 'onKeyActivate($event)',
  },
})
export class KjDropdownMenuItem {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Parent menu context. */
  private readonly ctx = inject<KjDropdownMenuContext>(KJ_DROPDOWN_MENU);

  /** Disables the item. ARIA-disabled, not native. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /**
   * Whether to close the menu after activation. When `undefined`, inherits
   * `kjCloseOnSelect` from the menu root. Defaults to `undefined`.
   */
  readonly kjCloseOnSelect = input<boolean | undefined>(undefined);

  /** Emitted when the item is activated (click / Enter / Space). */
  readonly kjSelect = output<void>();

  /** Effective close-on-select — own input wins, then root default. */
  protected readonly effectiveCloseOnSelect = computed(() => {
    const own = this.kjCloseOnSelect();
    if (own !== undefined) return own;
    return this.ctx.closeOnSelect();
  });

  constructor() {
    afterNextRender(() => {
      this.el.nativeElement.addEventListener(
        'click',
        (event: Event) => {
          if (this.kjDisabled()) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
        },
        { capture: true },
      );
    });
  }

  protected onActivate(event: MouseEvent): void {
    if (this.kjDisabled()) return;
    event.stopPropagation();
    this.kjSelect.emit();
    if (this.effectiveCloseOnSelect()) {
      this.ctx.hide('item');
    }
  }

  protected onKeyActivate(event: Event): void {
    if (this.kjDisabled()) return;
    const tag = (event.currentTarget as HTMLElement | null)?.tagName.toLowerCase();
    if (tag === 'button') {
      // Native button — Enter/Space already triggers click. Don't double-fire.
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.kjSelect.emit();
    if (this.effectiveCloseOnSelect()) {
      this.ctx.hide('item');
    }
  }
}
