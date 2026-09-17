import { Component, signal, ChangeDetectionStrategy, type Provider, type Type } from '@angular/core';
import { By } from '@angular/platform-browser';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { KjTableComponent } from './table';
import {
  KJ_TABLE_STORAGE,
  inMemoryAdapter,
  kjColumn,
  provideKjTableStorageKeyPrefix,
  type KjStorageAdapter,
  type KjTableState,
} from '@kouji-ui/core';

/** Type a key on whatever currently has focus, the way a user would. */
function press(key: string, init: KeyboardEventInit = {}): void {
  document.activeElement!.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
  );
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

expect.extend(toHaveNoViolations);

// jsdom shims for the virtualizer (used by table when virtualization is on).
class StubResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', StubResizeObserver);
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(): number {
      return 400;
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(): number {
      return 200;
    },
  });
});

interface User {
  id: string;
  name: string;
  email: string;
}

@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-table [kjData]="data()" [kjColumns]="cols" />`,
})
class Host {
  protected readonly data = signal<User[]>([{ id: '1', name: 'A', email: 'a@x' }]);
  protected readonly cols = [
    kjColumn<User>({ accessorKey: 'name', header: 'Name' }),
    kjColumn<User>({ accessorKey: 'email', header: 'Email' }),
  ];
}

describe('KjTableComponent', () => {
  it('renders the data + columns', async () => {
    const { getByText } = await render(Host);
    expect(getByText('A')).toBeInTheDocument();
    expect(getByText('a@x')).toBeInTheDocument();
    expect(getByText('Name')).toBeInTheDocument();
  });

  it('host carries role="grid"', async () => {
    const { container } = await render(Host);
    expect(container.querySelector('[role="grid"]')).toBeTruthy();
  });

  it('default playground is axe-clean', async () => {
    const { container } = await render(Host);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ── Empty slot ─────────────────────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: ` <kj-table [kjData]="data" [kjColumns]="cols">
    <div kjEmpty>No data</div>
  </kj-table>`,
})
class EmptyHost {
  protected readonly data: User[] = [];
  protected readonly cols = [kjColumn<User>({ accessorKey: 'name', header: 'Name' })];
}

describe('KjTableComponent — slots', () => {
  it('renders the empty slot when data is empty', async () => {
    const { getByText } = await render(EmptyHost);
    expect(getByText('No data')).toBeInTheDocument();
  });
});

// ── Filter row ─────────────────────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-table [kjData]="data" [kjColumns]="cols" [kjEnableFilters]="true" />`,
})
class FilterRowHost {
  protected readonly data: User[] = [{ id: '1', name: 'A', email: 'a@x' }];
  protected readonly cols = [
    kjColumn<User>({ accessorKey: 'name', header: 'Name', kjType: 'text', kjFilterable: true }),
    kjColumn<User>({ accessorKey: 'email', header: 'Email', kjType: 'text', kjFilterable: true }),
  ];
}

describe('KjTableComponent — filter row', () => {
  it('renders a second header row with filter cells when kjEnableFilters=true', async () => {
    const { container } = await render(FilterRowHost);
    const filterRow = container.querySelector('.kj-table-filter-row');
    expect(filterRow).toBeTruthy();
    const anchors = container.querySelectorAll('.kj-table-filter-anchor');
    expect(anchors.length).toBeGreaterThan(0);
  });
});

// ── getRowId ────────────────────────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: ` <kj-table [kjData]="data" [kjColumns]="cols" [kjGetRowId]="rowId" />`,
})
class GetRowIdHost {
  protected readonly data: User[] = [
    { id: 'user-1', name: 'Alice', email: 'a@x' },
    { id: 'user-2', name: 'Bob', email: 'b@x' },
  ];
  protected readonly cols = [kjColumn<User>({ accessorKey: 'name', header: 'Name' })];
  protected readonly rowId = (r: User): string => r.id;
}

describe('KjTableComponent — kjGetRowId', () => {
  it('keys row selection by the user-supplied id', async () => {
    const { fixture } = await render(GetRowIdHost);
    const dataTable = fixture.debugElement.children[0].componentInstance as KjTableComponent<User>;
    const tbl = dataTable.tableRef();
    tbl.setState({ rowSelection: { 'user-1': true } });
    fixture.detectChanges();
    const row = tbl.table().getRow('user-1');
    expect(row.getIsSelected()).toBe(true);
    expect(tbl.table().getRow('user-2').getIsSelected()).toBe(false);
  });
});

