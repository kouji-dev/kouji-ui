import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { KjTableHeader } from './table-header';
import { KjTableSort } from './table-sort';
import { kjColumn } from './column-helpers';

interface Row {
  name: string;
  age: number;
}

@Component({
  standalone: true,
  imports: [KjTable, KjTableHeader],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <table [kjTable]="cols" [kjTableData]="data()" #t="kjTable">
      <thead>
        @for (g of t.table().getHeaderGroups(); track g.id) {
          <tr>
            @for (h of g.headers; track h.id) {
              <th kjTableHeader [kjHeader]="h" scope="col">{{ h.column.columnDef.header }}</th>
            }
          </tr>
        }
      </thead>
    </table>
  `,
})
class Host {
  protected readonly cols = [kjColumn<Row>({ accessorKey: 'name', header: 'Name' })];
  protected readonly data = signal<Row[]>([{ name: 'a', age: 1 }, { name: 'b', age: 2 }]);
}

@Component({
  standalone: true,
  imports: [KjTable, KjTableHeader, KjTableSort],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <table [kjTable]="cols" [kjTableData]="data()" #t="kjTable">
      <thead>
        @for (g of t.table().getHeaderGroups(); track g.id) {
          <tr>
            @for (h of g.headers; track h.id) {
              <th kjTableHeader [kjHeader]="h" scope="col">
                <button kjTableSort>{{ h.column.columnDef.header }}</button>
              </th>
            }
          </tr>
        }
      </thead>
    </table>
  `,
})
class ButtonHost {
  protected readonly cols = [
    kjColumn<Row>({ accessorKey: 'name', header: 'Name' }),
    kjColumn<Row>({ accessorKey: 'age', header: 'Age' }),
  ];
  protected readonly data = signal<Row[]>([{ name: 'a', age: 1 }, { name: 'b', age: 2 }]);
}

describe('KjTableHeader', () => {
  it('sets aria-sort to none initially', async () => {
    const { container } = await render(Host);
    const th = container.querySelector('th') as HTMLElement;
    expect(th.getAttribute('aria-sort')).toBe('none');
  });

  it('toggles aria-sort on click', async () => {
    const { container, fixture } = await render(Host);
    const th = container.querySelector('th') as HTMLElement;
    th.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    th.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('descending');
  });

  it('without a sort button the <th> stays the focusable control and Enter toggles it', async () => {
    const { container, fixture } = await render(Host);
    const th = container.querySelector('th') as HTMLElement;
    expect(th.getAttribute('tabindex')).toBe('0');
    th.focus();
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('ascending');
  });
});

describe('KjTableHeader with a [kjTableSort] button', () => {
  it('the button is the control: real <button type="button">, named by the column label', async () => {
    const { container } = await render(ButtonHost);
    const button = container.querySelector('th button') as HTMLButtonElement;
    expect(button.getAttribute('type')).toBe('button');
    expect(button.textContent?.trim()).toBe('Name');
  });

  it('takes the <th> out of the Tab order and keeps aria-sort on it', async () => {
    const { container, fixture } = await render(ButtonHost);
    const th = container.querySelector('th') as HTMLElement;
    const button = th.querySelector('button') as HTMLButtonElement;
    expect(th.hasAttribute('tabindex')).toBe(false);
    expect(th.getAttribute('aria-sort')).toBe('none');
    button.focus();
    expect(document.activeElement).toBe(button);
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('ascending');
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('descending');
  });

  it('a click on the button toggles once, not twice through the <th>', async () => {
    const { container, fixture } = await render(ButtonHost);
    const th = container.querySelector('th') as HTMLElement;
    th.querySelector('button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('ascending');
  });

  it('a click on the cell outside the button still toggles the sort', async () => {
    const { container, fixture } = await render(ButtonHost);
    const th = container.querySelector('th') as HTMLElement;
    th.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(th.getAttribute('aria-sort')).toBe('ascending');
  });

  it('Shift-click on a second column adds a secondary sort instead of replacing the first', async () => {
    const { container, fixture } = await render(ButtonHost);
    const [name, age] = Array.from(container.querySelectorAll<HTMLElement>('th'));
    name.querySelector('button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    age.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(name.getAttribute('aria-sort')).toBe('ascending');
    // TanStack sorts numeric columns descending first.
    expect(age.getAttribute('aria-sort')).toBe('descending');
  });

  it('a plain click on a second column replaces the sort', async () => {
    const { container, fixture } = await render(ButtonHost);
    const [name, age] = Array.from(container.querySelectorAll<HTMLElement>('th'));
    name.querySelector('button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    age.querySelector('button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(name.getAttribute('aria-sort')).toBe('none');
    expect(age.getAttribute('aria-sort')).toBe('descending');
  });
});
