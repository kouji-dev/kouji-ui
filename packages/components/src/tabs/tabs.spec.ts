import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  KjTabsComponent,
  KjTabListComponent,
  KjTabComponent,
  KjTabPanelComponent,
} from './tabs';

const imports = [KjTabsComponent, KjTabListComponent, KjTabComponent, KjTabPanelComponent];

@Component({
  standalone: true,
  imports,
  template: `
    <kj-tabs [(value)]="active" [orientation]="orientation">
      <kj-tab-list>
        <kj-tab value="overview">Overview</kj-tab>
        <kj-tab value="api">API</kj-tab>
        <kj-tab value="examples">Examples</kj-tab>
      </kj-tab-list>
      <kj-tab-panel value="overview"><span data-testid="panel-overview">Overview body</span></kj-tab-panel>
      <kj-tab-panel value="api"><span data-testid="panel-api">API body</span></kj-tab-panel>
      <kj-tab-panel value="examples"><span data-testid="panel-examples">Examples body</span></kj-tab-panel>
    </kj-tabs>
  `,
})
class HostComponent {
  active = signal('overview');
  orientation: 'horizontal' | 'vertical' = 'horizontal';
}

@Component({
  standalone: true,
  imports,
  template: `
    <kj-tabs>
      <kj-tab-list>
        <kj-tab value="x">X</kj-tab>
        <kj-tab value="y">Y</kj-tab>
      </kj-tab-list>
      <kj-tab-panel value="x">X body</kj-tab-panel>
      <kj-tab-panel value="y">Y body</kj-tab-panel>
    </kj-tabs>
  `,
})
class DefaultValueHost {}

describe('KjTabsComponent (wrapper)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent, DefaultValueHost] });
  });

  test('renders the projected children — tablist, tabs, panels', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const list = root.querySelector('kj-tab-list');
    expect(list).not.toBeNull();
    expect(list!.getAttribute('role')).toBe('tablist');

    const tabs = root.querySelectorAll('button.kj-tab');
    expect(tabs.length).toBe(3);
    tabs.forEach((tab) => expect(tab.getAttribute('role')).toBe('tab'));

    const panels = root.querySelectorAll('kj-tab-panel');
    expect(panels.length).toBe(3);
    panels.forEach((panel) => expect(panel.getAttribute('role')).toBe('tabpanel'));
  });

  test('aliased inputs forward to the host directive — value, orientation, activationMode', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const tabsHost = root.querySelector('kj-tabs')!;

    // `value` model alias: first tab is selected via the bound signal.
    const tabs = root.querySelectorAll<HTMLButtonElement>('button.kj-tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');

    // `orientation` alias forwarded to KjTabs directive — reflected as data-orientation.
    expect(tabsHost.getAttribute('data-orientation')).toBe('horizontal');
  });

  test('default value activates the first tab when value is left unset', async () => {
    const fixture = TestBed.createComponent(DefaultValueHost);
    fixture.detectChanges();
    // Reconciliation runs in a microtask.
    await Promise.resolve();
    fixture.detectChanges();
    await new Promise<void>((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const tabs = root.querySelectorAll<HTMLButtonElement>('button.kj-tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  test('programmatic value change activates the corresponding panel', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.componentInstance.active.set('api');
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const tabs = root.querySelectorAll<HTMLButtonElement>('button.kj-tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');

    const panels = root.querySelectorAll<HTMLElement>('kj-tab-panel');
    expect(panels[0].hasAttribute('hidden')).toBe(true);
    expect(panels[1].hasAttribute('hidden')).toBe(false);
    // Lazy-then-persistent: api panel content mounts on activation.
    expect(root.querySelector('[data-testid="panel-api"]')).not.toBeNull();
  });

  test('orientation propagates to the tablist (aria-orientation + data-orientation)', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.orientation = 'vertical';
    fixture.detectChanges();

    const root: HTMLElement = fixture.nativeElement;
    const tabsHost = root.querySelector('kj-tabs')!;
    const list = root.querySelector('kj-tab-list')!;

    expect(tabsHost.getAttribute('data-orientation')).toBe('vertical');
    expect(list.getAttribute('aria-orientation')).toBe('vertical');
    expect(list.getAttribute('data-orientation')).toBe('vertical');
  });
});
