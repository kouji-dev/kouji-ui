// packages/core/src/primitives/list/group.spec.ts
import { By } from '@angular/platform-browser';
import { render } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { KjListGroup, KjListGroupLabel, KjListSeparator } from './group';
import { KjListItem } from './item';

describe('KjListGroup', () => {
  it('sets role=group and a stable id on the host', async () => {
    const { container } = await render(
      `<div kjListGroup></div>`,
      { imports: [KjListGroup] },
    );
    const el = container.querySelector('[kjListGroup]')!;
    expect(el.getAttribute('role')).toBe('group');
    expect(el.id).toMatch(/^kj-list-group-\d+$/);
  });

  it('renders without aria-labelledby when no label is projected', async () => {
    const { container } = await render(
      `<div kjListGroup>
         <div kjListItem [kjItemValue]="'a'">A</div>
       </div>`,
      { imports: [KjListGroup, KjListItem] },
    );
    const el = container.querySelector('[kjListGroup]')!;
    expect(el.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('wires aria-labelledby when a [kjListGroupLabel] child is present', async () => {
    const { container } = await render(
      `<div kjListGroup>
         <div kjListGroupLabel>Fruits</div>
         <div kjListItem [kjItemValue]="'a'">Apple</div>
       </div>`,
      { imports: [KjListGroup, KjListGroupLabel, KjListItem] },
    );
    const group = container.querySelector('[kjListGroup]')!;
    const label = container.querySelector('[kjListGroupLabel]')!;
    expect(label.id).toMatch(/^kj-list-group-label-\d+$/);
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
  });

  it('is visible when items are visible', async () => {
    const { container } = await render(
      `<div kjListGroup>
         <div kjListItem [kjItemValue]="'a'">A</div>
         <div kjListItem [kjItemValue]="'b'">B</div>
       </div>`,
      { imports: [KjListGroup, KjListItem] },
    );
    expect(container.querySelector('[kjListGroup]')!.hasAttribute('hidden')).toBe(false);
  });

  it('auto-hides when every projected item is filter-hidden', async () => {
    const { container, fixture } = await render(
      `<div kjListGroup>
         <div kjListItem [kjItemValue]="'a'">A</div>
         <div kjListItem [kjItemValue]="'b'">B</div>
       </div>`,
      { imports: [KjListGroup, KjListItem] },
    );
    const items = fixture.debugElement
      .queryAll(By.directive(KjListItem))
      .map(d => d.injector.get(KjListItem));
    expect(items.length).toBe(2);
    items.forEach(i => i.setVisible(false));
    fixture.detectChanges();
    expect(container.querySelector('[kjListGroup]')!.hasAttribute('hidden')).toBe(true);
  });

  it('stays visible when at least one item is still visible', async () => {
    const { container, fixture } = await render(
      `<div kjListGroup>
         <div kjListItem [kjItemValue]="'a'">A</div>
         <div kjListItem [kjItemValue]="'b'">B</div>
       </div>`,
      { imports: [KjListGroup, KjListItem] },
    );
    const items = fixture.debugElement
      .queryAll(By.directive(KjListItem))
      .map(d => d.injector.get(KjListItem));
    items[0].setVisible(false);
    fixture.detectChanges();
    expect(container.querySelector('[kjListGroup]')!.hasAttribute('hidden')).toBe(false);
  });
});

describe('KjListSeparator', () => {
  it('renders with role=separator and aria-orientation=horizontal', async () => {
    const { container } = await render(
      `<hr kjListSeparator />`,
      { imports: [KjListSeparator] },
    );
    const el = container.querySelector('[kjListSeparator]')!;
    expect(el.getAttribute('role')).toBe('separator');
    expect(el.getAttribute('aria-orientation')).toBe('horizontal');
  });
});
