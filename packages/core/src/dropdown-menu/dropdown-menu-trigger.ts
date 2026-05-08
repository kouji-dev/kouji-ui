import {
  DestroyRef,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  PLATFORM_ID,
  TemplateRef,
  ViewContainerRef,
  afterNextRender,
  booleanAttribute,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  KJ_DROPDOWN_MENU,
  type KjDropdownMenuAlign,
  type KjDropdownMenuCloseReason,
  type KjDropdownMenuContext,
  type KjDropdownMenuSide,
  nextDropdownMenuPanelId,
} from './dropdown-menu.context';

/**
 * The button that opens a dropdown menu.
 *
 * Place on a `<button>` (or any focusable element with `tabindex="0"`) and
 * point it at a `<ng-template>` containing a `[kjDropdownMenu]` panel:
 *
 * ```html
 * <button kjButton [kjDropdownMenuTriggerFor]="menuTpl">Actions</button>
 * <ng-template #menuTpl>
 *   <div kjDropdownMenu>
 *     <button kjDropdownMenuItem>Profile</button>
 *     <button kjDropdownMenuItem>Settings</button>
 *   </div>
 * </ng-template>
 * ```
 *
 * Wires `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` on the host.
 * Owns the open / close state and the keyboard contract for opening:
 *
 * - `Click` / `Enter` / `Space` — toggle open; on open, focus moves to the
 *   first item.
 * - `ArrowDown` — open + focus first item.
 * - `ArrowUp` — open + focus last item.
 *
 * Closes via Escape, click-outside, item activation, or Tab — see
 * `[kjDropdownMenu]` for the panel-side keyboard contract. Focus is restored
 * to the trigger on close (except for click-outside / Tab).
 *
 * The trigger directive does **not** compose `KjButton` — it is meant to sit
 * on whatever the consumer already put the trigger on (commonly a button
 * wrapper or `[kjButton]`). It contributes only ARIA + keyboard wiring.
 *
 * @category Core/Actions
 * @doc
 * @doc-name dropdown-menu
 */
