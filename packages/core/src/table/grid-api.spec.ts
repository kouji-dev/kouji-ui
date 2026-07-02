import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { render } from '@testing-library/angular';
import { describe, expect, it } from 'vitest';
import { KjTable } from './table';
import { kjColumn } from './column-helpers';

interface User {
  id: string;
  name: string;
  age: number;
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
    kjColumn<User>({ accessorKey: 'name', header: 'Name' }),
    kjColumn<User>({ accessorKey: 'age', header: 'Age', filterFn: 'equals' }),
  ];
  protected readonly data = signal<User[]>([
    { id: '1', name: 'Alice', age: 30 },
    { id: '2', name: 'Bob', age: 25 },
    { id: '3', name: 'Carol', age: 40 },
  ]);
  protected readonly getId = (row: User) => row.id;
}

async function getDir() {
  const r = await render(Host);
  return r.fixture.debugElement.children[0].injector.get(KjTable<User>);
}

describe('KjGridApi (regrouped)', () => {
  it('rows: count / displayedCount / filteredCount', async () => {
    const { rows } = (await getDir()).gridApi;
    expect(rows.count()).toBe(3);
    expect(rows.displayedCount()).toBe(3);
    expect(rows.filteredCount()).toBe(3);
  });

  it('selection: select/deselect/toggle/all/clear', async () => {
    const { selection } = (await getDir()).gridApi;
    expect(selection.has()).toBe(false);

    selection.select('1');
    expect(selection.has()).toBe(true);
    expect(selection.ids()).toEqual(['1']);

    selection.toggle('2');
    expect([...selection.ids()].sort()).toEqual(['1', '2']);

    selection.deselect('1');
    expect(selection.ids()).toEqual(['2']);

    selection.all();
    expect([...selection.ids()].sort()).toEqual(['1', '2', '3']);

    selection.clear();
    expect(selection.has()).toBe(false);
  });

  it('sort: set / clear', async () => {
    const { sort } = (await getDir()).gridApi;
    sort.set([{ id: 'name', desc: true }]);
    expect(sort.get()).toEqual([{ id: 'name', desc: true }]);
    sort.clear();
    expect(sort.get()).toEqual([]);
  });

  it('filter: column set/clear, global, clearAll', async () => {
    const { filter, rows } = (await getDir()).gridApi;
    filter.set('age', 30);
    expect(filter.get('age')).toBe(30);
    expect(rows.filteredCount()).toBe(1);
    filter.clear('age');
    expect(filter.get('age')).toBeUndefined();
    expect(rows.filteredCount()).toBe(3);

    filter.global.set('al');
    expect(filter.global.get()).toBe('al');
    filter.clearAll();
    expect(filter.global.get()).toBe('');
    expect(filter.all()).toEqual([]);
  });

  it('pagination: next/previous/first/last + setPageSize resets index', async () => {
    const { pagination } = (await getDir()).gridApi;
    pagination.setPageSize(1);
    expect(pagination.pageCount()).toBe(3);
    pagination.next();
    expect(pagination.get().pageIndex).toBe(1);
    pagination.last();
    expect(pagination.get().pageIndex).toBe(2);
    pagination.previous();
    expect(pagination.get().pageIndex).toBe(1);
    pagination.first();
    expect(pagination.get().pageIndex).toBe(0);
    pagination.setPageSize(2);
    expect(pagination.get()).toEqual({ pageIndex: 0, pageSize: 2 });
  });

  it('density: get/set', async () => {
    const { density } = (await getDir()).gridApi;
    expect(density.get()).toBe('standard');
    density.set('compact');
    expect(density.get()).toBe('compact');
  });

  it('grouping: add / remove / set', async () => {
    const { grouping } = (await getDir()).gridApi;
    grouping.add('name');
    expect(grouping.get()).toEqual(['name']);
    grouping.add('name'); // no-op
    expect(grouping.get()).toEqual(['name']);
    grouping.remove('name');
    expect(grouping.get()).toEqual([]);
    grouping.set(['name', 'age']);
    grouping.remove();
    expect(grouping.get()).toEqual([]);
  });
});

describe('KjColumnApi (regrouped)', () => {
  it('visibility: setVisible / setManyVisible / isVisible', async () => {
    const { visibility } = (await getDir()).columnApi;
    expect(visibility.isVisible('name')).toBe(true);
    visibility.setVisible('name', false);
    expect(visibility.isVisible('name')).toBe(false);
    visibility.setManyVisible(['name', 'age'], true);
    expect(visibility.isVisible('name')).toBe(true);
    expect(visibility.isVisible('age')).toBe(true);
  });

  it('pinning: pin / of', async () => {
    const { pinning } = (await getDir()).columnApi;
    expect(pinning.of('name')).toBeNull();
    pinning.pin('name', 'left');
    expect(pinning.of('name')).toBe('left');
    pinning.pin('name', 'right');
    expect(pinning.of('name')).toBe('right');
    pinning.pin('name', null);
    expect(pinning.of('name')).toBeNull();
  });

  it('order: move', async () => {
    const { order } = (await getDir()).columnApi;
    order.move('age', 0);
    expect(order.get()[0]).toBe('age');
  });

  it('grouping (per-column): is / set', async () => {
    const { grouping } = (await getDir()).columnApi;
    grouping.set('name', true);
    expect(grouping.is('name')).toBe(true);
    grouping.set('name', false);
    expect(grouping.is('name')).toBe(false);
  });

  it('reset() clears every column-level slice', async () => {
    const colApi = (await getDir()).columnApi;
    colApi.pinning.pin('name', 'left');
    colApi.visibility.setVisible('age', false);
    colApi.grouping.set('name', true);
    colApi.reset();
    expect(colApi.pinning.of('name')).toBeNull();
    expect(colApi.visibility.isVisible('age')).toBe(true);
    expect(colApi.grouping.is('name')).toBe(false);
  });
});
