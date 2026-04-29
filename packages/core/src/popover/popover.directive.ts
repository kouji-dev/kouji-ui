import { Directive, DestroyRef, InjectionToken, inject, signal } from '@angular/core';
import { KjOverlayService } from '../primitives';

/**
 * Root popover container. Uses `KjOverlayService` for open state.
 * Escape key and open/close managed via CDK-aware signals.
 *
 * @example
 * ```html
 * <div kjPopover>
 *   <button kjPopoverTrigger>Options</button>
 *   <div kjPopoverContent>Popover body</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjPopover]',
  standalone: true,
})
export class KjPopoverDirective {
  private readonly overlaySvc = inject(KjOverlayService);
  readonly open = signal(false);
  hide(): void { this.open.set(false); }
  toggle(): void { this.open.update(v => !v); }

  constructor() {
    // Escape key handling via document host binding
  }

  /** @internal */
  onEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.hide();
  }
}

/** Trigger button. Toggles the popover and sets `aria-expanded`. */
@Directive({
  selector: '[kjPopoverTrigger]',
  standalone: true,
  host: {
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '[attr.aria-haspopup]': '"true"',
    '(click)': 'ctx.toggle()',
  },
})
export class KjPopoverTriggerDirective {
  readonly ctx = inject(KjPopoverDirective);
}

/**
 * Popover content panel. Hidden when closed.
 * Uses `hidden` attribute for accessibility-compliant visibility.
 */
@Directive({
  selector: '[kjPopoverContent]',
  standalone: true,
  host: {
    '[attr.hidden]': '!ctx.open() ? "" : null',
    '(document:keydown)': 'ctx.onEscape($event)',
  },
})
export class KjPopoverContentDirective {
  readonly ctx = inject(KjPopoverDirective);
}
