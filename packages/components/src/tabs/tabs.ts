import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  inject,
  input,
} from '@angular/core';
import { KjTabs, KjTabList, KjTab, KjTabPanel } from '@kouji-ui/core';

/**
 * Styled wrapper around the headless `KjTabs` directive — root of the tabs
 * compound. Re-maps the `kjValue`/`kjOrientation`/`kjActivationMode` inputs to
 * terse public names and reflects them as `data-*` attributes for CSS chrome.
 *
 * Compose the four wrappers — `<kj-tabs>`, `<kj-tab-list>`, `<kj-tab>`,
 * `<kj-tab-panel>` — to mirror the four-directive shape. The wiring between
 * a tab and its panel is by string `value`, not by parent-child structure.
 *
 * @example
 * ```html
 * <kj-tabs [(value)]="active">
 *   <kj-tab-list>
 *     <kj-tab value="overview">Overview</kj-tab>
 *     <kj-tab value="billing">Billing</kj-tab>
 *   </kj-tab-list>
 *   <kj-tab-panel value="overview">Overview content.</kj-tab-panel>
 *   <kj-tab-panel value="billing">Billing content.</kj-tab-panel>
 * </kj-tabs>
 * ```
 *
 * @doc-keyboard
 *   ArrowRight|ArrowLeft — Moves focus between tabs when orientation is "horizontal" (off-axis arrows are swallowed)
 *   ArrowDown|ArrowUp    — Moves focus between tabs when orientation is "vertical"
 *   Home                 — Moves focus to the first tab
 *   End                  — Moves focus to the last tab
 *   Enter|Space          — Activates the focused tab (always honoured; required in `activationMode="manual"`)
 *   Delete               — Fires `kjClose` when the tab has `kjClosable="true"`
 *   Tab                  — Single tab stop: leaves the tablist and moves to the active panel (roving tabindex)
 *
 * @doc-aria
 *   role="tablist"       — on `<kj-tab-list>`
 *   aria-orientation     — reflects [orientation] ("horizontal" | "vertical")
 *   role="tab"           — on each `<kj-tab>` host button
 *   aria-selected        — "true" on the active tab, "false" otherwise
 *   aria-controls        — links each tab to the id of its panel
 *   aria-disabled        — set to "true" when [disabled] is true on a tab
 *   role="tabpanel"      — on each `<kj-tab-panel>`
 *   aria-labelledby      — links each panel to the id of its tab
 *   hidden               — set on inactive panels (toggled, not destroyed, after first mount)
 *   data-state           — "active" | "inactive" mirror for CSS targeting
 *
 * @doc-touch
 *   Default tab padding produces a ~32–36px hit area. For touch-first layouts, increase tab padding to reach 44px or pair tabs with a larger pill variant — the WCAG 2.5.5 "inline" exception applies when tabs sit inside a horizontal navigation strip with labels.
 *
 * @doc-a11y
 *   Implements the WAI-ARIA Tabs APG pattern. Roving tabindex via
 *   `KjRovingTabindex` keeps the tablist as a single Tab stop; arrow keys move
 *   focus among tabs. `activationMode="automatic"` (default) activates the tab
 *   as focus lands on it; `activationMode="manual"` separates focus from
 *   activation so screen reader users can browse tab labels before committing
 *   to a panel. Panels use a lazy-then-persistent mount: content is created on
 *   first activation and kept thereafter (only `hidden` toggles), preserving
 *   form state and aria live regions across tab switches.
 *
 * @doc-related tab-list,segmented,stepper
 *
 * @doc-example Default
 *   The default playground — three tabs, automatic activation, horizontal.
 *   @doc-file tabs.example.ts
 * @doc-example Usage
 *   A walkthrough of the most common tabs usages — controlled value, default
 *   active, disabled tab, and a panel that reads from the active value.
 *   @doc-file tabs.usage.example.ts
 * @doc-example Vertical
 *   `[orientation]="'vertical'"` stacks the tabs and panels side-by-side.
 *   @doc-file tabs.vertical.example.ts
 * @doc-example Manual activation
 *   `[activationMode]="'manual'"` separates focus from activation — useful
 *   for tabs that swap heavy content.
 *   @doc-file tabs.manual-activation.example.ts
 * @doc-example Disabled tab
 *   `[disabled]="true"` on a `<kj-tab>` removes it from activation; arrow keys skip it.
 *   @doc-file tabs.disabled.example.ts
 * @doc-example Controlled
 *   Two-way bind `[(value)]` to drive activation from outside the strip.
 *   @doc-file tabs.controlled.example.ts
 * @doc-category Library/Navigation
 * @doc
 * @doc-name tabs
 * @doc-description Themed tab strip with default and pill variants and manual or automatic activation.
 * @doc-is-main
 */
@Component({
  selector: 'kj-tabs',
  standalone: true,
  hostDirectives: [
    {
      directive: KjTabs,
      inputs: [
        'kjValue: value',
        'kjOrientation: orientation',
        'kjActivationMode: activationMode',
      ],
      outputs: ['kjValueChange: valueChange'],
    },
  ],
  template: `<ng-content />`,
  styleUrl: './tabs.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'kj-tabs',
    '[attr.data-variant]': 'variant()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabsComponent {
  /** Visual chrome for the tab strip. Reflected as `data-variant` on the host. */
  readonly variant = input<'default' | 'pills'>('default');
}

/**
 * Styled wrapper around `KjTabList`. Hosts `role="tablist"` (provided by the
 * underlying directive) and the roving-tabindex behaviour. Place inside a
 * `<kj-tabs>` and project `<kj-tab>` children.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name tabs
 */
@Component({
  selector: 'kj-tab-list',
  standalone: true,
  hostDirectives: [KjTabList],
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-tab-list' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabListComponent {}

/**
 * Styled wrapper around `KjTab`. Renders a `<button role="tab">` and forwards
 * the required `value` and optional `disabled` inputs to the directive.
 * Project the tab's label as content.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name tabs
 */
@Component({
  selector: 'kj-tab',
  standalone: true,
  imports: [KjTab],
  template: `
    <button
      type="button"
      kjTab
      class="kj-tab"
      [kjTabValue]="value()"
      [kjTabDisabled]="disabled()"
    >
      <ng-content />
    </button>
  `,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabComponent {
  /** String key wiring this tab to the panel of the same `value`. */
  readonly value = input.required<string>();
  /** When true, the tab is announced as disabled and cannot be activated. */
  readonly disabled = input(false);
}

/**
 * Styled wrapper around `KjTabPanel`. Renders the panel host with
 * `role="tabpanel"` and the lazy-then-persistent mount posture: projected
 * content is created on first activation and kept thereafter — subsequent
 * deactivations only toggle `hidden`.
 *
 * @doc-category Library/Navigation
 * @doc
 * @doc-name tabs
 */
@Component({
  selector: 'kj-tab-panel',
  standalone: true,
  hostDirectives: [{ directive: KjTabPanel, inputs: ['kjPanelValue: value'] }],
  template: `
    @if (panel.mounted()) {
      <ng-content />
    }
  `,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'kj-tab-panel' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabPanelComponent {
  // Read the host directive instance from the element injector so the template
  // can gate `<ng-content>` on its `mounted()` signal — implements the
  // lazy-then-persistent mount posture without re-creating it here.
  protected readonly panel = inject(KjTabPanel);
}
