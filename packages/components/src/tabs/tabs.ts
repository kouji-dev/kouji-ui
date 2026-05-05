import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, contentChildren, TemplateRef, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { KjTabs, KjTabList, KjTab, KjTabPanel } from '@kouji-ui/core';

/**
 * Config element for a single tab. Not rendered visibly itself — holds `id`,
 * `label`, and `disabled` inputs and exposes a `TemplateRef` of its projected
 * content so `<kj-tabs>` can render both the tab button and the panel.
 */
@Component({
  selector: 'kj-tab',
  standalone: true,
  template: `<ng-template><ng-content /></ng-template>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabComponent {
  readonly id = input.required<string>();
  readonly label = input.required<string>();
  readonly disabled = input(false);
  readonly tpl = viewChild.required(TemplateRef);
}

/**
 * Tabs root. Two-way bind via `[(value)]`.
 *
 * Renders a tab list and panels internally from child `<kj-tab>` elements.
 *
 * @doc-example Default
 *   @doc-file tabs.default.example.ts
 * @doc-example Pills
 *   @doc-file tabs.pills.example.ts
 * @doc-example Disabled tab
 *   @doc-file tabs.disabled.example.ts
 * @doc-example Vertical
 *   @doc-file tabs.vertical.example.ts
 * @category Library/Navigation
 */
@Component({
  selector: 'kj-tabs',
  standalone: true,
  hostDirectives: [
    { directive: KjTabs, inputs: ['kjTabsValue: value'], outputs: ['kjTabsValueChange: valueChange'] },
  ],
  imports: [KjTabList, KjTab, KjTabPanel, NgTemplateOutlet],
  template: `
    <div kjTabList class="kj-tab-list">
      @for (t of tabs(); track t.id()) {
        <button type="button" kjTab [kjTabValue]="t.id()" class="kj-tab" [disabled]="t.disabled() || null">{{ t.label() }}</button>
      }
    </div>
    @for (t of tabs(); track t.id()) {
      <div kjTabPanel [kjPanelFor]="t.id()" class="kj-tab-panel">
        <ng-container *ngTemplateOutlet="t.tpl()"></ng-container>
      </div>
    }
  `,
  styleUrl: './tabs.css',
  encapsulation: ViewEncapsulation.None,
  host: {
    'class': 'kj-tabs',
    '[attr.data-variant]': 'variant()',
    '[attr.data-orientation]': 'orientation()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabsComponent {
  readonly variant = input<'default' | 'pills'>('default');
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  readonly tabs = contentChildren(KjTabComponent);
}
