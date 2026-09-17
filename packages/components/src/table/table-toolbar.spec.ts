import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ColumnDef } from '@tanstack/angular-table';
import { describe, expect, test, beforeEach } from 'vitest';
import {
  FR_CATALOG,
  KjTable,
  provideKjLocale,
  provideKjTranslations,
} from '@kouji-ui/core';
import { KjTableToolbar, KjBulkAction } from './table-toolbar';

interface Row {
  id: string;
  name: string;
  age: number;
}

const COLUMNS: ColumnDef<Row>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'age', header: 'Age' },
];

const DATA: Row[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
];

/**
 * Host wires the headless `KjTable` directive on a real `<table>` so the
 * toolbar can resolve `KJ_TABLE` via DI without depending on the (parallel)
 * `<kj-table>` styled wrapper.
 */
@Component({
  standalone: true,
  imports: [KjTable, KjTableToolbar, KjBulkAction],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <table [kjTable]="columns" [kjTableData]="data" #tbl="kjTable">
      <thead></thead>
      <tbody></tbody>
      <caption>
        <kj-table-toolbar>
          <button kjBulkAction class="bulk-btn">Delete</button>
        </kj-table-toolbar>
      </caption>
    </table>
  `,
})
class HostComponent {
  columns = COLUMNS;
  data = DATA;
}

function getToolbarHost(rootEl: HTMLElement): HTMLElement {
  const host = rootEl.querySelector('kj-table-toolbar') as HTMLElement | null;
  if (!host) throw new Error('toolbar host element not found');
  return host;
}

function getTableDir(fixture: ComponentFixture<HostComponent>): KjTable<Row> {
  // Angular's own debug-node query, rather than a hand-rolled structural cast
  // over `fixture` — the cast hid the real `ComponentFixture` signature and
  // broke under strict function types.
  const node = fixture.debugElement.query(By.directive(KjTable));
  if (!node) throw new Error('table debug node not found');
  return node.injector.get(KjTable) as unknown as KjTable<Row>;
}

describe('KjTableToolbar', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  test('renders host element with role="toolbar" and aria-label', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = getToolbarHost(fixture.nativeElement);
    expect(host.getAttribute('role')).toBe('toolbar');
    expect(host.getAttribute('aria-label')).toBe('Data table toolbar');
  });

  /**
   * cust F-7 — the toolbar's name and its bulk-action group's name were
   * literals (one in the `host` block, one in the template), so no registered
   * catalog could reach them. Both go through `KjTranslateService` now; this is
   * the half that proves it, since the English values are unchanged.
   */
  test('the toolbar and bulk-action names follow a registered catalog', () => {
    TestBed.configureTestingModule({
      providers: [provideKjLocale({ locale: 'fr' }), provideKjTranslations({ fr: FR_CATALOG })],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = getToolbarHost(fixture.nativeElement);
    expect(host.getAttribute('aria-label')).toBe(FR_CATALOG['table.toolbar']);

    // The bulk group only renders once something is selected.
    getTableDir(fixture).setState({ rowSelection: { '0': true } });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.kj-table-toolbar__bulk')!.getAttribute('aria-label'),
    ).toBe(FR_CATALOG['table.bulkActions']);
  });

  test('typing in the quick-filter input writes KjTable.globalFilter', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const dir = getTableDir(fixture);
    const input = fixture.nativeElement.querySelector(
      'kj-table-toolbar input[type="search"]',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    input.value = 'ali';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(dir.state.globalFilter()).toBe('ali');
  });

  test('clicking a density button updates KjTable.density', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const dir = getTableDir(fixture);

    expect(dir.state.density()).toBe('standard');

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.kj-table-toolbar__density button'),
    ) as HTMLButtonElement[];
    // 3 segmented buttons: compact / standard / comfortable
    expect(buttons.length).toBe(3);

    buttons[0].click(); // compact
    fixture.detectChanges();
    expect(dir.state.density()).toBe('compact');

    buttons[2].click(); // comfortable
    fixture.detectChanges();
    expect(dir.state.density()).toBe('comfortable');
  });

  test('column visibility menu lists every leaf column', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    // The menu items are rendered eagerly into the DOM (they live inside
    // kj-dropdown-menu-content, which mounts the panel lazily but the
    // <kj-checkbox> labels are projected through the template). We probe via
    // the projected label text on each checkbox.
    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('kj-table-toolbar kj-checkbox .kj-checkbox-label'),
    ) as HTMLElement[];

    const text = labels.map((el) => el.textContent?.trim()).filter(Boolean);
    expect(text).toEqual(expect.arrayContaining(['ID', 'Name', 'Age']));
    expect(text.length).toBe(3);
  });

  test('bulk slot is hidden by default and appears when rowSelection has a true value', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    // No selection → bulk slot wrapper should NOT exist.
    expect(fixture.nativeElement.querySelector('.kj-table-toolbar__bulk')).toBeNull();

    const dir = getTableDir(fixture);
    dir.setState({ rowSelection: { '0': true } });
    fixture.detectChanges();

    const bulk = fixture.nativeElement.querySelector(
      '.kj-table-toolbar__bulk',
    ) as HTMLElement | null;
    expect(bulk).not.toBeNull();
    // Projected bulk button is rendered inside.
    expect(bulk!.querySelector('.bulk-btn')).not.toBeNull();
  });

  test('hides bulk slot again when selection clears to all-false / empty', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const dir = getTableDir(fixture);

    dir.setState({ rowSelection: { '0': true } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kj-table-toolbar__bulk')).not.toBeNull();

    dir.setState({ rowSelection: { '0': false } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kj-table-toolbar__bulk')).toBeNull();

    dir.setState({ rowSelection: {} });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kj-table-toolbar__bulk')).toBeNull();
  });
});
