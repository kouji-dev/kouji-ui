import { Component, signal } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { KjTableRow } from './table-row';
import { kjColumn } from './column-helpers';

interface Row { id: string; name: string; }

@Component({
  standalone: true,
  imports: [KjTable, KjTableRow],
  template: `
    <table [kjTable]="cols" [kjTableData]="data()" #t="kjTable">
      <tbody>
        @for (r of t.table().getRowModel().rows; track r.id) {
          <tr kjTableRow [kjRow]="r"></tr>
        }
      </tbody>
    </table>
  `,
})
class Host {
  protected readonly cols = [kjColumn<Row>({ accessorKey: 'name', header: 'Name' })];
  protected readonly data = signal<Row[]>([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }]);
}

describe('KjTableRow', () => {
  it('sets role="row" and aria-rowindex', async () => {
    const { container } = await render(Host);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].getAttribute('role')).toBe('row');
    expect(rows[0].getAttribute('aria-rowindex')).toBe('2'); // 1 = header
    expect(rows[1].getAttribute('aria-rowindex')).toBe('3');
  });

  it('reflects aria-selected when row is selected', async () => {
    const { container, fixture } = await render(Host);
    const dir = fixture.debugElement.children[0].injector.get(KjTable);
    // TanStack default row id is the row index as a string ('0' = first row).
    dir.setState({ rowSelection: { '0': true } });
    fixture.detectChanges();
    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].getAttribute('aria-selected')).toBe('true');
    expect(rows[1].getAttribute('aria-selected')).toBe('false');
  });
});
