import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, test, beforeEach } from 'vitest';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from './table';
import { KjCellTemplateDirective } from './table-cell-template';

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
  imports: [KjTableComponent, KjCellTemplateDirective],
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

describe('KjCellTemplateDirective', () => {
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
