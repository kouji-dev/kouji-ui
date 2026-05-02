import {
  Directive, DestroyRef, ElementRef, InjectionToken, afterNextRender, inject, input, signal,
} from '@angular/core';

/** Preferred side for the tooltip relative to its trigger. */
export type KjTooltipSide = 'top' | 'bottom' | 'left' | 'right';

export const KJ_TOOLTIP = new InjectionToken<KjTooltip>('KjTooltip');

let _tooltipIdCounter = 0;

/**
 * Root tooltip container. Manages show/hide state with hover/focus delays.
 * Pairs with `[kjTooltipTrigger]` and `[kjTooltipContent]`.
 *
 * The trigger automatically receives `aria-describedby` pointing to the tooltip id.
 * Add `role="tooltip"` and the matching `id` to the content element.
 *
 * @example
 * ```html
 * <div kjTooltip>
 *   <button kjTooltipTrigger>Save</button>
 *   <span kjTooltipContent role="tooltip" id="save-tip">
 *     Saves your changes permanently
 *   </span>
 * </div>
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
  selector: '[kjTooltip]',
  standalone: true,
  providers: [{ provide: KJ_TOOLTIP, useExisting: KjTooltip }],
  exportAs: 'kjTooltip',
})
export class KjTooltip {
  /** Preferred tooltip side. Used as `data-side` for CSS positioning. Defaults to `'top'`. */
  kjTooltipSide = input<KjTooltipSide>('top');
  /** Delay in ms before showing the tooltip on hover. Defaults to `600`. */
  kjTooltipDelay = input<number>(600);
  /** Delay in ms before hiding the tooltip after hover ends. Defaults to `200`. */
  kjTooltipHideDelay = input<number>(200);

  readonly visible = signal(false);

  /** Auto-generated id used for `aria-describedby` wiring. */
  readonly tooltipId = `kj-tooltip-${++_tooltipIdCounter}`;

  private showTimer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;

  show(): void {
    clearTimeout(this.hideTimer);
    const delay = this.kjTooltipDelay();
    if (delay <= 0) { this.visible.set(true); return; }
    this.showTimer = setTimeout(() => this.visible.set(true), delay);
  }

  hide(): void {
    clearTimeout(this.showTimer);
    const delay = this.kjTooltipHideDelay();
    if (delay <= 0) { this.visible.set(false); return; }
    this.hideTimer = setTimeout(() => this.visible.set(false), delay);
  }

  /** Cancels pending timers and immediately hides. Called on Escape. */
  forceHide(): void {
    clearTimeout(this.showTimer);
    clearTimeout(this.hideTimer);
    this.visible.set(false);
  }
}

/**
 * Trigger element for the tooltip. Shows on hover/focus, hides on leave/blur/Escape.
 * Automatically receives `aria-describedby` pointing to the tooltip panel.
 *
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjTooltipTrigger]',
  standalone: true,
  host: {
    '[attr.aria-describedby]': 'ctx.tooltipId',
    '(mouseenter)': 'ctx.show()',
    '(mouseleave)': 'ctx.hide()',
    '(focus)': 'ctx.show()',
    '(blur)': 'ctx.hide()',
    '(keydown.escape)': 'ctx.forceHide()',
  },
})
export class KjTooltipTrigger {
  readonly ctx = inject(KJ_TOOLTIP);
}

/**
 * Tooltip content panel. Hidden unless the trigger is hovered or focused.
 * Add `role="tooltip"` and set the `id` to match the trigger's `aria-describedby`.
 *
 * The `data-side` attribute reflects `kjTooltipSide` and can be used for CSS positioning.
 *
 * @example
 * ```html
 * <span kjTooltipContent role="tooltip" [id]="ctx.tooltipId">
 *   Tooltip text here
 * </span>
 * ```
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjTooltipContent]',
  standalone: true,
  host: {
    '[attr.hidden]': '!ctx.visible() ? "" : null',
    '[attr.data-side]': 'ctx.kjTooltipSide()',
    '[attr.id]': 'ctx.tooltipId',
    // Keep tooltip visible when user hovers over it (prevents flash on mouse movement)
    '(mouseenter)': 'ctx.show()',
    '(mouseleave)': 'ctx.hide()',
  },
})
export class KjTooltipContent {
  readonly ctx = inject(KJ_TOOLTIP);
}
