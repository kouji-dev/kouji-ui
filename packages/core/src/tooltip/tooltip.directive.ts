import { Directive, InjectionToken, inject, signal } from '@angular/core';

export const KJ_TOOLTIP = new InjectionToken<KjTooltipDirective>('KjTooltip');

/**
 * Root tooltip container. Manages visibility state.
 * @example `<div kjTooltip><button kjTooltipTrigger aria-describedby="t">Info</button><span role="tooltip" id="t" kjTooltipContent>Text</span></div>`
 */
@Directive({ selector: '[kjTooltip]', standalone: true, providers: [{ provide: KJ_TOOLTIP, useExisting: KjTooltipDirective }] })
export class KjTooltipDirective { readonly visible = signal(false); }

/** Shows/hides tooltip on hover and focus. */
@Directive({ selector: '[kjTooltipTrigger]', standalone: true, host: { '(mouseenter)': 'ctx.visible.set(true)', '(mouseleave)': 'ctx.visible.set(false)', '(focus)': 'ctx.visible.set(true)', '(blur)': 'ctx.visible.set(false)' } })
export class KjTooltipTriggerDirective { readonly ctx = inject(KJ_TOOLTIP); }

/** Tooltip content. Hidden unless triggered. Add `role="tooltip"`. */
@Directive({ selector: '[kjTooltipContent]', standalone: true, host: { '[attr.hidden]': '!ctx.visible() ? "" : null' } })
export class KjTooltipContentDirective { readonly ctx = inject(KJ_TOOLTIP); }
