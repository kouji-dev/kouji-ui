import { Component, ChangeDetectionStrategy, ViewEncapsulation, input, model } from '@angular/core';
import { KjTabs, KjTabList, KjTab, KjTabPanel } from '@kouji-ui/core';

/**
 * Tabs root.
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
  imports: [KjTabs],
  template: `
    <div
      kjTabs
      class="kj-tabs"
      [(kjTabsValue)]="value"
      [attr.data-variant]="variant()"
      [attr.data-orientation]="orientation()"
    ><ng-content /></div>
  `,
  styleUrl: './tabs.css',
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabsComponent {
  readonly value = model<string>('');
  readonly variant = input<'default' | 'pills'>('default');
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}

@Component({
  selector: 'kj-tab-list',
  standalone: true,
  imports: [KjTabList],
  template: `<div kjTabList class="kj-tab-list"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabListComponent {}

@Component({
  selector: 'kj-tab',
  standalone: true,
  imports: [KjTab],
  template: `<button type="button" kjTab [kjTabValue]="value()" class="kj-tab" [disabled]="disabled() || null"><ng-content /></button>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabComponent {
  readonly value = input.required<string>();
  readonly disabled = input(false);
}

@Component({
  selector: 'kj-tab-panel',
  standalone: true,
  imports: [KjTabPanel],
  template: `<div kjTabPanel [kjPanelFor]="for()" class="kj-tab-panel"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  host: { style: 'display: contents;' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabPanelComponent {
  readonly for = input.required<string>();
}
