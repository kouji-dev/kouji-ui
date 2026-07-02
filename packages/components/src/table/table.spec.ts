import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { render } from '@testing-library/angular';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { KjTableComponent } from './table';
import { KJ_TABLE_STORAGE, inMemoryAdapter, kjColumn, type KjStorageAdapter } from '@kouji-ui/core';

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
  template: ` <kj-table [kjData]="data" [kjColumns]="cols" kjStorageKey="kj.test.dt" />`,
})
class StorageHost {
  protected readonly data: User[] = [{ id: '1', name: 'A', email: 'a@x' }];
  protected readonly cols = [kjColumn<User>({ accessorKey: 'name', header: 'Name' })];
}

describe('KjTableComponent — kjStorageKey', () => {
  it('persists state to the injected KJ_TABLE_STORAGE adapter', async () => {
    const adapter: KjStorageAdapter = inMemoryAdapter();
    const writeSpy = vi.spyOn(adapter, 'write');
    const { fixture } = await render(StorageHost, {
      providers: [{ provide: KJ_TABLE_STORAGE, useValue: adapter }],
    });
    const dataTable = fixture.debugElement.children[0].componentInstance as KjTableComponent<User>;
    dataTable.tableRef().setState({ globalFilter: 'foo' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(writeSpy).toHaveBeenCalled();
    const lastCall = writeSpy.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe('kj.test.dt');
    expect((lastCall[1] as { globalFilter: string }).globalFilter).toBe('foo');
  });
});
