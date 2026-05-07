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
 * @doc-example Default
 *   @doc-file tabs.example.ts
 * @doc-example Vertical
 *   @doc-file tabs.vertical.example.ts
 * @doc-example Manual activation
 *   @doc-file tabs.manual-activation.example.ts
 * @doc-example Disabled tab
 *   @doc-file tabs.disabled.example.ts
 * @doc-example Controlled
 *   @doc-file tabs.controlled.example.ts
 * @category Library/Navigation
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
 * @category Library/Navigation
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
 * @category Library/Navigation
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
 * @category Library/Navigation
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
