import { Component } from '@angular/core';
import { ColumnDef } from '@tanstack/angular-table';
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjTable, KjTableHeader } from './table';

expect.extend(toHaveNoViolations);

interface User { name: string; age: number; }

@Component({
  standalone: true,
  imports: [KjTable, KjTableHeader],
  template: `
    <table [kjTable]="columns" [kjTableData]="data" #tbl="kjTable">
      <thead>
        @for (hg of tbl.table().getHeaderGroups(); track hg.id) {
          <tr>
            @for (h of hg.headers; track h.id) {
              <th kjTableHeader [kjHeader]="h" scope="col">{{ h.id }}</th>
            }
          </tr>
        }
      </thead>
      <tbody>
        @for (row of tbl.table().getRowModel().rows; track row.id) {
          <tr>
            @for (cell of row.getVisibleCells(); track cell.id) {
              <td>{{ cell.getValue() }}</td>
            }
          </tr>
        }
      </tbody>
    </table>`,
})
class TableTestComponent {
  columns: ColumnDef<User>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'age', header: 'Age' },
  ];
  data: User[] = [
    { name: 'Alice', age: 30 },
    { name: 'Bob', age: 25 },
  ];
}

describe('KjTable', () => {
  it('renders table headers', async () => {
    const { container } = await render(TableTestComponent);
    const headers = container.querySelectorAll('th');
    expect(headers.length).toBe(2);
  });

  it('renders data rows', async () => {
    const { container } = await render(TableTestComponent);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('renders cell data', async () => {
    const { getByText } = await render(TableTestComponent);
    expect(getByText('Alice')).toBeInTheDocument();
    expect(getByText('Bob')).toBeInTheDocument();
  });

  it('passes axe audit', async () => {
    const { container } = await render(TableTestComponent);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('sortable header has tabindex=0', async () => {
    const { container } = await render(TableTestComponent);
    const ths = container.querySelectorAll('th');
    ths.forEach(th => expect(th).toHaveAttribute('tabindex', '0'));
  });

  it('sortable header has aria-sort="none" initially', async () => {
    const { container } = await render(TableTestComponent);
    const ths = container.querySelectorAll('th');
    ths.forEach(th => expect(th).toHaveAttribute('aria-sort', 'none'));
  });

  it('non-sortable column header has no cursor:pointer', async () => {
    @Component({
      standalone: true,
      imports: [KjTable, KjTableHeader],
      template: `
        <table [kjTable]="columns" [kjTableData]="data" #tbl="kjTable">
          <thead>
            @for (hg of tbl.table().getHeaderGroups(); track hg.id) {
              <tr>
                @for (h of hg.headers; track h.id) {
                  <th kjTableHeader [kjHeader]="h" scope="col">{{ h.id }}</th>
                }
              </tr>
            }
          </thead>
          <tbody></tbody>
        </table>`,
    })
    class NoSortTableComponent {
      columns: ColumnDef<User>[] = [
        { accessorKey: 'name', header: 'Name', enableSorting: false },
      ];
      data: User[] = [{ name: 'Alice', age: 30 }];
    }

    const { container } = await render(NoSortTableComponent);
    const th = container.querySelector('th')!;
    expect(th.style.cursor).not.toBe('pointer');
    expect(th.hasAttribute('data-sort')).toBe(false);
  });
});
