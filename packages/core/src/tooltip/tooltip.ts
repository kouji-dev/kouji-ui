import { Directive, ElementRef, inject, input, signal } from '@angular/core';

/** Preferred side for the tooltip relative to its trigger. */
export type KjTooltipSide = 'top' | 'bottom' | 'left' | 'right';

let _tooltipIdCounter = 0;

/** Maps a tooltip content element to its directive instance. */
const _tooltipRegistry = new WeakMap<Element, KjTooltipContent>();

/**
 * **Tooltip content panel.** Owns all configuration and visibility state.
 *
 * Pass the element reference to `[kjTooltipTrigger]` using `#myTip` *(no `exportAs` needed)*:
 *
 * ```html
 * <button [kjTooltipTrigger]="myTip">Hover me</button>
 * <span #myTip kjTooltipContent [kjTooltipSide]="'top'">Saves permanently</span>
 * ```
 *
 * - Automatically sets `role="tooltip"` — customisable via `kjTooltipRole`
 * - **WAI-ARIA**: `role="tooltip"` prohibits `aria-label` and `aria-labelledby`
 * - Stays visible when the cursor moves from trigger onto the tooltip
 *
 * @doc
 *  @doc-example Basic
 *    @doc-theme default
 *      @doc-file tooltip.example.ts
 *    @doc-theme retro
 *      @doc-file tooltip.retro.example.ts
 *    @doc-theme finance
 *      @doc-file tooltip.finance.example.ts
 *  @doc-example Placements
 *    @doc-file tooltip.placements.example.ts
 * @category Core/Overlays
 * @required
 */
@Directive({
  selector: '[kjTooltipContent]',
  standalone: true,
  host: {
    '[attr.id]':       'tooltipId',
    '[attr.role]':     'kjTooltipRole()',
    '[attr.data-side]':'kjTooltipSide()',
    '[attr.hidden]':   '!visible() ? "" : null',
    '(mouseenter)': 'cancelHide()',
    '(mouseleave)': 'startHide()',
  },
})
export class KjTooltipContent {
  private readonly el = inject(ElementRef<HTMLElement>);

  /** Preferred placement relative to the trigger: `'top'` | `'bottom'` | `'left'` | `'right'`. Defaults to `'top'`. */
  readonly kjTooltipSide = input<KjTooltipSide>('top');

  /** ARIA role for the tooltip element. Defaults to `'tooltip'`. **Note:** `role="tooltip"` prohibits `aria-label` and `aria-labelledby`. */
  readonly kjTooltipRole = input<string>('tooltip');

  /** Delay in **ms** before the tooltip appears on hover. Defaults to `600`. Set to `0` for instant. */
  readonly kjTooltipDelay = input<number>(600);

  /** Delay in **ms** before the tooltip disappears after hover ends. Defaults to `200`. */
  readonly kjTooltipHideDelay = input<number>(200);

  /** Auto-generated `id` wired to the trigger's `aria-describedby`. Always present — set before first display per WAI-ARIA spec. */
  readonly tooltipId = `kj-tooltip-${++_tooltipIdCounter}`;

  readonly visible = signal(false);

  private showTimer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Register synchronously so KjTooltipTrigger's host binding can resolve immediately
    _tooltipRegistry.set(this.el.nativeElement, this);
  }

  show(): void {
    clearTimeout(this.hideTimer);
    const delay = this.kjTooltipDelay();
    if (delay <= 0) { this.visible.set(true); return; }
    this.showTimer = setTimeout(() => this.visible.set(true), delay);
  }

  startHide(): void {
    clearTimeout(this.showTimer);
    const delay = this.kjTooltipHideDelay();
    if (delay <= 0) { this.visible.set(false); return; }
    this.hideTimer = setTimeout(() => this.visible.set(false), delay);
  }

  cancelHide(): void {
    clearTimeout(this.hideTimer);
  }

  forceHide(): void {
    clearTimeout(this.showTimer);
    clearTimeout(this.hideTimer);
    this.visible.set(false);
  }
}

/**
 * **Trigger element for the tooltip.**
 *
 * Pass the tooltip content's native element via `[kjTooltipTrigger]`:
 *
 * ```html
 * <button [kjTooltipTrigger]="myTip">Hover me</button>
 * <span #myTip kjTooltipContent>Tooltip text</span>
 * ```
 *
 * - Automatically wires `aria-describedby` to the content's `id` *(always set, per WAI-ARIA spec)*
 * - Shows on **hover** and **focus**, hides on **leave / blur / Escape**
 *
 * @category Core/Overlays
 * @required
 */
@Directive({
  selector: '[kjTooltipTrigger]',
  standalone: true,
  host: {
    '[attr.aria-describedby]': '_content?.tooltipId',
    '(mouseenter)':     '_show()',
    '(mouseleave)':     '_startHide()',
    '(focus)':          '_show()',
    '(blur)':           '_forceHide()',
    '(keydown.escape)': '_forceHide()',
  },
})
export class KjTooltipTrigger {
  /** Native element of the `[kjTooltipContent]` to associate. Use `#myTip` *(no `exportAs`)* in the template. */
  readonly kjTooltipTrigger = input.required<HTMLElement>();

  /** Resolved `KjTooltipContent` instance looked up from the registry. */
  protected get _content(): KjTooltipContent | undefined {
    return _tooltipRegistry.get(this.kjTooltipTrigger());
  }

  protected _show():      void { this._content?.show(); }
  protected _startHide(): void { this._content?.startHide(); }
  protected _forceHide(): void { this._content?.forceHide(); }
}
