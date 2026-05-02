import { Directive, inject, input, signal } from '@angular/core';
import { KJ_POPOVER, KjPopoverContext, type KjPopoverSide, type KjPopoverAlign } from './popover.context';

let _popoverIdCounter = 0;

/**
 * Root popover container. Manages open state, ARIA wiring, and click-outside dismissal.
 * Pairs with `[kjPopoverTrigger]` and `[kjPopoverContent]`.
 *
 * Click outside or Escape closes the popover. Clicking the trigger toggles it.
 * `aria-expanded` and `aria-controls` are automatically set on the trigger.
 *
 * @example
 * ```html
 * <div kjPopover>
 *   <button kjPopoverTrigger>Options</button>
 *   <div kjPopoverContent>
 *     <p>Popover body</p>
 *     <button kjPopoverClose>Done</button>
 *   </div>
 * </div>
 * ```
 * @doc
 *  @doc-example Basic
 *    @doc-theme default
 *      @doc-file popover.example.ts
 *    @doc-theme retro
 *      @doc-file popover.retro.example.ts
 *    @doc-theme finance
 *      @doc-file popover.finance.example.ts
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjPopover]',
  standalone: true,
  providers: [{ provide: KJ_POPOVER, useExisting: KjPopover }],
  exportAs: 'kjPopover',
})
export class KjPopover implements KjPopoverContext {
  /** Preferred side for the popover panel. Used via `data-side` for CSS. Defaults to `'bottom'`. */
  kjPopoverSide = input<KjPopoverSide>('bottom');
  /** Alignment along the cross-axis. Used via `data-align` for CSS. Defaults to `'start'`. */
  kjPopoverAlign = input<KjPopoverAlign>('start');

  readonly open = signal(false);
  readonly popoverId = `kj-popover-${++_popoverIdCounter}`;

  toggle(): void {
    this.open.update(v => !v);
  }

  hide(): void {
    this.open.set(false);
  }
}

/**
 * Trigger button that toggles the popover. Automatically sets `aria-expanded`
 * and `aria-controls` on the host element.
 *
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjPopoverTrigger]',
  standalone: true,
  host: {
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '[attr.aria-haspopup]': '"dialog"',
    '[attr.aria-controls]': 'ctx.popoverId',
    // stopPropagation prevents the document:click on kjPopoverContent from immediately closing
    '(click)': '$event.stopPropagation(); ctx.toggle()',
  },
})
export class KjPopoverTrigger {
  readonly ctx = inject(KJ_POPOVER);
}

/**
 * Popover content panel. Hidden when closed. Uses `hidden` attribute for
 * accessibility-compliant visibility. Click-outside and Escape both dismiss it.
 *
 * Clicks inside the panel are stopped so they don't bubble to the document listener.
 *
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjPopoverContent]',
  standalone: true,
  host: {
    '[attr.id]': 'ctx.popoverId',
    '[attr.hidden]': '!ctx.open() ? "" : null',
    '[attr.data-side]': 'ctx.kjPopoverSide()',
    '[attr.data-align]': 'ctx.kjPopoverAlign()',
    // Prevent clicks inside from closing the popover
    '(click)': '$event.stopPropagation()',
    // Close on Escape
    '(document:keydown.escape)': 'ctx.open() && ctx.hide()',
    // Close on any click outside (trigger stopPropagation prevents self-close)
    '(document:click)': 'ctx.open() && ctx.hide()',
  },
})
export class KjPopoverContent {
  readonly ctx = inject(KJ_POPOVER);
}

/**
 * Closes the parent popover when clicked. Place inside `[kjPopoverContent]`.
 *
 * @example
 * ```html
 * <button kjPopoverClose>Done</button>
 * ```
 * @category Core/Overlays
 */
@Directive({
  selector: '[kjPopoverClose]',
  standalone: true,
  host: {
    '(click)': 'ctx.hide()',
  },
})
export class KjPopoverClose {
  readonly ctx = inject(KJ_POPOVER);
}