// ── kjStorageKey persistence ───────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: ` <kj-table [kjData]="data" [kjColumns]="cols" kjStorageKey="kj.test.dt" [kjPersistDebounce]="0" />`,
})
class StorageHost {
  protected readonly data: User[] = [{ id: '1', name: 'A', email: 'a@x' }];
  protected readonly cols = [kjColumn<User>({ accessorKey: 'name', header: 'Name' })];
}

@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: ` <kj-table [kjData]="data" [kjColumns]="cols" kjStorageKey="kj.test.dt" [kjPersistDebounce]="20" />`,
})
class DebouncedStorageHost {
  protected readonly data: User[] = [{ id: '1', name: 'A', email: 'a@x' }];
  protected readonly cols = [kjColumn<User>({ accessorKey: 'name', header: 'Name' })];
}

describe('KjTableComponent — kjStorageKey', () => {
  async function mount<T>(host: Type<T>, providers: Provider[] = []) {
    const adapter: KjStorageAdapter = inMemoryAdapter();
    const writeSpy = vi.spyOn(adapter, 'write');
    const { fixture } = await render(host, {
      providers: [{ provide: KJ_TABLE_STORAGE, useValue: adapter }, ...providers],
    });
    const dataTable = fixture.debugElement.children[0].componentInstance as KjTableComponent<User>;
    return { fixture, adapter, writeSpy, dataTable };
  }

  it('persists view configuration to the injected KJ_TABLE_STORAGE adapter', async () => {
    const { fixture, writeSpy, dataTable } = await mount(StorageHost);
    dataTable.tableRef().setState({ sorting: [{ id: 'name', desc: true }] });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(writeSpy).toHaveBeenCalled();
    const lastCall = writeSpy.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe('kj.test.dt');
    expect((lastCall[1] as Partial<KjTableState>).sorting).toEqual([{ id: 'name', desc: true }]);
  });

  it('never writes row selection, expansion or the global filter, and a selection change triggers no write', async () => {
    const { fixture, writeSpy, dataTable } = await mount(StorageHost);
    await fixture.whenStable();
    const before = writeSpy.mock.calls.length;
    dataTable.tableRef().setState({ rowSelection: { '0': true }, expanded: { '0': true }, globalFilter: 'foo' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(writeSpy.mock.calls.length).toBe(before);
    const lastWritten = writeSpy.mock.calls.at(-1)![1] as Partial<KjTableState>;
    expect(lastWritten).not.toHaveProperty('rowSelection');
    expect(lastWritten).not.toHaveProperty('expanded');
    expect(lastWritten).not.toHaveProperty('globalFilter');
  });

  it('restores only the persisted slices from a stored blob', async () => {
    const adapter: KjStorageAdapter = inMemoryAdapter();
    adapter.write('kj.test.dt', { sorting: [{ id: 'name', desc: false }], rowSelection: { '0': true } });
    const { fixture } = await render(StorageHost, {
      providers: [{ provide: KJ_TABLE_STORAGE, useValue: adapter }],
    });
    const dataTable = fixture.debugElement.children[0].componentInstance as KjTableComponent<User>;
    expect(dataTable.tableRef().state.sorting()).toEqual([{ id: 'name', desc: false }]);
    expect(dataTable.tableRef().state.rowSelection()).toEqual({});
  });

  it('debounces writes and flushes a pending write on destroy', async () => {
    const { fixture, writeSpy, dataTable } = await mount(DebouncedStorageHost);
    await wait(40);
    const before = writeSpy.mock.calls.length;
    dataTable.tableRef().setState({ density: 'compact' });
    fixture.detectChanges();
    expect(writeSpy.mock.calls.length).toBe(before);
    dataTable.tableRef().setState({ density: 'comfortable' });
    fixture.detectChanges();
    await wait(40);
    expect(writeSpy.mock.calls.length).toBe(before + 1);
    expect((writeSpy.mock.calls.at(-1)![1] as Partial<KjTableState>).density).toBe('comfortable');
    dataTable.tableRef().setState({ density: 'compact' });
    fixture.detectChanges();
    fixture.destroy();
    expect((writeSpy.mock.calls.at(-1)![1] as Partial<KjTableState>).density).toBe('compact');
  });

  it('namespaces the key with KJ_TABLE_STORAGE_KEY_PREFIX', async () => {
    const { fixture, writeSpy, adapter } = await mount(StorageHost, [provideKjTableStorageKeyPrefix('billing:')]);
    await fixture.whenStable();
    expect(writeSpy.mock.calls.at(-1)![0]).toBe('billing:kj.test.dt');
    expect(adapter.read('kj.test.dt')).toBeNull();
  });
});

// ── Roving tabindex + keyboard ─────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-table [kjData]="data" [kjColumns]="cols" [kjGetRowId]="rowId" />`,
})
class GridHost {
  protected readonly data: User[] = [
    { id: 'u1', name: 'Alice', email: 'a@x' },
    { id: 'u2', name: 'Bob', email: 'b@x' },
  ];
  protected readonly cols = [
    kjColumn<User>({ accessorKey: 'name', header: 'Name', kjEditable: true, kjType: 'text' }),
    kjColumn<User>({ accessorKey: 'email', header: 'Email', enableSorting: false }),
  ];
  protected readonly rowId = (r: User): string => r.id;
}

