import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from './table';
import { KjCellTemplate } from './table-cell-template';

interface Row {
  id: string;
  name: string;
  role: string;
}

const ROWS: Row[] = [
  { id: '1', name: 'Alice', role: 'admin' },
  { id: '2', name: 'Bob', role: 'viewer' },
];

@Component({
  standalone: true,
  imports: [KjTableComponent, KjCellTemplate],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-table [kjData]="rows" [kjColumns]="cols" [kjGetRowId]="getRowId">
      <ng-template kjCellTemplate="role" let-row let-value="value">
        <span class="custom-role" [attr.data-role]="row.role">R:{{ value }}</span>
      </ng-template>
    </kj-table>
  `,
})
class HostComponent {
  rows = ROWS;
  cols: KjColumnDef<Row>[] = [
    kjColumn<Row>({ id: 'name', accessorKey: 'name', header: 'Name' }),
    kjColumn<Row>({ id: 'role', accessorKey: 'role', header: 'Role' }),
  ];
  getRowId = (r: Row) => r.id;
}

describe('KjCellTemplate', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders the registered template for its column and default text elsewhere', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const custom = fixture.nativeElement.querySelectorAll('.custom-role');
    expect(custom.length).toBe(2);
    expect(custom[0].textContent).toBe('R:admin');
    expect(custom[0].getAttribute('data-role')).toBe('admin');
    // name column stays plain text
    expect(fixture.nativeElement.textContent).toContain('Alice');
  });
});

@Component({
  standalone: true,
  imports: [KjTableComponent, KjCellTemplate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <kj-table [kjData]="rows()" [kjColumns]="cols" [kjGetRowId]="getRowId">
      <ng-template kjCellTemplate="role" let-value="value">
        <span class="custom-role">R:{{ value }}</span>
      </ng-template>
    </kj-table>
  `,
})
class DataHost {
  readonly rows = signal<Row[]>(ROWS);
  readonly cols: KjColumnDef<Row>[] = [
    kjColumn<Row>({ id: 'name', accessorKey: 'name', header: 'Name' }),
    kjColumn<Row>({ id: 'role', accessorKey: 'role', header: 'Role' }),
  ];
  readonly getRowId = (r: Row): string => r.id;
}

describe('KjCellTemplate — data re-set after init', () => {
  test('a filter / tab change re-setting kjData twice after a cell was focused still renders the rows (NG0950)', async () => {
    TestBed.configureTestingModule({ imports: [DataHost] });
    const fixture = TestBed.createComponent(DataHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelectorAll<HTMLElement>('tbody td')[1]!.focus();
    fixture.detectChanges();

    fixture.componentInstance.rows.set([{ id: '3', name: 'Cleo', role: 'owner' }]);
    fixture.detectChanges();
    fixture.componentInstance.rows.set([
      { id: '4', name: 'Dan', role: 'admin' },
      { id: '5', name: 'Eve', role: 'viewer' },
      { id: '6', name: 'Fay', role: 'owner' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const roles = Array.from(el.querySelectorAll('.custom-role')).map((n) => n.textContent);
    expect(roles).toEqual(['R:admin', 'R:viewer', 'R:owner']);
    expect(el.textContent).toContain('Eve');
  });
});
