import { Directive, computed, inject, input, model } from '@angular/core';
import { KJ_TABS, KjTabsContext } from './tabs.context';

/**
 * Root tabs container. Manages active tab value.
 * @example
 * ```html
 * <div kjTabs [(kjTabsValue)]="activeTab"><div kjTabList>...</div></div>
 * ```
 * @doc
 *  @doc-file tabs.example.ts
 *    ```typescript
 *       import { Component, signal } from '@angular/core';
 *       import { KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective } from '@kouji-ui/core';
 *
 *       @Component({
 *         standalone: true,
 *         imports: [KjTabsDirective, KjTabListDirective, KjTabDirective, KjTabPanelDirective],
 *         styles: [`
 *           .tabs { background: #0c0c0c; padding: 2rem; }
 *           [kjTabList] { display: flex; border-bottom: 1px solid #1e1e1e; margin-bottom: 1.5rem; }
 *           [kjTab] { background: none; border: none; border-bottom: 2px solid transparent; color: #555; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; padding: 0.625rem 1.25rem; cursor: pointer; transition: color 0.15s, border-color 0.15s; margin-bottom: -1px; }
 *           [kjTab][aria-selected="true"] { color: #f0ede6; border-bottom-color: #b8f500; }
 *           [kjTab]:hover { color: #f0ede6; }
 *           [kjTabPanel] { color: #666; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; line-height: 1.6; }
 *           [hidden] { display: none; }
 *         `],
 *         template: `
 *           <div class="tabs">
 *             <div kjTabs [(kjTabsValue)]="activeTab" aria-label="Example tabs">
 *               <div kjTabList>
 *                 <button kjTab [kjTabValue]="'tab1'">Overview</button>
 *                 <button kjTab [kjTabValue]="'tab2'">API</button>
 *                 <button kjTab [kjTabValue]="'tab3'">Examples</button>
 *               </div>
 *               <div kjTabPanel [kjPanelFor]="'tab1'">The overview tab content goes here.</div>
 *               <div kjTabPanel [kjPanelFor]="'tab2'">API reference content goes here.</div>
 *               <div kjTabPanel [kjPanelFor]="'tab3'">Code examples go here.</div>
 *             </div>
 *           </div>
 *         `,
 *       })
 *       export class TabsExampleComponent {
 *         activeTab = signal('tab1');
 *       }
 *    ```
 * @category Data/Tabs
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

/**
 * Container for tab triggers. Sets `role="tablist"`.
 * @category Data/Tabs
 */
@Directive({
  selector: '[kjTabList]',
  standalone: true,
  host: { role: 'tablist' },
})
export class KjTabListDirective {}

/**
 * Individual tab trigger. Sets `role="tab"` and manages `aria-selected`.
 * @example `<button kjTab [kjTabValue]="'profile'">Profile</button>`
 * @category Data/Tabs
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
 * @category Data/Tabs
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