describe('KjTableComponent — grid keyboard', () => {
  it('the body has exactly one Tab stop, on the first cell, and it follows arrow navigation', async () => {
    const { container, fixture } = await render(GridHost);
    const cells = Array.from(container.querySelectorAll<HTMLElement>('tbody td[role="gridcell"]'));
    expect(cells.length).toBe(4);
    expect(cells.filter((c) => c.getAttribute('tabindex') === '0')).toEqual([cells[0]]);
    expect(cells.slice(1).every((c) => c.getAttribute('tabindex') === '-1')).toBe(true);
    cells[0].focus();
    press('ArrowDown');
    expect(document.activeElement).toBe(cells[2]);
    fixture.detectChanges();
    expect(cells.filter((c) => c.getAttribute('tabindex') === '0')).toEqual([cells[2]]);
  });

  it('Enter on a focused editable cell opens the editor; Escape closes it', async () => {
    const { container, fixture } = await render(GridHost);
    const first = container.querySelector<HTMLElement>('tbody td[role="gridcell"]')!;
    first.focus();
    press('Enter');
    fixture.detectChanges();
    expect(first.classList.contains('kj-table-cell--editing')).toBe(true);
    const input = first.querySelector('input');
    expect(input).toBeTruthy();
    input!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(first.classList.contains('kj-table-cell--editing')).toBe(false);
  });

  it('sortable headers are real buttons inside the <th>; the <th> keeps aria-sort and is not a Tab stop', async () => {
    const { container, fixture } = await render(GridHost);
    const [nameTh, emailTh] = Array.from(container.querySelectorAll<HTMLElement>('thead th'));
    const button = nameTh.querySelector<HTMLButtonElement>('button[kjTableSort]');
    expect(button).toBeTruthy();
    expect(button!.textContent?.trim()).toBe('Name');
    expect(nameTh.hasAttribute('tabindex')).toBe(false);
    expect(emailTh.querySelector('button')).toBeNull();
    expect(emailTh.hasAttribute('aria-sort')).toBe(false);
    button!.focus();
    expect(document.activeElement).toBe(button);
    button!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(nameTh.getAttribute('aria-sort')).toBe('ascending');
  });
});

