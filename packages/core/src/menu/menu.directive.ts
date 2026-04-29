import { Directive, InjectionToken, inject, signal } from '@angular/core';

export const KJ_MENU = new InjectionToken<KjMenuDirective>('KjMenu');

/**
 * Root dropdown menu container.
 * @example `<div kjMenu><button kjMenuTrigger>Options</button><div role="menu" kjMenuContent><button kjMenuItem role="menuitem">Edit</button></div></div>`
 */
@Directive({
  selector: '[kjMenu]',
  standalone: true,
  providers: [{ provide: KJ_MENU, useExisting: KjMenuDirective }],
  host: { '(document:keydown)': 'onKey($event)' },
})
export class KjMenuDirective {
  readonly open = signal(false);

  show(): void { this.open.set(true); }
  hide(): void { this.open.set(false); }
  toggle(): void { this.open.update(v => !v); }

  /** @internal Closes the menu when Escape is pressed. */
  onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.open()) this.hide();
  }
}

/** Trigger that toggles the menu. Sets `aria-haspopup` and `aria-expanded`. */
@Directive({
  selector: '[kjMenuTrigger]',
  standalone: true,
  host: {
    'aria-haspopup': 'menu',
    '[attr.aria-expanded]': 'ctx.open().toString()',
    '(click)': 'ctx.toggle()',
  },
})
export class KjMenuTriggerDirective {
  readonly ctx = inject(KJ_MENU);
}

/** Menu content panel. Hidden when closed. Add `role="menu"`. */
@Directive({
  selector: '[kjMenuContent]',
  standalone: true,
  host: { '[attr.hidden]': '!ctx.open() ? "" : null' },
})
export class KjMenuContentDirective {
  readonly ctx = inject(KJ_MENU);
}

/**
 * Menu item. Closes the menu on click. Add `role="menuitem"`.
 * @example `<button kjMenuItem role="menuitem">Delete</button>`
 */
@Directive({
  selector: '[kjMenuItem]',
  standalone: true,
  host: { '(click)': 'ctx.hide()' },
})
export class KjMenuItemDirective {
  readonly ctx = inject(KJ_MENU);
}
