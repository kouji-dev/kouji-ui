import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { KjListItem } from './item';

expect.extend(toHaveNoViolations);

describe('KjListItem', () => {
  it('mints a stable id at construction (no afterNextRender race)', async () => {
    const { container } = await render(
      `<div role="option" aria-selected="false" kjListItem [kjItemValue]="'a'">A</div>`,
      { imports: [KjListItem] },
    );
    const el = container.querySelector('[kjListItem]')!;
    expect(el.id).toMatch(/^kj-list-item-\d+$/);
  });

  it('respects existing host id attribute over the auto-generated id', async () => {
    const { container } = await render(
      `<div role="option" id="markup-id" kjListItem [kjItemValue]="'a'">A</div>`,
      { imports: [KjListItem] },
    );
    expect(container.querySelector('[kjListItem]')!.id).toBe('markup-id');
  });

  it('reflects aria-disabled from composed KjDisabled', async () => {
    const { container } = await render(
      `<div role="option" aria-selected="false" kjListItem [kjDisabled]="true" [kjItemValue]="'a'">A</div>`,
      { imports: [KjListItem] },
    );
    expect(container.querySelector('[kjListItem]')!.getAttribute('aria-disabled')).toBe('true');
  });

  it('omits aria-selected when no KjSelectionModel is provided', async () => {
    const { container } = await render(
      `<div role="option" aria-selected="false" kjListItem [kjItemValue]="'a'">A</div>`,
      { imports: [KjListItem] },
    );
    expect(container.querySelector('[kjListItem]')!.hasAttribute('aria-selected')).toBe(false);
  });

  it('binds aria-checked from KjSelectionModel.cascadeState when mode is cascade', async () => {
    const { KjSelectionModel } = await import('./selection');
    const { KJ_LIST_NAVIGATOR_CONFIG } = await import('./tokens');
    const { signal } = await import('@angular/core');
    const value = signal<unknown | readonly unknown[] | null>(null);
    const { container, fixture } = await render(
      `<div role="treeitem" kjListItem [kjItemValue]="'A1'">A1</div>`,
      {
        imports: [KjListItem],
        providers: [
          KjSelectionModel,
          { provide: KJ_LIST_NAVIGATOR_CONFIG, useValue: { items: signal([]), value } },
        ],
      },
    );
    const m = fixture.debugElement.injector.get(KjSelectionModel);
    m.setMode('cascade');
    m.setTreeShape({
      getParent: () => null,
      getChildren: () => [],
      isLeaf: () => true,
    });
    fixture.detectChanges();
    const el = container.querySelector('[kjListItem]')!;
    expect(el.getAttribute('aria-checked')).toBe('false');
    expect(el.hasAttribute('aria-selected')).toBe(false);
    m.toggle('A1' as unknown as never);
    fixture.detectChanges();
    expect(el.getAttribute('aria-checked')).toBe('true');
  });

  it('emits activate on click with the value', async () => {
    @Component({
      standalone: true,
      imports: [KjListItem],
      template: `<div role="option" aria-selected="false" kjListItem [kjItemValue]="'apple'" (activate)="last = $event">A</div>`,
    })
    class Host { last: unknown = null; }
    const { container, fixture } = await render(Host);
    (container.querySelector('[kjListItem]') as HTMLElement).click();
    expect(fixture.componentInstance.last).toBe('apple');
  });

  it('does NOT emit activate when disabled', async () => {
    @Component({
      standalone: true,
      imports: [KjListItem],
      template: `<div role="option" aria-selected="false" kjListItem [kjDisabled]="true" [kjItemValue]="'apple'" (activate)="fired = true">A</div>`,
    })
    class Host { fired = false; }
    const { container, fixture } = await render(Host);
    (container.querySelector('[kjListItem]') as HTMLElement).click();
    expect(fixture.componentInstance.fired).toBe(false);
  });

  it('responds to Enter and Space', async () => {
    @Component({
      standalone: true,
      imports: [KjListItem],
      template: `<div role="option" aria-selected="false" kjListItem [kjItemValue]="'a'" (activate)="count = count + 1">A</div>`,
    })
    class Host { count = 0; }
    const { container, fixture } = await render(Host);
    const el = container.querySelector('[kjListItem]') as HTMLElement;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(fixture.componentInstance.count).toBe(2);
  });

  it('exposes label fallback from text content when kjItemLabel is empty', async () => {
    @Component({
      standalone: true,
      imports: [KjListItem],
      template: `<div role="option" aria-selected="false" kjListItem #i="kjListItem" [kjItemValue]="'a'">  Apple </div>
                 <span data-test>{{ i.label() }}</span>`,
    })
    class Host {}
    const { container } = await render(Host);
    expect(container.querySelector('[data-test]')!.textContent).toBe('Apple');
  });

  it('hides element via [hidden] when setVisible(false)', async () => {
    @Component({
      standalone: true,
      imports: [KjListItem],
      template: `<div role="option" aria-selected="false" kjListItem [kjItemValue]="'a'">A</div>`,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    const item = fixture.debugElement.query(By.directive(KjListItem)).injector.get(KjListItem);
    item.setVisible(false);
    fixture.detectChanges();
    expect(container.querySelector('[kjListItem]')!.hasAttribute('hidden')).toBe(true);
  });

  it('binds aria-keyshortcuts when kjShortcut is set', async () => {
    const { container } = await render(
      `<div role="option" aria-selected="false" kjListItem [kjItemValue]="'a'" [kjShortcut]="'Mod+P'">A</div>`,
      { imports: [KjListItem] },
    );
    expect(container.querySelector('[kjListItem]')!.getAttribute('aria-keyshortcuts')).toBe('Mod+P');
  });

  it('binds aria-posinset and aria-setsize from posInSet/setSize signals', async () => {
    @Component({
      standalone: true,
      imports: [KjListItem],
      template: `<div role="option" aria-selected="false" kjListItem #i="kjListItem" [kjItemValue]="'a'">A</div>`,
    })
    class Host {}
    const { container, fixture } = await render(Host);
    const item = fixture.debugElement.query(By.directive(KjListItem)).injector.get(KjListItem);
    item.posInSet.set(2);
    item.setSize.set(5);
    fixture.detectChanges();
    const el = container.querySelector('[kjListItem]')!;
    expect(el.getAttribute('aria-posinset')).toBe('2');
    expect(el.getAttribute('aria-setsize')).toBe('5');
  });

  it('passes axe accessibility audit', async () => {
    const { container } = await render(
      `<ul role="listbox" aria-label="Options">
         <li role="option" aria-selected="false" kjListItem [kjItemValue]="'a'">A</li>
       </ul>`,
      { imports: [KjListItem] },
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
