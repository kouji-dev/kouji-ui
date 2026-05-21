import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { Column, Table } from '@tanstack/angular-table';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KjSelect } from '@kouji-ui/core';
import { KjSelectComponent } from '../../select/select';
import { KjDatePickerComponent } from '../../date-picker/date-picker';
import { KjNumberInputComponent } from '../../number-input/number-input';
import {
  KJ_FILTER_CONTEXT,
  type KjFilterContext,
} from './text-filter';
import { KjTextFilter } from './text-filter';
import { KjNumberFilter } from './number-filter';
import { KjDateFilter } from './date-filter';
import { KjSelectFilter } from './select-filter';

interface StubColumn {
  id: string;
  columnDef: { header: string };
  getFilterValue: ReturnType<typeof vi.fn>;
  setFilterValue: ReturnType<typeof vi.fn>;
}

function makeColumn(opts: {
  header?: string;
  id?: string;
  initial?: unknown;
} = {}): StubColumn {
  return {
    id: opts.id ?? 'col',
    columnDef: { header: opts.header ?? 'Name' },
    getFilterValue: vi.fn().mockReturnValue(opts.initial),
    setFilterValue: vi.fn(),
  };
}

function toLocalIso(d: Date | null | undefined): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function provideCtx(column: StubColumn): { provide: typeof KJ_FILTER_CONTEXT; useValue: KjFilterContext } {
  const ctx: KjFilterContext = {
    column: column as unknown as Column<unknown, unknown>,
    table: {} as Table<unknown>,
  };
  return { provide: KJ_FILTER_CONTEXT, useValue: ctx };
}

// ---------- KjTextFilter ----------

describe('KjTextFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('seeds the input from column.getFilterValue() on init', () => {
    const column = makeColumn({ header: 'Name', initial: 'alice' });
    TestBed.configureTestingModule({
      imports: [KjTextFilter],
      providers: [provideCtx(column)],
    });
    const fixture = TestBed.createComponent(KjTextFilter);
    fixture.detectChanges();
    expect(column.getFilterValue).toHaveBeenCalled();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('alice');
    // Accessible name comes from the wrapping <label>'s visually-hidden caption.
    const labelText = (fixture.nativeElement.querySelector('label')?.textContent ?? '').trim();
    expect(labelText).toBe('Filter by Name');
  });

  it('typing calls column.setFilterValue after the 300ms debounce', () => {
    const column = makeColumn({ header: 'Name' });
    TestBed.configureTestingModule({
      imports: [KjTextFilter],
      providers: [provideCtx(column)],
    });
    const fixture = TestBed.createComponent(KjTextFilter);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = 'bob';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // Before debounce elapses, no write.
    expect(column.setFilterValue).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(column.setFilterValue).toHaveBeenCalledTimes(1);
    expect(column.setFilterValue).toHaveBeenCalledWith({
      filterType: 'text',
      type: 'contains',
      filter: 'bob',
    });
  });
});

// ---------- KjNumberFilter ----------

describe('KjNumberFilter', () => {
  it('seeds the inRange operator + both inputs from a legacy [min, max] tuple', () => {
    const column = makeColumn({ header: 'Age', initial: [18, 65] });
    TestBed.configureTestingModule({
      imports: [KjNumberFilter],
      providers: [provideCtx(column)],
    });
    const fixture = TestBed.createComponent(KjNumberFilter);
    fixture.detectChanges();
    const pickers = fixture.debugElement
      .queryAll(By.directive(KjNumberInputComponent))
      .map((d) => d.componentInstance as KjNumberInputComponent);
    expect(pickers.length).toBe(2);
    expect(pickers[0].kjValue()).toBe(18);
    expect(pickers[1].kjValue()).toBe(65);
    expect(pickers[0].kjAriaLabel()).toBe('Filter Age minimum');
    expect(pickers[1].kjAriaLabel()).toBe('Filter Age maximum');
  });

  it('default operator is `equals` and renders a single primary input', () => {
    const column = makeColumn({ header: 'Age' });
    TestBed.configureTestingModule({
      imports: [KjNumberFilter],
      providers: [provideCtx(column)],
    });
    const fixture = TestBed.createComponent(KjNumberFilter);
    fixture.detectChanges();
    const pickers = fixture.debugElement.queryAll(By.directive(KjNumberInputComponent));
    expect(pickers.length).toBe(1);
    (pickers[0].componentInstance as KjNumberInputComponent).kjValue.set(21);
    expect(column.setFilterValue).toHaveBeenLastCalledWith({
      filterType: 'number', type: 'equals', filter: 21,
    });
  });

  it('switching operator to `inRange` via the native <select> reveals the second input', () => {
    const column = makeColumn({ header: 'Age' });
    TestBed.configureTestingModule({
      imports: [KjNumberFilter],
      providers: [provideCtx(column)],
    });
    const fixture = TestBed.createComponent(KjNumberFilter);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(KjSelectComponent));
    expect(select).toBeTruthy();
    select.triggerEventHandler('valueChange', 'inRange');
    fixture.detectChanges();
    const pickers = fixture.debugElement.queryAll(By.directive(KjNumberInputComponent));
    expect(pickers.length).toBe(2);
    (pickers[0].componentInstance as KjNumberInputComponent).kjValue.set(10);
    (pickers[1].componentInstance as KjNumberInputComponent).kjValue.set(20);
    expect(column.setFilterValue).toHaveBeenLastCalledWith({
      filterType: 'number', type: 'inRange', filter: 10, filterTo: 20,
    });
  });

  it('`blank` operator hides the inputs and writes a no-value model', () => {
    const column = makeColumn({ header: 'Age' });
    TestBed.configureTestingModule({
      imports: [KjNumberFilter],
      providers: [provideCtx(column)],
    });
    const fixture = TestBed.createComponent(KjNumberFilter);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(KjSelectComponent));
    select.triggerEventHandler('valueChange', 'blank');
    fixture.detectChanges();
    const pickers = fixture.debugElement.queryAll(By.directive(KjNumberInputComponent));
    expect(pickers.length).toBe(0);
    expect(column.setFilterValue).toHaveBeenLastCalledWith({
      filterType: 'number', type: 'blank',
    });
  });
});

