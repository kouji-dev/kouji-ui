import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { kjColumn } from './column-helpers';
import {
  kjTextFilterFn,
  kjNumberFilterFn,
  kjDateFilterFn,
  kjSetFilterFn,
  kjMultiFilterFn,
} from './filter-fns';
import type {
  KjDateFilterModel,
  KjMultiConditionFilterModel,
  KjNumberFilterModel,
  KjSetFilterModel,
  KjTextFilterModel,
} from './filter-models';

interface Row {
  id: string;
  name: string;
  age: number;
  joined: string;
  role: string;
}

@Component({
  standalone: true,
  imports: [KjTable],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<table
    [kjTable]="cols"
    [kjTableData]="data()"
    [kjGetRowId]="getId"
    #t="kjTable"
  ></table>`,
})
class Host {
  protected readonly cols = [
    kjColumn<Row>({ accessorKey: 'name', header: 'Name', filterFn: kjTextFilterFn }),
    kjColumn<Row>({ accessorKey: 'age', header: 'Age', filterFn: kjNumberFilterFn }),
    kjColumn<Row>({ accessorKey: 'joined', header: 'Joined', filterFn: kjDateFilterFn }),
    kjColumn<Row>({ accessorKey: 'role', header: 'Role', filterFn: kjSetFilterFn }),
  ];
  protected readonly data = signal<Row[]>([
    { id: '1', name: 'Alice', age: 30, joined: '2024-01-15', role: 'admin' },
    { id: '2', name: 'Bob', age: 25, joined: '2024-06-01', role: 'editor' },
    { id: '3', name: 'Carol', age: 40, joined: '2025-02-10', role: 'viewer' },
    { id: '4', name: 'Dave', age: 35, joined: '2025-08-22', role: 'editor' },
  ]);
  protected readonly getId = (row: Row) => row.id;
}

async function getDir() {
  const r = await render(Host);
  return r.fixture.debugElement.children[0].injector.get(KjTable<Row>);
}

describe('text filter model', () => {
  it('contains', async () => {
    const { gridApi } = await getDir();
    gridApi.filter.set('name', {
      filterType: 'text',
      type: 'contains',
      filter: 'al',
    } as KjTextFilterModel);
    expect(gridApi.rows.filteredCount()).toBe(1); // Alice
  });

  it('startsWith / endsWith', async () => {
    const { gridApi } = await getDir();
    gridApi.filter.set('name', { filterType: 'text', type: 'startsWith', filter: 'B' });
    expect(gridApi.rows.filteredCount()).toBe(1);
    gridApi.filter.set('name', { filterType: 'text', type: 'endsWith', filter: 'l' });
    expect(gridApi.rows.filteredCount()).toBe(1); // Carol
  });

  it('blank / notBlank', async () => {
    const { gridApi } = await getDir();
    gridApi.filter.set('name', { filterType: 'text', type: 'notBlank' });
    expect(gridApi.rows.filteredCount()).toBe(4);
    gridApi.filter.set('name', { filterType: 'text', type: 'blank' });
    expect(gridApi.rows.filteredCount()).toBe(0);
  });
});

describe('number filter model', () => {
  it('equals / notEquals', async () => {
    const { gridApi } = await getDir();
    gridApi.filter.set('age', { filterType: 'number', type: 'equals', filter: 30 });
    expect(gridApi.rows.filteredCount()).toBe(1);
    gridApi.filter.set('age', { filterType: 'number', type: 'notEquals', filter: 30 });
    expect(gridApi.rows.filteredCount()).toBe(3);
  });

  it('inRange', async () => {
    const { gridApi } = await getDir();
    const model: KjNumberFilterModel = {
      filterType: 'number',
      type: 'inRange',
      filter: 28,
      filterTo: 36,
    };
    gridApi.filter.set('age', model);
    expect(gridApi.rows.filteredCount()).toBe(2); // 30, 35
  });

  it('greaterThan / lessThanOrEqual', async () => {
    const { gridApi } = await getDir();
    gridApi.filter.set('age', { filterType: 'number', type: 'greaterThan', filter: 30 });
    expect(gridApi.rows.filteredCount()).toBe(2);
    gridApi.filter.set('age', { filterType: 'number', type: 'lessThanOrEqual', filter: 30 });
    expect(gridApi.rows.filteredCount()).toBe(2);
  });
});

describe('date filter model', () => {
  it('inRange', async () => {
    const { gridApi } = await getDir();
    const model: KjDateFilterModel = {
      filterType: 'date',
      type: 'inRange',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
    };
    gridApi.filter.set('joined', model);
    expect(gridApi.rows.filteredCount()).toBe(2);
  });

  it('greaterThan / lessThan', async () => {
    const { gridApi } = await getDir();
    gridApi.filter.set('joined', {
      filterType: 'date',
      type: 'greaterThan',
      dateFrom: '2025-01-01',
    });
    expect(gridApi.rows.filteredCount()).toBe(2);
    gridApi.filter.set('joined', { filterType: 'date', type: 'lessThan', dateFrom: '2024-06-01' });
    expect(gridApi.rows.filteredCount()).toBe(1);
  });
});

describe('set filter model', () => {
  it('matches any of the listed values', async () => {
    const { gridApi } = await getDir();
    const model: KjSetFilterModel = { filterType: 'set', values: ['admin', 'editor'] };
    gridApi.filter.set('role', model);
    expect(gridApi.rows.filteredCount()).toBe(3);
  });

  it('empty values = no filter', async () => {
    const { gridApi } = await getDir();
    gridApi.filter.set('role', { filterType: 'set', values: [] });
    expect(gridApi.rows.filteredCount()).toBe(4);
  });
});

describe('multi-condition filter (AND/OR)', () => {
  it('AND', async () => {
    const { gridApi } = await getDir();
    const model: KjMultiConditionFilterModel = {
      filterType: 'multi',
      operator: 'AND',
      conditions: [
        { filterType: 'number', type: 'greaterThan', filter: 28 },
        { filterType: 'number', type: 'lessThan', filter: 36 },
      ],
    };
    // Apply against age column — kjMultiFilterFn dispatches by inner filterType.
    // Use direct fn invocation here because TanStack columns only have one filterFn at a time.
    const passed = gridApi.rows
      .all()
      .filter((r) =>
        kjMultiFilterFn(
          { getValue: () => r.age } as unknown as Parameters<typeof kjMultiFilterFn>[0],
          'age',
          model,
        ),
      );
    expect(passed.length).toBe(2);
  });

  it('OR', async () => {
    const { gridApi } = await getDir();
    const model: KjMultiConditionFilterModel = {
      filterType: 'multi',
      operator: 'OR',
      conditions: [
        { filterType: 'number', type: 'lessThan', filter: 26 },
        { filterType: 'number', type: 'greaterThan', filter: 38 },
      ],
    };
    const passed = gridApi.rows
      .all()
      .filter((r) =>
        kjMultiFilterFn(
          { getValue: () => r.age } as unknown as Parameters<typeof kjMultiFilterFn>[0],
          'age',
          model,
        ),
      );
    expect(passed.length).toBe(2);
  });
});

describe('gridApi.filter.getModel / setModel', () => {
  it('getModel returns structured models keyed by column id', async () => {
    const { gridApi } = await getDir();
    gridApi.filter.set('name', { filterType: 'text', type: 'contains', filter: 'al' });
    gridApi.filter.set('age', { filterType: 'number', type: 'equals', filter: 30 });
    const model = gridApi.filter.getModel();
    expect(model['name']).toEqual({ filterType: 'text', type: 'contains', filter: 'al' });
    expect(model['age']).toEqual({ filterType: 'number', type: 'equals', filter: 30 });
  });

  it('getModel omits raw (non-model) entries', async () => {
    const { gridApi } = await getDir();
    gridApi.filter.set('name', 'alice'); // legacy raw value
    expect(gridApi.filter.getModel()).toEqual({});
  });

  it('setModel replaces every column filter at once', async () => {
    const { gridApi } = await getDir();
    gridApi.filter.set('age', { filterType: 'number', type: 'equals', filter: 30 });
    gridApi.filter.setModel({
      role: { filterType: 'set', values: ['editor'] },
    });
    expect(gridApi.filter.getModelFor('age')).toBeUndefined();
    expect(gridApi.filter.getModelFor('role')).toEqual({ filterType: 'set', values: ['editor'] });
  });

  it('setModel(null) clears everything', async () => {
    const { gridApi } = await getDir();
    gridApi.filter.set('age', { filterType: 'number', type: 'equals', filter: 30 });
    gridApi.filter.setModel(null);
    expect(gridApi.filter.all()).toEqual([]);
  });
});