@Directive({
  selector: '[kjDropdownMenuTriggerFor]',
  standalone: true,
  exportAs: 'kjDropdownMenuTrigger',
  providers: [
    { provide: KJ_DROPDOWN_MENU, useExisting: KjDropdownMenuTrigger },
  ],
  host: {
    '[attr.aria-haspopup]': '"menu"',
    '[attr.aria-expanded]': 'open()',
    '[attr.aria-controls]': 'panelId',
    '[attr.aria-disabled]': 'kjDisabled() ? "true" : null',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class KjDropdownMenuTrigger implements KjDropdownMenuContext {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly vcr = inject(ViewContainerRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  /** The `<ng-template>` containing the `[kjDropdownMenu]` panel. */
  readonly kjDropdownMenuTriggerFor = input.required<TemplateRef<unknown>>();

  /** Suppresses opening entirely. Reflects `aria-disabled`. */
  readonly kjDisabled = input(false, { transform: booleanAttribute });

  /** Preferred panel side. */
  readonly kjSide = input<KjDropdownMenuSide>('bottom');

  /** Cross-axis alignment. */
  readonly kjAlign = input<KjDropdownMenuAlign>('start');

  /** Pixel gap between trigger and panel. */
  readonly kjOffset = input<number>(4);

  /** Whether item activation closes the menu by default. */
  readonly kjCloseOnSelect = input(true, { transform: booleanAttribute });

  /** Two-way bindable open state. */
  readonly kjOpen = model<boolean>(false);

  /** Convenience event paired with the `kjOpen` model. */
  readonly kjOpenChange = output<boolean>();

  /** Emitted when the menu opens. */
  readonly kjMenuOpened = output<void>();

  /** Emitted when the menu closes, with the reason. */
  readonly kjMenuClosed = output<KjDropdownMenuCloseReason>();

  // ── KjDropdownMenuContext ──────────────────────────────────────────

  private readonly _open = signal(false);
  /** Reactive open state. */
  readonly open = this._open.asReadonly();

  /** Stable panel id used as `aria-controls` and `id` on the panel. */
  readonly panelId = nextDropdownMenuPanelId();

  /** Context mirrors — InputSignals satisfy `Signal<T>`. */
  readonly side = this.kjSide;
  readonly align = this.kjAlign;
  readonly offset = this.kjOffset;
  readonly closeOnSelect = this.kjCloseOnSelect;

  private readonly _trigger = signal<HTMLElement | null>(null);
  readonly triggerElement = this._trigger.asReadonly();

  /** Focus directive used by the panel after opening; set by `show()`. */
  private _pendingFocus: 'first' | 'last' | 'none' = 'first';
  /** @internal Read by the panel directive on mount. */
  consumePendingFocus(): 'first' | 'last' | 'none' {
    const f = this._pendingFocus;
    this._pendingFocus = 'first';
    return f;
  }

  /** The currently stamped template view (when open). */
  private templateView: EmbeddedViewRef<unknown> | null = null;

  /**
   * Walks past `display: contents` ancestors to find the first descendant with
   * a real layout box — required so positioning math has a non-zero rect.
   */
  private resolveAnchor(el: HTMLElement | null): HTMLElement | null {
    if (!el || typeof window === 'undefined') return el;
    if (getComputedStyle(el).display !== 'contents') return el;
    let cur: Element | null = el.firstElementChild;
    while (cur) {
      if (getComputedStyle(cur as HTMLElement).display !== 'contents') return cur as HTMLElement;
      cur = cur.firstElementChild ?? cur.nextElementSibling;
    }
    return el;
  }

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Initial best-effort capture; refined by afterNextRender once the
      // projected child element exists in the DOM (wrappers using
      // `display: contents` have no firstElementChild at constructor time).
      this._trigger.set(this.el.nativeElement);
      afterNextRender(() => {
        const anchor = this.resolveAnchor(this.el.nativeElement);
        if (anchor) this._trigger.set(anchor);
      });
    }

    // Stamp / unstamp the panel template based on the open state. The panel
    // template — provided as `<ng-template>` via `[kjDropdownMenuTriggerFor]`
    // — must be instantiated for `[kjDropdownMenu]` (the inner attribute
    // directive) to come into existence. On close, the embedded view is
    // destroyed so the directive's `DestroyRef.onDestroy` runs and tears
    // down its overlay registration cleanly.
    effect(() => {
      const isOpen = this._open();
      const tpl = this.kjDropdownMenuTriggerFor();
      if (isOpen && tpl && !this.templateView) {
        // Pass the trigger's own injector so descendants of the projected
        // template inject KJ_DROPDOWN_MENU from this trigger.
        this.templateView = tpl.createEmbeddedView(null as never, this.vcr.injector);
        this.vcr.insert(this.templateView);
        this.templateView.detectChanges();
      } else if (!isOpen && this.templateView) {
        try {
          this.templateView.destroy();
        } catch {
          /* ignore */
        }
        this.templateView = null;
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.templateView) {
        try {
          this.templateView.destroy();
        } catch {
          /* ignore */
        }
        this.templateView = null;
      }
      if (this._open()) {
        this._open.set(false);
      }
    });
  }

  // ── Mutations ──────────────────────────────────────────────────────

  show(invoker: HTMLElement | null, focus: 'first' | 'last' | 'none' = 'first'): void {
    if (this.kjDisabled()) return;
    if (this._open()) return;
    this._pendingFocus = focus;
    if (invoker) {
      // Resolve display:contents wrappers to a real-box descendant so the
      // panel anchors to the visible element, not a zero-rect host.
      const anchor = this.resolveAnchor(invoker) ?? invoker;
      this._trigger.set(anchor);
    }
    this._open.set(true);
    this.kjOpen.set(true);
    this.kjOpenChange.emit(true);
    this.kjMenuOpened.emit();
  }

  hide(reason: KjDropdownMenuCloseReason): void {
    if (!this._open()) return;
    this._open.set(false);
    this.kjOpen.set(false);
    this.kjOpenChange.emit(false);
    this.kjMenuClosed.emit(reason);

    // Focus restoration: not for click-outside / tab — natural focus follows.
    if (reason !== 'click-outside' && reason !== 'tab') {
      const target = this._trigger();
      if (target) {
        try {
          target.focus();
        } catch {
          /* element may be detached */
        }
      }
    }
  }

  toggle(invoker: HTMLElement | null): void {
    if (this._open()) {
      this.hide('programmatic');
    } else {
      this.show(invoker, 'first');
    }
  }

  // ── Host event handlers ───────────────────────────────────────────

  protected onClick(event: MouseEvent): void {
    if (this.kjDisabled()) return;
    event.stopPropagation();
    this.toggle(this.el.nativeElement);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.kjDisabled()) return;
    const tag = (event.currentTarget as HTMLElement | null)?.tagName.toLowerCase();
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'Spacebar': {
        // For native <button> Enter/Space already triggers click — let click handler run.
        if (tag === 'button') return;
        event.preventDefault();
        event.stopPropagation();
        this.toggle(this.el.nativeElement);
        return;
      }
      case 'ArrowDown': {
        event.preventDefault();
        event.stopPropagation();
        if (!this._open()) this.show(this.el.nativeElement, 'first');
        return;
      }
      case 'ArrowUp': {
        event.preventDefault();
        event.stopPropagation();
        if (!this._open()) this.show(this.el.nativeElement, 'last');
        return;
      }
    }
  }
}
