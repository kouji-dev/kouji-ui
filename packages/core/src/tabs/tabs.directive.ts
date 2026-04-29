import { Directive, computed, inject, input, model } from '@angular/core';
import { KJ_TABS, KjTabsContext } from './tabs.context';

/**
 * Root tabs container. Manages active tab value.
 * @example
 * ```html
 * <div kjTabs [(kjTabsValue)]="activeTab"><div kjTabList>...</div></div>
 * ```
 */
@Directive({
  selector: '[kjTabs]',
  standalone: true,
  providers: [{ provide: KJ_TABS, useExisting: KjTabsDirective }],
})
export class KjTabsDirective implements KjTabsContext {
  /** Two-way bound active tab value. */
  kjTabsValue = model<string>('');

  /** Read-only signal of the current active tab value. */
  readonly value = this.kjTabsValue.asReadonly();

  /** Activates the tab with the given value. */
  activate(val: string): void {
    this.kjTabsValue.set(val);
  }
}

/** Container for tab triggers. Sets `role="tablist"`. */
@Directive({
  selector: '[kjTabList]',
  standalone: true,
  host: { role: 'tablist' },
})
export class KjTabListDirective {}

/**
 * Individual tab trigger. Sets `role="tab"` and manages `aria-selected`.
 * @example `<button kjTab [kjTabValue]="'profile'">Profile</button>`
 */
@Directive({
  selector: '[kjTab]',
  standalone: true,
  host: {
    role: 'tab',
    '[attr.aria-selected]': 'active().toString()',
    '[attr.data-active]': 'active() ? "" : null',
    '[attr.tabindex]': 'active() ? "0" : "-1"',
    '(click)': 'activate()',
  },
})
export class KjTabDirective {
  private readonly ctx = inject(KJ_TABS);

  /** The value this tab represents. */
  kjTabValue = input.required<string>();

  /** Whether this tab is currently active. */
  readonly active = computed(() => this.ctx.value() === this.kjTabValue());

  /** Activates this tab by updating the shared context. */
  activate(): void {
    this.ctx.activate(this.kjTabValue());
  }
}

/**
 * Tab panel content. Hidden when not active.
 * @example `<div kjTabPanel [kjPanelFor]="'profile'">Profile content</div>`
 */
@Directive({
  selector: '[kjTabPanel]',
  standalone: true,
  host: {
    role: 'tabpanel',
    '[attr.hidden]': 'hidden() ? "" : null',
  },
})
export class KjTabPanelDirective {
  private readonly ctx = inject(KJ_TABS);

  /** The tab value this panel corresponds to. */
  kjPanelFor = input.required<string>();

  /** Whether this panel is currently hidden. */
  readonly hidden = computed(() => this.ctx.value() !== this.kjPanelFor());
}