// ── Keyboard column resize ─────────────────────────────────────────────────
@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-table [kjData]="data" [kjColumns]="cols" [kjEnableResize]="true" />`,
})
class ResizeHost {
  protected readonly data: User[] = [{ id: '1', name: 'A', email: 'a@x' }];
  protected readonly cols = [
    kjColumn<User>({ accessorKey: 'name', header: 'Name', size: 150, minSize: 50, maxSize: 400, enableResizing: true }),
    kjColumn<User>({ accessorKey: 'email', header: 'Email', size: 200, enableResizing: true }),
  ];
}

describe('KjTableComponent — keyboard column resize', () => {
  function handleOf(container: Element, index: number): HTMLElement {
    return container.querySelectorAll<HTMLElement>('.kj-table-resize-handle')[index]!;
  }

  it('the handle is a focusable separator describing the column width', async () => {
    const { container } = await render(ResizeHost);
    const handle = handleOf(container, 0);
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('tabindex')).toBe('0');
    expect(handle.getAttribute('aria-orientation')).toBe('vertical');
    expect(handle.getAttribute('aria-label')).toBe('Resize column Name');
    expect(handle.getAttribute('aria-valuenow')).toBe('150');
    expect(handle.getAttribute('aria-valuemin')).toBe('50');
    expect(handle.getAttribute('aria-valuemax')).toBe('400');
    expect(handle.getAttribute('aria-valuetext')).toBe('150 pixels');
    const unbounded = handleOf(container, 1);
    expect(unbounded.getAttribute('aria-valuemin')).toBe('20');
    expect(unbounded.getAttribute('aria-valuemax')).toBe('1000');
  });

  it('ArrowRight / ArrowLeft step the width, Shift steps more, Home / End clamp to min / max, Escape reverts', async () => {
    const { container, fixture } = await render(ResizeHost);
    const handle = handleOf(container, 0);
    const now = (): string | null => handle.getAttribute('aria-valuenow');
    handle.focus();
    expect(document.activeElement).toBe(handle);
    press('ArrowRight');
    fixture.detectChanges();
    expect(now()).toBe('160');
    press('ArrowRight', { shiftKey: true });
    fixture.detectChanges();
    expect(now()).toBe('210');
    press('ArrowLeft');
    fixture.detectChanges();
    expect(now()).toBe('200');
    press('End');
    fixture.detectChanges();
    expect(now()).toBe('400');
    press('Home');
    fixture.detectChanges();
    expect(now()).toBe('50');
    press('Escape');
    fixture.detectChanges();
    expect(now()).toBe('150');
  });

  it('a keyboard resize is reflected on the header and body cells', async () => {
    const { container, fixture } = await render(ResizeHost);
    const handle = handleOf(container, 0);
    handle.focus();
    press('ArrowRight', { shiftKey: true });
    fixture.detectChanges();
    const th = container.querySelector<HTMLElement>('thead th')!;
    const td = container.querySelector<HTMLElement>('tbody td[role="gridcell"]')!;
    expect(th.style.width).toBe('200px');
    expect(td.style.width).toBe('200px');
  });
});

// ── Bare-attribute boolean inputs (arch F-2) ───────────────────────────────
// `<kj-table kjEnableFilters>` binds the empty string. Without
// `transform: booleanAttribute` that is falsy, so the attribute form the
// library teaches everywhere else silently did nothing here.
@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-table
      [kjData]="data"
      [kjColumns]="cols"
      kjEnableFilters
      kjEnableResize
      kjLoading
      kjVirtual
    />
  `,
})
class BareAttrHost {
  protected readonly data: User[] = [{ id: '1', name: 'A', email: 'a@x' }];
  protected readonly cols = [
    kjColumn<User>({ accessorKey: 'name', header: 'Name', kjFilterable: true, kjType: 'text' }),
    kjColumn<User>({ accessorKey: 'email', header: 'Email' }),
  ];
}

// The other half of the contract: the *string* `"false"` must read as false.
@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <kj-table
      [kjData]="data"
      [kjColumns]="cols"
      kjSelectionMode="multi"
      kjShowSelectionColumn="false"
      kjVirtual="auto"
    />
  `,
})
class StringFalseHost {
  protected readonly data: User[] = [{ id: '1', name: 'A', email: 'a@x' }];
  protected readonly cols = [kjColumn<User>({ accessorKey: 'name', header: 'Name' })];
}

describe('KjTableComponent — bare boolean attributes', () => {
  it('kjEnableFilters as a bare attribute renders the filter row', async () => {
    const { container } = await render(BareAttrHost);
    expect(container.querySelector('.kj-table-filter-row')).toBeTruthy();
  });

  it('kjEnableResize as a bare attribute sizes the header cells', async () => {
    const { container } = await render(BareAttrHost);
    const th = container.querySelector<HTMLElement>('thead th')!;
    expect(th.style.width).not.toBe('');
  });

  it('kjLoading as a bare attribute shows the loading state', async () => {
    const { container } = await render(BareAttrHost);
    expect(container.querySelector('.kj-table-loading')).toBeTruthy();
  });

  it('kjVirtual as a bare attribute windows the body', async () => {
    const { container } = await render(BareAttrHost);
    expect(container.querySelector('tbody tr[data-index]')).toBeTruthy();
  });

  it('kjVirtual="auto" leaves a small table unwindowed', async () => {
    const { container } = await render(StringFalseHost);
    expect(container.querySelector('tbody tr[data-index]')).toBeNull();
  });

  it('kjShowSelectionColumn="false" really hides the selection column', async () => {
    const { container } = await render(StringFalseHost);
    expect(container.querySelector('.kj-table-select-cell')).toBeNull();
  });
});

// \u2500\u2500 Status announcements \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@Component({
  standalone: true,
  imports: [KjTableComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<kj-table
    [kjData]="data"
    [kjColumns]="cols"
    [kjEnableFilters]="true"
    [kjAnnounceChanges]="announce()"
  />`,
})
class AnnounceHost {
  readonly announce = signal(true);
  protected readonly data: User[] = [
    { id: '1', name: 'Ada', email: 'ada@x' },
    { id: '2', name: 'Bob', email: 'bob@x' },
    { id: '3', name: 'Cy', email: 'cy@x' },
  ];
  protected readonly cols = [
    kjColumn<User>({ accessorKey: 'name', header: 'Name', kjType: 'text', kjFilterable: true }),
    kjColumn<User>({ accessorKey: 'email', header: 'Email', kjType: 'text', kjFilterable: true }),
  ];
}

