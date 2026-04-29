import { Directive, inject, signal } from '@angular/core';

/**
 * Root popover container. Manages open state and Escape key closing.
 * @example
 * ```html
 * <div kjPopover>
 *   <button kjPopoverTrigger>Options</button>
 *   <div kjPopoverContent>Body</div>
 * </div>
 * ```
 */
@Directive({
  selector: '[kjPopover]',
  standalone: true,
  host: { '(document:keydown)': 'onEscape($event)' },
})
export class KjPopoverDirective {
  /** Whether the popover is currently open. */
  readonly open = signal(false);

  /** Closes the popover. */
  hide(): void { this.open.set(false); }

  /** Toggles the popover open/closed. */
  toggle(): void { this.open.update(v => !v); }

  /** @internal Closes the popover when Escape is pressed. */
  onEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.open()) this.hide();
  }
}

/**
 * Trigger button that toggles the popover. Sets `aria-expanded` to reflect open state.
 * @example `<button kjPopoverTrigger>Open</button>`
 */
@Directive({
  selector: '[kjPopoverTrigger]',
  standalone: true,
  host: {
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '(click)': 'ctx.toggle()',
  },
})
export class KjPopoverTriggerDirective {
  /** @internal Reference to the parent popover context. */
  readonly ctx = inject(KjPopoverDirective);
}

/**
 * Popover content panel. Hidden when the popover is closed via the `hidden` attribute.
 * @example `<div kjPopoverContent>Popover body</div>`
 */
@Directive({
  selector: '[kjPopoverContent]',
  standalone: true,
  host: { '[attr.hidden]': '!ctx.open() ? "" : null' },
})
export class KjPopoverContentDirective {
  /** @internal Reference to the parent popover context. */
  readonly ctx = inject(KjPopoverDirective);
}
