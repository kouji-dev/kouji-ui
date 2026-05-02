import { Directive, input, signal } from '@angular/core';

/** Preferred side for the tooltip relative to its trigger. */
export type KjTooltipSide = 'top' | 'bottom' | 'left' | 'right';

let _tooltipIdCounter = 0;

/**
 * Tooltip content panel. Owns all configuration and visibility state.
 * Exported as `kjTooltipContent` so the trigger can reference it directly.
 *
 * Automatically sets `role="tooltip"` (customisable via `kjTooltipRole`).
 * Note: `role="tooltip"` prohibits `aria-label` and `aria-labelledby` per WAI-ARIA spec.
 *
 * @example
 * ```html
 * <button [kjTooltipTrigger]="myTip">Save</button>
 * <span #myTip="kjTooltipContent" kjTooltipContent [kjTooltipSide]="'top'">
 *   Saves your changes permanently
 * </span>
 * ```
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
 */
@Directive({
  selector: '[kjTooltipContent]',
  standalone: true,
  exportAs: 'kjTooltipContent',
  host: {
    '[attr.id]':       'tooltipId',
    '[attr.role]':     'kjTooltipRole()',
    '[attr.data-side]':'kjTooltipSide()',
    '[attr.hidden]':   '!visible() ? "" : null',
    // Keep tooltip alive when cursor moves from trigger onto tooltip content
    '(mouseenter)': 'cancelHide()',
    '(mouseleave)': 'startHide()',
  },
})
export class KjTooltipContent {
  /** Preferred side relative to trigger. Defaults to `'top'`. */
  readonly kjTooltipSide = input<KjTooltipSide>('top');

  /**
   * ARIA role for the tooltip element. Defaults to `'tooltip'`.
   * Note: `role="tooltip"` prohibits `aria-label` and `aria-labelledby`.
   */
  readonly kjTooltipRole = input<string>('tooltip');

  /** Delay in ms before showing the tooltip. Defaults to `600`. */
  readonly kjTooltipDelay = input<number>(600);

  /** Delay in ms before hiding after hover ends. Defaults to `200`. */
  readonly kjTooltipHideDelay = input<number>(200);

  /** Auto-generated id wired to the trigger's `aria-describedby`. Always present. */
  readonly tooltipId = `kj-tooltip-${++_tooltipIdCounter}`;

  readonly visible = signal(false);

  private showTimer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;

  /** Shows the tooltip after `kjTooltipDelay` ms. */
  show(): void {
    clearTimeout(this.hideTimer);
    const delay = this.kjTooltipDelay();
    if (delay <= 0) { this.visible.set(true); return; }
    this.showTimer = setTimeout(() => this.visible.set(true), delay);
  }

  /** Starts the hide countdown after `kjTooltipHideDelay` ms. */
  startHide(): void {
    clearTimeout(this.showTimer);
    const delay = this.kjTooltipHideDelay();
    if (delay <= 0) { this.visible.set(false); return; }
    this.hideTimer = setTimeout(() => this.visible.set(false), delay);
  }

  /** Cancels any pending hide timer. Called when cursor moves onto the tooltip. */
  cancelHide(): void {
    clearTimeout(this.hideTimer);
  }

  /** Immediately hides and cancels all pending timers. Called on Escape or blur. */
  forceHide(): void {
    clearTimeout(this.showTimer);
    clearTimeout(this.hideTimer);
    this.visible.set(false);
  }
}

/**
 * Trigger element for the tooltip. Pass a `KjTooltipContent` reference via `[kjTooltipTrigger]`.
 *
 * Automatically wires `aria-describedby` to the content's id.
 * Shows on hover/focus, hides on leave/blur/Escape.
 *
 * @example
 * ```html
 * <button [kjTooltipTrigger]="myTip">Save</button>
 * <span #myTip="kjTooltipContent" kjTooltipContent>Saves your changes</span>
 * ```
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjTooltipTrigger]',
  standalone: true,
  host: {
    // aria-describedby is always set per WAI-ARIA spec (before/at display time)
    '[attr.aria-describedby]': '_content?.tooltipId',
    '(mouseenter)':     '_show()',
    '(mouseleave)':     '_startHide()',
    '(focus)':          '_show()',
    '(blur)':           '_forceHide()',
    '(keydown.escape)': '_forceHide()',
  },
})
export class KjTooltipTrigger {
  /** Reference to the associated `KjTooltipContent` directive instance. */
  readonly kjTooltipTrigger = input.required<KjTooltipContent>();

  /** @internal resolved content instance — avoids calling signal methods directly in host expressions */
  protected get _content(): KjTooltipContent { return this.kjTooltipTrigger(); }

  protected _show():       void { this._content?.show(); }
  protected _startHide():  void { this._content?.startHide(); }
  protected _forceHide():  void { this._content?.forceHide(); }
}