describe('KjTableComponent \u2014 status announcements (SC 4.1.3)', () => {
  const status = (container: Element): HTMLElement =>
    container.querySelector('[role="status"][aria-live="polite"]') as HTMLElement;

  it('is silent until something changes', async () => {
    const { container } = await render(AnnounceHost);
    expect(status(container).textContent?.trim()).toBe('');
  });

  it('announces the column and the direction when a header is sorted', async () => {
    const { container, fixture } = await render(AnnounceHost);
    const sortButton = container.querySelector<HTMLButtonElement>('button.kj-table-sort-button')!;

    sortButton.click();
    fixture.detectChanges();
    expect(status(container).textContent).toContain('Sorted by Name, ascending');

    sortButton.click();
    fixture.detectChanges();
    expect(status(container).textContent).toContain('Sorted by Name, descending');
  });

  it('names the column when sorting is cleared, instead of going silent', async () => {
    const { container, fixture } = await render(AnnounceHost);
    const table = fixture.debugElement.query(By.directive(KjTableComponent))
      .componentInstance as KjTableComponent<User>;

    table.tableRef().setState({ sorting: [{ id: 'name', desc: false }] });
    fixture.detectChanges();
    expect(status(container).textContent).toContain('Sorted by Name, ascending');

    // Header clicks cycle asc -> desc -> asc; clearing comes from the toolbar
    // reset / the grid API, and is the case a bare "" region would swallow.
    table.tableRef().setState({ sorting: [] });
    fixture.detectChanges();
    expect(status(container).textContent).toContain('Sorting cleared for Name');
  });

  it('announces how many rows survived a filter', async () => {
    const { container, fixture } = await render(AnnounceHost);
    const table = fixture.debugElement.query(By.directive(KjTableComponent))
      .componentInstance as KjTableComponent<User>;

    table.tableRef().setState({ columnFilters: [{ id: 'name', value: 'A' }] });
    fixture.detectChanges();
    expect(status(container).textContent).toContain('1 of 3 rows match the filters');

    table.tableRef().setState({ columnFilters: [{ id: 'name', value: 'zzz' }] });
    fixture.detectChanges();
    expect(status(container).textContent).toContain('No rows match the filters');
  });

  it('kjAnnounceChanges="false" keeps the region empty', async () => {
    const { container, fixture } = await render(AnnounceHost);
    fixture.componentInstance.announce.set(false);
    fixture.detectChanges();

    container.querySelector<HTMLButtonElement>('button.kj-table-sort-button')!.click();
    fixture.detectChanges();

    expect(status(container).textContent?.trim()).toBe('');
  });

  it('the announcement strings are overridable for i18n', async () => {
    @Component({
      standalone: true,
      imports: [KjTableComponent],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<kj-table
        [kjData]="data"
        [kjColumns]="cols"
        [kjSortAnnouncement]="fr"
      />`,
    })
    class FrenchHost {
      protected readonly data: User[] = [{ id: '1', name: 'Ada', email: 'ada@x' }];
      protected readonly cols = [kjColumn<User>({ accessorKey: 'name', header: 'Nom' })];
      protected readonly fr = (column: string, direction: 'ascending' | 'descending' | null) =>
        direction === 'ascending' ? `Tri\u00e9 par ${column}, croissant` : `Tri sur ${column}`;
    }

    const { container, fixture } = await render(FrenchHost);
    container.querySelector<HTMLButtonElement>('button.kj-table-sort-button')!.click();
    fixture.detectChanges();

    expect(status(container).textContent).toContain('Tri\u00e9 par Nom, croissant');
  });

  it('the region is visually hidden but in the accessibility tree', async () => {
    const { container } = await render(AnnounceHost);
    const el = status(container);
    expect(el.style.position).toBe('absolute');
    expect(el.getAttribute('aria-hidden')).toBeNull();
  });
});
