import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  KjTabsComponent,
  KjTabListComponent,
  KjTabComponent,
  KjTabPanelComponent,
} from './tabs';
import type { PlaygroundFile } from '@kouji-ui/components/playground-types';

/**
 * Playground state — module-scope signals.
 */
const tabCount = signal<2 | 3 | 4>(3);
const active = signal<'overview' | 'api' | 'examples' | 'changelog'>('overview');
const variant = signal<'default' | 'pills'>('default');
const activationMode = signal<'automatic' | 'manual'>('automatic');

const TAB_DEFS = [
  { value: 'overview', label: 'Overview', body: 'High-level summary of what this surface does.' },
  { value: 'api', label: 'API', body: 'Inputs, outputs, and accepted value shapes.' },
  { value: 'examples', label: 'Examples', body: 'Copy-pasteable patterns for common scenarios.' },
  { value: 'changelog', label: 'Changelog', body: 'Recent release notes.' },
] as const;

@Component({
  selector: 'kj-tabs-playground',
  standalone: true,
  imports: [KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent],
  template: `
    <kj-tabs
      [value]="active()"
      (valueChange)="active.set($any($event))"
      [variant]="variant()"
      [activationMode]="activationMode()"
    >
      <kj-tab-list>
        @for (t of tabs(); track t.value) {
          <kj-tab [value]="t.value">{{ t.label }}</kj-tab>
        }
      </kj-tab-list>
      @for (t of tabs(); track t.value) {
        <kj-tab-panel [value]="t.value">{{ t.body }}</kj-tab-panel>
      }
    </kj-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KjTabsPlaygroundDemo {
  protected readonly active = active;
  protected readonly variant = variant;
  protected readonly activationMode = activationMode;
  protected readonly tabs = computed(() => TAB_DEFS.slice(0, tabCount()));
}

export const PLAYGROUND: PlaygroundFile = {
  component: KjTabsPlaygroundDemo,
  state: {
    tabCount: tabCount as unknown as ReturnType<typeof signal>,
    active: active as unknown as ReturnType<typeof signal>,
    variant: variant as unknown as ReturnType<typeof signal>,
    activationMode: activationMode as unknown as ReturnType<typeof signal>,
  },
  controls: [
    { kind: 'chips', name: 'tabCount', label: 'tabs', options: [2, 3, 4] },
    { kind: 'chips', name: 'active', label: 'active', options: ['overview', 'api', 'examples', 'changelog'] },
    { kind: 'chips', name: 'variant', label: 'variant', options: ['default', 'pills'] },
    { kind: 'chips', name: 'activationMode', label: 'activation', options: ['automatic', 'manual'] },
  ],
  snippet: (values) => {
    const s = values as {
      tabCount: number;
      active: string;
      variant: string;
      activationMode: string;
    };
    const tabs = TAB_DEFS.slice(0, s.tabCount);
    const triggers = tabs
      .map((t) => `    <kj-tab value="${t.value}">${t.label}</kj-tab>`)
      .join('\n');
    const panels = tabs
      .map((t) => `  <kj-tab-panel value="${t.value}">${t.body}</kj-tab-panel>`)
      .join('\n');
    const attrs: string[] = [`[value]="'${s.active}'"`];
    if (s.variant !== 'default') attrs.push(`variant="${s.variant}"`);
    if (s.activationMode !== 'automatic') attrs.push(`activationMode="${s.activationMode}"`);
    return `<kj-tabs\n  ${attrs.join('\n  ')}\n>\n  <kj-tab-list>\n${triggers}\n  </kj-tab-list>\n${panels}\n</kj-tabs>`;
  },
};