// ---------- KjDateFilter ----------

describe('KjDateFilter', () => {
  it('seeds both from/to inputs from an existing [from, to] tuple', () => {
    const column = makeColumn({
      header: 'Joined',
      initial: ['2024-01-01', '2024-12-31'],
    });
    TestBed.configureTestingModule({
      imports: [KjDateFilter],
      providers: [provideCtx(column)],
    });
    const fixture = TestBed.createComponent(KjDateFilter);
    fixture.detectChanges();
    const [fromPicker, toPicker] = fixture.debugElement
      .queryAll(By.directive(KjDatePickerComponent))
      .map((d) => d.componentInstance as KjDatePickerComponent);
    expect(toLocalIso(fromPicker.kjValue())).toBe('2024-01-01');
    expect(toLocalIso(toPicker.kjValue())).toBe('2024-12-31');
    const captions = Array.from(
      fixture.nativeElement.querySelectorAll('.kj-date-filter__caption'),
    ) as HTMLElement[];
    expect((captions[0].textContent ?? '').trim()).toBe('Filter by Joined from date');
    expect((captions[1].textContent ?? '').trim()).toBe('Filter by Joined to date');
  });

  it('typing in from/to writes a [from, to] tuple via setFilterValue', () => {
    const column = makeColumn({ header: 'Joined' });
    TestBed.configureTestingModule({
      imports: [KjDateFilter],
      providers: [provideCtx(column)],
    });
    const fixture = TestBed.createComponent(KjDateFilter);
    fixture.detectChanges();
    const [fromPicker, toPicker] = fixture.debugElement
      .queryAll(By.directive(KjDatePickerComponent))
      .map((d) => d.componentInstance as KjDatePickerComponent);

    fromPicker.kjValue.set(new Date(2025, 2, 1));
    expect(column.setFilterValue).toHaveBeenLastCalledWith({
      filterType: 'date', type: 'inRange', dateFrom: '2025-03-01', dateTo: undefined,
    });

    toPicker.kjValue.set(new Date(2025, 3, 1));
    expect(column.setFilterValue).toHaveBeenLastCalledWith({
      filterType: 'date', type: 'inRange', dateFrom: '2025-03-01', dateTo: '2025-04-01',
    });
  });
});

// ---------- KjSelectFilter ----------

describe('KjSelectFilter', () => {
  const OPTIONS = [
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
  ];

  it('seeds the dropdown to the option matching column.getFilterValue()', () => {
    const column = makeColumn({ header: 'Status', initial: 'archived' });
    TestBed.configureTestingModule({
      imports: [KjSelectFilter],
      providers: [provideCtx(column)],
    });
    const fixture = TestBed.createComponent(KjSelectFilter);
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(KjSelect))
      .injector.get(KjSelect);
    // "archived" is at OPTIONS[1] → key "1".
    expect(select.kjSelectValue()).toBe('1');
    const labelText = (fixture.nativeElement.querySelector('label')?.textContent ?? '').trim();
    expect(labelText).toContain('Filter by Status');
  });

  it('selecting an option writes its raw value; selecting "All" clears the filter', () => {
    const column = makeColumn({ header: 'Status' });
    TestBed.configureTestingModule({
      imports: [KjSelectFilter],
      providers: [provideCtx(column)],
    });
    const fixture = TestBed.createComponent(KjSelectFilter);
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.detectChanges();
    const select = fixture.debugElement.query(By.directive(KjSelect))
      .injector.get(KjSelect);

    select.kjSelectValue.set('0'); // "Active"
    expect(column.setFilterValue).toHaveBeenLastCalledWith({
      filterType: 'set', values: ['active'],
    });

    select.kjSelectValue.set('__kj_filter_all__');
    expect(column.setFilterValue).toHaveBeenLastCalledWith(undefined);
  });
});
