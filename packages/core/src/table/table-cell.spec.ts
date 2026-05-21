import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { KjTableRow } from './table-row';
import { KjTableCell } from './table-cell';
import { kjColumn } from './column-helpers';

interface Row { name: string; }

@Component({
  standalone: true,
  imports: [KjTable, KjTableRow, KjTableCell],
  template: `
    <table [kjTable]="cols" [kjTableData]="data()" #t="kjTable">
      <tbody>
        @for (r of t.table().getRowModel().rows; track r.id) {
          <tr kjTableRow [kjRow]="r">
            @for (c of r.getVisibleCells(); track c.id) {
              <td kjTableCell [kjCell]="c">{{ c.getValue() }}</td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
class Host {
  protected readonly cols = [
    kjColumn<Row>({ accessorKey: 'name', header: 'Name' }),
  ];
  protected readonly data = signal<Row[]>([{ name: 'A' }]);
}

describe('KjTableCell', () => {
  it('sets role="gridcell" and aria-colindex', async () => {
    const { container } = await render(Host);
    const td = container.querySelector('tbody td') as HTMLElement;
    expect(td.getAttribute('role')).toBe('gridcell');
    expect(td.getAttribute('aria-colindex')).toBe('1');
  });
});
