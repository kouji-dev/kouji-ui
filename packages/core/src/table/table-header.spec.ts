import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { KjTableHeader } from './table-header';
import { kjColumn } from './column-helpers';

interface Row { name: string; }

@Component({
  standalone: true,
  imports: [KjTable, KjTableHeader],
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
  protected readonly data = signal<Row[]>([{ name: 'a' }, { name: 'b' }]);
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
});
