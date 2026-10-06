import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { kjColumn, type KjColumnDef } from '@kouji-ui/core';
import { KjTableComponent } from './table';
import { KjCellTemplate } from './table-cell-template';

// Regression guard for an O(n²) first render: every cell read a value derived
// from a content query, and every stamped cell view dirtied that query, so
// each read re-collected it across all views (≈9 s for 500 rows in a browser).

interface Row {
  id: string;
  name: string;
  role: string;
}

const rowsOf = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i),
    name: `n${i}`,
    role: i % 2 ? 'admin' : 'viewer',
  }));

@Component({
  standalone: true,
  imports: [KjTableComponent, KjCellTemplate],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <kj-table
      [kjData]="rows()"
      [kjColumns]="cols"
      [kjGetRowId]="getRowId"
      kjPageSize="all"
      [kjVirtual]="false"
    >
      <ng-template kjCellTemplate="name" let-value="value"
        ><b class="name">{{ value }}</b></ng-template
      >
      <ng-template kjCellTemplate="role" let-value="value"
        ><i class="role">{{ value }}</i></ng-template
      >
    </kj-table>
  `,
})
class Host {
  readonly rows = input<Row[]>([]);
  readonly cols: KjColumnDef<Row>[] = [
    kjColumn<Row>({ id: 'name', accessorKey: 'name', header: 'Name' }),
    kjColumn<Row>({ id: 'role', accessorKey: 'role', header: 'Role' }),
  ];
  readonly getRowId = (r: Row): string => r.id;
}

/** Renders `n` rows and returns the first change detection's duration in ms. */
function renderRows(n: number): { ms: number; el: HTMLElement } {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput('rows', rowsOf(n));
  const t0 = performance.now();
  fixture.detectChanges();
  const ms = performance.now() - t0;
  return { ms, el: fixture.nativeElement as HTMLElement };
}

describe('kj-table render cost with cell templates', () => {
  afterEach(() => vi.restoreAllMocks());

  test('the cell-template map is collected once per render, not once per cell', () => {
    TestBed.configureTestingModule({ imports: [Host] });
    const collect = vi.spyOn(
      KjTableComponent.prototype as unknown as { collectCellTemplates(): unknown },
      'collectCellTemplates',
    );
    const { el } = renderRows(200);
    expect(el.querySelectorAll('.role').length).toBe(200);
    // 400 templated cells; a handful of refresh passes may each re-collect.
    expect(collect.mock.calls.length).toBeLessThan(10);
  });

  test('500 templated rows render within a bound and scale linearly', () => {
    TestBed.configureTestingModule({ imports: [Host] });
    renderRows(20); // warm up: JIT compile + first-use costs
    const small = renderRows(125);
    const large = renderRows(500);
    expect(large.el.querySelectorAll('.name').length).toBe(500);
    // Was ≈5–14 s in jsdom. Generous for slow CI, far below the quadratic cost.
    expect(large.ms).toBeLessThan(4000);
    // 4× the rows: linear ≈ 4×, quadratic ≈ 16×.
    expect(large.ms / small.ms).toBeLessThan(9);
  }, 30_000);
});
