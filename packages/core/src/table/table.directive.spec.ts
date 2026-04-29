import { Component } from '@angular/core';
import { ColumnDef } from '@tanstack/angular-table';
import { render, fireEvent } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { KjTableDirective, KjTableHeaderDirective } from './table.directive';

expect.extend(toHaveNoViolations);

interface User { name: string; age: number; }

@Component({
  standalone: true,
  imports: [KjTableDirective, KjTableHeaderDirective],
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

describe('KjTableDirective', () => {
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
});
