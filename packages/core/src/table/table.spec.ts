import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { ColumnDef } from '@tanstack/angular-table';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { KjTableHeader } from './table-header';
import { kjColumn } from './column-helpers';

expect.extend(toHaveNoViolations);

interface User {
  name: string;
  age: number;
}

@Component({
  standalone: true,
  imports: [KjTable, KjTableHeader],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: ` <table [kjTable]="columns" [kjTableData]="data" #tbl="kjTable">
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
    ths.forEach((th) => expect(th).toHaveAttribute('tabindex', '0'));
  });

  it('sortable header has aria-sort="none" initially', async () => {
    const { container } = await render(TableTestComponent);
    const ths = container.querySelectorAll('th');
    ths.forEach((th) => expect(th).toHaveAttribute('aria-sort', 'none'));
  });

  it('non-sortable column header has no cursor:pointer', async () => {
    @Component({
      standalone: true,
      imports: [KjTable, KjTableHeader],
      template: ` <table [kjTable]="columns" [kjTableData]="data" #tbl="kjTable">
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
      columns: ColumnDef<User>[] = [{ accessorKey: 'name', header: 'Name', enableSorting: false }];
      data: User[] = [{ name: 'Alice', age: 30 }];
    }

    const { container } = await render(NoSortTableComponent);
    const th = container.querySelector('th')!;
    expect(th.style.cursor).not.toBe('pointer');
    expect(th.hasAttribute('data-sort')).toBe(false);
  });
});

interface Row {
  id: string;
  name: string;
}

@Component({
  standalone: true,
  imports: [KjTable],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<table [kjTable]="cols" [kjTableData]="data()" #t="kjTable"></table>`,
})
class Host {
  protected readonly cols = [kjColumn<Row>({ accessorKey: 'name', header: 'Name' })];
  protected readonly data = signal<Row[]>([
    { id: '1', name: 'alice' },
    { id: '2', name: 'bob' },
  ]);
}

describe('KjTable (extended)', () => {
  it('exposes every state slice via the deep state signal', async () => {
    const { fixture } = await render(Host);
    const dir = fixture.debugElement.children[0].injector.get(KjTable);
    expect(dir.state.sorting()).toEqual([]);
    expect(dir.state.columnFilters()).toEqual([]);
    expect(dir.state.globalFilter()).toBe('');
    expect(dir.state.pagination()).toEqual({ pageIndex: 0, pageSize: 25 });
    expect(dir.state.rowSelection()).toEqual({});
    expect(dir.state.columnSizing()).toEqual({});
    expect(dir.state.columnVisibility()).toEqual({});
    expect(dir.state.columnOrder()).toEqual([]);
    expect(dir.state.columnPinning()).toEqual({ left: [], right: [] });
    expect(dir.state.expanded()).toEqual({});
    expect(dir.state.grouping()).toEqual([]);
    expect(dir.state.density()).toBe('standard');
  });

  it('state() returns the full bundle and setState merges', async () => {
    const { fixture } = await render(Host);
    const dir = fixture.debugElement.children[0].injector.get(KjTable);
    dir.setState({ density: 'compact', globalFilter: 'al' });
    expect(dir.state.density()).toBe('compact');
    expect(dir.state.globalFilter()).toBe('al');
    expect(dir.state().density).toBe('compact');
  });

  it('resetState clears all slices', async () => {
    const { fixture } = await render(Host);
    const dir = fixture.debugElement.children[0].injector.get(KjTable);
    dir.setState({ density: 'compact', globalFilter: 'x' });
    dir.resetState();
    expect(dir.state.density()).toBe('standard');
    expect(dir.state.globalFilter()).toBe('');
  });
});
