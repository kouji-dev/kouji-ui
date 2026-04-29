import { Directive, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { KjOverlayService, KjOverlayRef } from '../primitives';

/** Injection token for tooltip state. */
import { InjectionToken } from '@angular/core';
export const KJ_TOOLTIP = new InjectionToken<KjTooltipDirective>('KjTooltip');

/**
 * Root tooltip container. Uses `KjOverlayService` for open state management.
 * The `kjTooltipContent` element is shown/hidden via the `hidden` attribute
 * until full portal support is added in the UI implementation layer.
 *
 * @example
 * ```html
 * <div kjTooltip>
 *   <button kjTooltipTrigger aria-describedby="tip-id">Info</button>
 *   <span role="tooltip" id="tip-id" kjTooltipContent>Helpful text</span>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjTooltip]',
  standalone: true,
  providers: [{ provide: KJ_TOOLTIP, useExisting: KjTooltipDirective }],
})
export class KjTooltipDirective {
  private readonly overlaySvc = inject(KjOverlayService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = signal(false);

  show(): void { this.visible.set(true); }
  hide(): void { this.visible.set(false); }
}

/**
 * Trigger element for the tooltip. Shows/hides on hover and focus.
 */
@Directive({
  selector: '[kjTooltipTrigger]',
  standalone: true,
  host: {
    '(mouseenter)': 'ctx.show()',
    '(mouseleave)': 'ctx.hide()',
    '(focus)': 'ctx.show()',
    '(blur)': 'ctx.hide()',
  },
})
export class KjTooltipTriggerDirective {
  readonly ctx = inject(KJ_TOOLTIP);
}

/**
 * Tooltip content panel. Hidden unless triggered.
 * Add `role="tooltip"` and an `id` matching the trigger's `aria-describedby`.
 */
@Directive({
  selector: '[kjTooltipContent]',
  standalone: true,
  host: {
    '[attr.hidden]': '!ctx.visible() ? "" : null',
  },
})
export class KjTooltipContentDirective {
  readonly ctx = inject(KJ_TOOLTIP);
}
